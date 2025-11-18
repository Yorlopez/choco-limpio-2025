# app.py
from flask import Flask, render_template, request, redirect, session, jsonify
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv
import os
import time
import ssl
from functools import wraps
from datetime import datetime, timedelta

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")

@app.context_processor
def inject_now():
    return {'now': datetime.utcnow}

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

options: ClientOptions = ClientOptions(
    postgrest_client_timeout=10,
    storage_client_timeout=10,
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=options)

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return redirect('/')
            
            user_id = session['user_id']
            user_profile = supabase.table('usuarios').select('rol').eq('id', user_id).single().execute()

            if not user_profile.data or user_profile.data.get('rol') != required_role:
                return redirect('/dashboard')
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

lanchero_required = role_required('lanchero')
admin_required = role_required('admin')

@app.route('/', methods=['GET', 'POST'])
def index():
    if 'user_id' in session:
        return redirect('/dashboard')

    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'register':
            nombre = request.form['nombre'].strip()
            telefono = request.form['telefono'].strip()
            email = request.form['email'].strip()
            barrio = request.form['barrio'].strip()
            contraseña = request.form['contraseña']
            fecha_nac_str = request.form.get('fecha_nac')
            rol = request.form.get('rol', 'usuario')
            mensaje_lanchero = None
            foto_lancha_url = None

            if rol == 'lanchero':
                rol = 'lanchero_pendiente'
                mensaje_lanchero = request.form.get('mensaje_lanchero', '').strip()
                foto_lancha = request.files.get('foto_lancha')

                if not mensaje_lanchero or not foto_lancha:
                    return jsonify({'error': 'Para registrarte como lanchero, el mensaje y la foto de la lancha son obligatorios.'})
            
            if not all([nombre, telefono, email, barrio, contraseña, fecha_nac_str]):
                return jsonify({'error': 'Todos los campos son obligatorios'})

            try:
                fecha_nac = datetime.strptime(fecha_nac_str, '%Y-%m-%d').date()
                hoy = datetime.now().date()
                edad = hoy.year - fecha_nac.year - ((hoy.month, hoy.day) < (fecha_nac.month, fecha_nac.day))
                
                if fecha_nac > hoy:
                    return jsonify({'error': 'La fecha de nacimiento no puede ser en el futuro.'})
                if edad < 18:
                    return jsonify({'error': 'Debes ser mayor de 18 años para registrarte.'})
            except ValueError:
                return jsonify({'error': 'El formato de la fecha de nacimiento es inválido.'})

            nombre_existente = supabase.table('usuarios').select('nombre').eq('nombre', nombre).execute()
            if nombre_existente.data:
                return jsonify({'error': 'Este nombre de usuario ya está en uso. Por favor, elige otro.'}), 409
            telefono_existente = supabase.table('usuarios').select('telefono').eq('telefono', telefono).execute()
            if telefono_existente.data:
                return jsonify({'error': 'Este número de teléfono ya está registrado.'}), 409

            try:
                if rol == 'lanchero_pendiente' and request.files.get('foto_lancha'):
                    foto = request.files['foto_lancha']
                    file_ext = foto.filename.rsplit('.', 1)[-1] if '.' in foto.filename else 'jpg'
                    file_name = f'solicitud_{telefono}_{int(time.time())}.{file_ext}'
                    
                    supabase.storage.from_('lanchas_fotos').upload(
                        file=foto.read(), 
                        path=file_name, 
                        file_options={"content-type": foto.content_type, "cache-control": "3600"}
                    )
                    foto_lancha_url = supabase.storage.from_('lanchas_fotos').get_public_url(file_name)

                auth_response = supabase.auth.sign_up({
                    "email": email,
                    "password": contraseña,
                    "options": {
                        "data": {
                            'nombre': nombre,
                            'telefono': telefono,
                            'barrio': barrio,
                            'fecha_nac': fecha_nac_str,
                            'rol': rol,
                            'mensaje_lanchero': mensaje_lanchero,
                            'foto_lancha_url': foto_lancha_url
                        }
                    }
                })

                return jsonify({'success': True, 'redirect': f'/verificar?email={email}'})
            except Exception as e:
                error_msg = str(e)
                app.logger.error(f"Internal server error during registration: {error_msg}", exc_info=True)
                
                if "User already registered" in error_msg:
                    return jsonify({'error': 'Este correo electrónico ya está registrado.'}), 409
                
                return jsonify({'error': 'Ha ocurrido un error interno inesperado. Por favor, contacta a soporte.'}), 500

        elif action == 'login':
            identificador = request.form['identificador'].strip()
            contraseña = request.form['contraseña']

            try:
                email_to_login = identificador
                if '@' not in identificador:
                    query = supabase.table('usuarios').select('email').or_(f'telefono.eq.{identificador},nombre.eq.{identificador}').limit(1).execute()
                    
                    if not query.data:
                        return jsonify({'error': 'Datos incorrectos'})
                    email_to_login = query.data[0]['email']

                auth_response = supabase.auth.sign_in_with_password({
                    "email": email_to_login,
                    "password": contraseña
                })
                user = auth_response.user
                session['user_id'] = user.id

                profile_response = supabase.table('usuarios').select('rol').eq('id', user.id).single().execute()
                
                redirect_url = '/dashboard'
                if profile_response.data and profile_response.data.get('rol') == 'lanchero_pendiente':
                    return jsonify({'error': 'Tu solicitud para ser lanchero aún está en revisión. Serás notificado por correo.'})

                if profile_response.data:
                    rol = profile_response.data.get('rol')
                    if rol == 'lanchero':
                        redirect_url = '/lanchero'
                    elif rol == 'admin':
                        redirect_url = '/admin/solicitudes'

                return jsonify({'success': True, 'redirect': redirect_url})

            except Exception as e:
                return jsonify({'error': 'Datos incorrectos'})

    return render_template('index.html')

@app.route('/verificar', methods=['GET', 'POST'])
def verificar():
    if request.method == 'POST':
        email = request.form.get('email')
        token = request.form.get('token')

        if not email or not token:
            return render_template('verificar.html', email=email, error="El código es obligatorio.")

        try:
            verified_session = supabase.auth.verify_otp({
                "email": email,
                "token": token,
                "type": "signup"
            })
            
            user_id = verified_session.user.id
            session['user_id'] = user_id

            profile_response = supabase.table('usuarios').select('rol').eq('id', user_id).single().execute()

            if profile_response.data and profile_response.data.get('rol') == 'lanchero_pendiente':
                session.pop('user_id', None)
                return redirect('/?mensaje=lanchero_pendiente')

            return redirect('/dashboard')
        except Exception as e:
            return render_template('verificar.html', email=email, error="Código incorrecto o expirado. Intenta de nuevo.")
    
    email = request.args.get('email')
    return render_template('verificar.html', email=email)

@app.route('/api/request-password-reset', methods=['POST'])
def request_password_reset():
    email = request.form.get('email')
    if not email:
        return jsonify({'success': False, 'error': 'El correo es obligatorio.'}), 400
    
    try:
        supabase.auth.reset_password_for_email(email, options={'redirect_to': '/reset-password'})
        return jsonify({'success': True})
    except Exception as e:
        print(f"[ERROR PASSWORD RESET REQUEST] {e}")
        return jsonify({'success': True})

@app.route('/reset-password', methods=['GET'])
def reset_password_page():
    return render_template('reset_password.html')

@app.route('/api/update-password', methods=['POST'])
def update_password():
    data = request.get_json()
    supabase.auth.update_user(data['access_token'], {"password": data['new_password']})
    return jsonify({'success': True})

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect('/')
    
    user_id = session['user_id']
    
    if request.args.get('updated') == 'true':
        time.sleep(1)
        return redirect('/dashboard')

    try:
        # QUITAMOS .single() para evitar el error PGRST116
        response = supabase.table('usuarios').select('*').eq('id', user_id).execute()
        
        if not response.data:
            session.pop('user_id', None)
            return redirect('/')

        user = response.data[0]

        top_users_response = supabase.table('usuarios').select('nombre, kg_reciclados').order('kg_reciclados', desc=True).limit(3).execute()
        top_users = top_users_response.data

        user['kg_reciclados'] = float(user.get('kg_reciclados', 0.0))
        user['minutos'] = int(user.get('minutos', 0))

        return render_template('dashboard.html', user=user, top_users=top_users, supabase_key=SUPABASE_KEY)

    except Exception as e:
        print(f"[ERROR SUPABASE DASHBOARD] {e}")
        session.pop('user_id', None)
        return redirect('/')

@app.route('/api/user')
def api_user():
    if 'user_id' not in session:
        return jsonify({'success': False})

    try:
        resp = supabase.table('usuarios').select('nombre, kg_reciclados, minutos') \
            .eq('id', session['user_id']) \
            .execute()
        if not resp.data:
            return jsonify({'success': False})
        user = resp.data[0]

        top_users_response = supabase.table('usuarios').select('nombre, kg_reciclados').order('kg_reciclados', desc=True).limit(3).execute()
        top_users = top_users_response.data

        return jsonify({
            'success': True,
            'nombre': user['nombre'],
            'kg_reciclados': float(user['kg_reciclados']),
            'minutos': int(user['minutos']),
            'arboles': int(float(user['kg_reciclados'])),
            'co2_evitado': round(float(user['kg_reciclados']) * 2.5, 1),
            'top_users': top_users
        })
    except Exception as e:
        print(f"[ERROR API USER] {e}")
        return jsonify({'success': False})

@app.route('/api/weekly_progress')
def weekly_progress():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autorizado'}), 401

    try:
        user_id = session['user_id']
        
        response = supabase.table('reportes').select('created_at, kg_reportados') \
            .eq('user_id', user_id) \
            .eq('recogido', True) \
            .gte('created_at', (datetime.now() - timedelta(days=7)).isoformat()) \
            .execute()

        daily_totals = { (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d'): 0 for i in range(7) }
        for reporte in response.data:
            report_date = datetime.fromisoformat(reporte['created_at']).strftime('%Y-%m-%d')
            if report_date in daily_totals:
                daily_totals[report_date] += float(reporte['kg_reportados'])
        
        return jsonify({'success': True, 'progress': daily_totals})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/perfil', methods=['GET', 'POST'])
def perfil():
    if 'user_id' not in session:
        return redirect('/')

    user_id = session['user_id']

    if request.method == 'POST':
        try:
            data = request.get_json()
            nombre = data.get('nombre', '').strip()
            barrio = data.get('barrio', '').strip()
            email = data.get('email', '').strip()

            if nombre:
                existing_user = supabase.table('usuarios').select('id').eq('nombre', nombre).neq('id', user_id).execute()
                if existing_user.data:
                    return jsonify({'success': False, 'error': 'Ese nombre ya está en uso. Por favor, elige otro.'}), 400

            update_data = {}
            if nombre: update_data['nombre'] = nombre
            if barrio: update_data['barrio'] = barrio
            if email: update_data['email'] = email

            if update_data:
                supabase.table('usuarios').update(update_data).eq('id', user_id).execute()
            
            return jsonify({'success': True}) # Devolvemos una respuesta JSON
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    try:
        response = supabase.table('usuarios').select('*').eq('id', user_id).execute()
        if not response.data:
            session.pop('user_id', None)
            return redirect('/')
        user = response.data[0]
        return render_template('perfil.html', user=user)
    except Exception as e:
        print(f"[ERROR PERFIL] {e}")
        return redirect('/dashboard')

@app.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autorizado'}), 401

    user_id = session['user_id']
    foto = request.files.get('avatar')

    if not foto:
        return jsonify({'success': False, 'error': 'No se ha seleccionado ninguna imagen.'})

    try:
        file_ext = foto.filename.split('.')[-1]
        file_name = f'public/{user_id}.{file_ext}'
        
        supabase.storage.from_('avatars').upload(file=foto.read(), path=file_name, file_options={"content-type": foto.content_type, "cache-control": "3600", "upsert": "true"})
        
        image_url = supabase.storage.from_('avatars').get_public_url(file_name)

        supabase.table('usuarios').update({'avatar_url': image_url}).eq('id', user_id).execute()
        return jsonify({'success': True, 'url': image_url})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete_account', methods=['POST'])
def delete_account():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autorizado'}), 401

    user_id = session['user_id']
    try:
        user_profile = supabase.table('usuarios').select('avatar_url').eq('id', user_id).single().execute()
        if user_profile.data and user_profile.data.get('avatar_url'):
            avatar_url = user_profile.data['avatar_url']
            file_path = avatar_url.split('/avatars/')[-1]
            if file_path:
                supabase.storage.from_('avatars').remove([file_path])

        supabase.auth.admin.delete_user(user_id)
        session.clear()
        return jsonify({'success': True})
    except Exception as e:
        print(f"[ERROR DELETE ACCOUNT] {e}")
        return jsonify({'success': False, 'error': 'No se pudo eliminar la cuenta.'}), 500

@app.route('/lanchero')
@lanchero_required
def lanchero_panel():
    return render_template('lanchero.html')

@app.route('/reportar', methods=['GET', 'POST'])
def reportar():
    if 'user_id' not in session:
        return redirect('/')

    if request.method == 'POST':
        user_id = session['user_id']
        kg_reportados = request.form.get('kg')
        ubicacion_desc = request.form.get('ubicacion')
        foto = request.files.get('foto')

        if not kg_reportados or not foto:
            return jsonify({'success': False, 'error': 'Todos los campos son obligatorios.'})

        try:
            file_ext = foto.filename.split('.')[-1]
            file_name = f'public/{user_id}_{int(time.time())}.{file_ext}'
            
            supabase.storage.from_('reportes_fotos').upload(file=foto.read(), path=file_name, file_options={"content-type": foto.content_type})
            
            image_url = supabase.storage.from_('reportes_fotos').get_public_url(file_name)

            reporte_data = {
                'user_id': user_id,
                'kg_reportados': float(kg_reportados),
                'ubicacion_desc': ubicacion_desc,
                'foto_url': image_url,
                'recogido': False # Nuevo campo para saber si ya se recogió
            }
            supabase.table('reportes').insert(reporte_data).execute()

            return jsonify({'success': True})

        except Exception as e:
            print(f"Error al reportar: {e}")
            return jsonify({'success': False, 'error': str(e)})

    return render_template('reportar.html')

@app.route('/mapa')
def mapa():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('mapa.html')

@app.route('/api/reportes')
@lanchero_required
def get_reportes():
    response = supabase.postgrest.from_('reportes') \
        .select('*, usuarios(nombre, barrio)', count='exact') \
        .eq('recogido', False).order('created_at', desc=True) \
        .execute()

    return jsonify(response.data)

@app.route('/api/reporte/recoger/<int:reporte_id>', methods=['POST'])
@lanchero_required
def recoger_reporte(reporte_id):
    try:
        supabase.table('reportes').update({'recogido': True}).eq('id', reporte_id).execute()
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error al recoger reporte: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/solicitudes')
@admin_required
def admin_solicitudes():
    try:
        user_id = session['user_id']
        user_response = supabase.table('usuarios').select('*').eq('id', user_id).single().execute()
        user = user_response.data
        solicitudes_response = supabase.table('usuarios') \
            .select('*') \
            .eq('rol', 'lanchero_pendiente') \
            .execute()
        
        solicitudes = solicitudes_response.data
        return render_template('admin_solicitudes.html', solicitudes=solicitudes, user=user)
    except Exception as e:
        print(f"Error al cargar solicitudes de admin: {e}")
        return "Error al cargar la página de administrador.", 500

@app.route('/admin/solicitud/procesar', methods=['POST'])
@admin_required
def procesar_solicitud_admin():
    data = request.get_json()
    solicitud_id = data.get('solicitud_id')
    accion = data.get('accion')

    if not solicitud_id or not accion:
        return jsonify({'success': False, 'error': 'Faltan datos.'}), 400

    try:
        if accion == 'aprobar':
            supabase.table('usuarios').update({'rol': 'lanchero'}).eq('id', solicitud_id).execute()
            
            return jsonify({'success': True})
        elif accion == 'rechazar':
            supabase.auth.admin.delete_user(solicitud_id)
            
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Acción no válida.'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect('/')

@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

if __name__ == '__main__':
    print("CHOCÓ LIMPIO 2025 - INICIANDO EN http://127.0.0.1:5000")
    app.run(debug=True, port=5000)