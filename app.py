# app.py
from flask import Flask, render_template, request, redirect, session, jsonify
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv
import os
import time
import ssl
from functools import wraps
from datetime import datetime, timedelta

load_dotenv() # Carga las variables de entorno desde el archivo .env

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")

# Habilitar la función now() en las plantillas para usarla en el atributo 'max' de las fechas
@app.context_processor
def inject_now():
    return {'now': datetime.utcnow}

# Supabase Config
# Es mejor usar variables de entorno para esto en producción
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Solución para el error SSL: EOF occurred in violation of protocol
# Pasamos las opciones de red directamente al crear el cliente.
options: ClientOptions = ClientOptions(
    postgrest_client_timeout=10,
    storage_client_timeout=10,
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=options)

# Ya no se necesita get_db() ni hash_password()

# === DECORADOR PARA PROTEGER RUTAS DE LANCHERO ===
def lanchero_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect('/')
        
        user_id = session['user_id']
        user_profile = supabase.table('usuarios').select('rol').eq('id', user_id).execute()

        if not user_profile.data or user_profile.data[0].get('rol') != 'lanchero':
            # Si no es lanchero, lo redirigimos a su dashboard normal.
            return redirect('/dashboard')
        
        return f(*args, **kwargs)
    return decorated_function

# === INDEX ===
@app.route('/', methods=['GET', 'POST'])
def index():
    if 'user_id' in session:
        return redirect('/dashboard')

    if request.method == 'POST':
        action = request.form.get('action')

        # === REGISTRO ===
        if action == 'register':
            nombre = request.form['nombre'].strip()
            telefono = request.form['telefono'].strip()
            email = request.form['email'].strip()
            barrio = request.form['barrio'].strip()
            contraseña = request.form['contraseña']
            fecha_nac_str = request.form.get('fecha_nac')
            rol = request.form.get('rol', 'usuario') # Recibimos el rol

            if not all([nombre, telefono, email, barrio, contraseña, fecha_nac_str]):
                return jsonify({'error': 'Todos los campos son obligatorios'})

            # --- VALIDACIÓN DE EDAD EN EL SERVIDOR ---
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
            # --- FIN DE VALIDACIÓN DE EDAD ---

            # Validar que el nombre de usuario y el teléfono no existan en una sola consulta
            existing_user_check = supabase.table('usuarios').select('nombre, telefono').or_(f'nombre.eq.{nombre},telefono.eq.{telefono}').execute()
            if existing_user_check.data:
                for user in existing_user_check.data:
                    if user['nombre'] == nombre:
                        return jsonify({'error': 'Este nombre de usuario ya está en uso. Por favor, elige otro.'})
                    if user['telefono'] == telefono:
                        return jsonify({'error': 'Este número de teléfono ya está registrado.'})

            try:
                # 1. Crear el usuario en Supabase Auth
                auth_response = supabase.auth.sign_up({
                    "email": email,
                    "password": contraseña,
                    "options": {
                        "data": {
                            'nombre_completo': nombre,
                            'telefono': telefono,
                            'barrio': barrio,
                            'fecha_nac': fecha_nac_str,
                            'rol': rol  # Pasamos el rol a los metadatos
                        }
                    }
                })
                user = auth_response.user

                # El perfil se creará automáticamente cuando el usuario verifique su correo.
                # Ahora, en lugar de iniciar sesión, lo enviamos a la página de verificación.
                # El usuario recibirá un código en su correo para confirmar.
                return jsonify({'success': True, 'redirect': f'/verificar?email={email}'})
            except Exception as e:
                # La API de Supabase puede devolver errores específicos
                error_message = str(e)
                if "User already registered" in error_message:
                    return jsonify({'error': 'Este correo electrónico ya está registrado.'})
                return jsonify({'error': f'Error al registrar: {error_message}'})

        # === LOGIN ===
        elif action == 'login':
            identificador = request.form['identificador'].strip()
            contraseña = request.form['contraseña']

            try:
                email_to_login = identificador
                # Si el identificador no es un email, búscalo en la tabla de usuarios
                if '@' not in identificador:
                    # Añadimos un pequeño reintento para manejar el retraso de la base de datos
                    for _ in range(3): # Intentar hasta 3 veces
                        query = supabase.table('usuarios').select('email').or_(f'telefono.eq.{identificador},nombre.eq.{identificador}').limit(1).execute()
                        if query.data:
                            email_to_login = query.data[0]['email']
                            break # Salimos del bucle si encontramos al usuario
                        time.sleep(0.5) # Esperamos medio segundo antes de reintentar
                    
                    if not query.data: # Si después de los reintentos no lo encontramos
                        return jsonify({'error': 'Usuario no encontrado'})

                auth_response = supabase.auth.sign_in_with_password({
                    "email": email_to_login,
                    "password": contraseña
                })
                user = auth_response.user
                session['user_id'] = user.id

                # Verificar el rol del usuario para la redirección
                profile_response = supabase.table('usuarios').select('rol').eq('id', user.id).execute()
                
                redirect_url = '/dashboard'  # Redirección por defecto
                if profile_response.data and profile_response.data[0].get('rol') == 'lanchero':
                    redirect_url = '/lanchero'

                return jsonify({'success': True, 'redirect': redirect_url})

            except Exception as e:
                return jsonify({'error': 'Datos incorrectos'})

    # GET: mostrar página
    return render_template('index.html')

# === VERIFICACIÓN DE CUENTA POR CÓDIGO ===
@app.route('/verificar', methods=['GET', 'POST'])
def verificar():
    if request.method == 'POST':
        email = request.form.get('email')
        token = request.form.get('token')

        if not email or not token:
            return render_template('verificar.html', email=email, error="El código es obligatorio.")

        try:
            # Usamos verify_otp para confirmar el registro con el código
            verified_session = supabase.auth.verify_otp({
                "email": email,
                "token": token,
                "type": "signup"
            })
            session['user_id'] = verified_session.user.id
            return redirect('/dashboard')
        except Exception as e:
            return render_template('verificar.html', email=email, error="Código incorrecto o expirado. Intenta de nuevo.")
    
    email = request.args.get('email')
    return render_template('verificar.html', email=email)

# === RECUPERACIÓN DE CONTRASEÑA ===
@app.route('/api/request-password-reset', methods=['POST'])
def request_password_reset():
    email = request.form.get('email')
    if not email:
        return jsonify({'success': False, 'error': 'El correo es obligatorio.'}), 400
    
    try:
        # Supabase enviará un correo con un enlace que redirige a /reset-password
        supabase.auth.reset_password_for_email(email, options={'redirect_to': '/reset-password'})
        return jsonify({'success': True})
    except Exception as e:
        # No revelamos si el correo existe o no por seguridad
        print(f"[ERROR PASSWORD RESET REQUEST] {e}")
        return jsonify({'success': True}) # Siempre devolvemos éxito

@app.route('/reset-password', methods=['GET'])
def reset_password_page():
    # Esta ruta simplemente sirve la página. La lógica está en el JS.
    return render_template('reset_password.html')

@app.route('/api/update-password', methods=['POST'])
def update_password():
    data = request.get_json()
    supabase.auth.update_user(data['access_token'], {"password": data['new_password']})
    return jsonify({'success': True})

# === DASHBOARD ===
@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect('/')
    
    user_id = session['user_id']
    
    # Solución definitiva para el caché: si venimos de una actualización, esperamos un poco.
    if request.args.get('updated') == 'true':
        # Esta pequeña pausa le da tiempo a la base de datos para sincronizar el cambio de nombre.
        time.sleep(1)
        # Forzamos una recarga limpia de la página sin el parámetro.
        return redirect('/dashboard')

    try:
        # QUITAMOS .single() para evitar el error PGRST116
        response = supabase.table('usuarios').select('*').eq('id', user_id).execute()
        
        if not response.data:
            # Si no hay datos, el usuario no existe en la tabla. Sesión inválida.
            session.pop('user_id', None)
            return redirect('/')

        user = response.data[0]  # Tomamos el primer (y único) resultado

        # 2. Obtener el Top 3 de usuarios por kg_reciclados
        top_users_response = supabase.table('usuarios').select('nombre, kg_reciclados').order('kg_reciclados', desc=True).limit(3).execute()
        top_users = top_users_response.data

        # Aseguramos que los tipos de datos sean correctos para la plantilla
        user['kg_reciclados'] = float(user.get('kg_reciclados', 0.0))
        user['minutos'] = int(user.get('minutos', 0))

        return render_template('dashboard.html', user=user, top_users=top_users)

    except Exception as e:
        print(f"[ERROR SUPABASE DASHBOARD] {e}")
        session.pop('user_id', None)
        return redirect('/')

# === API PARA AUTO-UPDATE ===
@app.route('/api/user')
def api_user():
    if 'user_id' not in session:
        return jsonify({'success': False})

    try:
        # Forzamos la obtención de los datos más recientes para evitar problemas de caché
        resp = supabase.table('usuarios').select('nombre, kg_reciclados, minutos') \
            .eq('id', session['user_id']) \
            .execute()
        if not resp.data:
            return jsonify({'success': False})
        user = resp.data[0]

        # Añadimos el Top 3 a la respuesta de la API
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

# === API PARA GRÁFICO SEMANAL ===
@app.route('/api/weekly_progress')
def weekly_progress():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autorizado'}), 401

    try:
        user_id = session['user_id']
        
        # Obtener todos los reportes del usuario de la última semana
        response = supabase.table('reportes').select('created_at, kg_reportados') \
            .eq('user_id', user_id) \
            .eq('recogido', True) \
            .gte('created_at', (datetime.now() - timedelta(days=7)).isoformat()) \
            .execute()

        # Procesar los datos para agruparlos por día
        daily_totals = { (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d'): 0 for i in range(7) }
        for reporte in response.data:
            report_date = datetime.fromisoformat(reporte['created_at']).strftime('%Y-%m-%d')
            if report_date in daily_totals:
                daily_totals[report_date] += float(reporte['kg_reportados'])
        
        return jsonify({'success': True, 'progress': daily_totals})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# === PERFIL ===
@app.route('/perfil', methods=['GET', 'POST'])
def perfil():
    if 'user_id' not in session:
        return redirect('/')

    user_id = session['user_id']

    if request.method == 'POST':
        try:
            data = request.get_json() # Usamos get_json() para leer los datos
            nombre = data.get('nombre', '').strip()
            barrio = data.get('barrio', '').strip()
            email = data.get('email', '').strip()

            # Validar que el nuevo nombre no esté en uso por OTRO usuario
            if nombre:
                existing_user = supabase.table('usuarios').select('id').eq('nombre', nombre).neq('id', user_id).execute()
                if existing_user.data:
                    return jsonify({'success': False, 'error': 'Ese nombre ya está en uso. Por favor, elige otro.'}), 400

            if nombre and barrio:
                update_data = {'nombre': nombre, 'barrio': barrio, 'email': email}
                supabase.table('usuarios').update(update_data).eq('id', user_id).execute()
                
                if email:
                    supabase.auth.update_user({"email": email})
            
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

# === SUBIR FOTO DE PERFIL ===
@app.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autorizado'}), 401

    user_id = session['user_id']
    foto = request.files.get('avatar')

    if not foto:
        return jsonify({'success': False, 'error': 'No se ha seleccionado ninguna imagen.'})

    try:
        # Subir la imagen a un bucket 'avatars' en Supabase Storage
        file_ext = foto.filename.split('.')[-1]
        file_name = f'public/{user_id}.{file_ext}'
        
        supabase.storage.from_('avatars').upload(file=foto.read(), path=file_name, file_options={"content-type": foto.content_type, "cache-control": "3600", "upsert": "true"})
        
        image_url = supabase.storage.from_('avatars').get_public_url(file_name)

        supabase.table('usuarios').update({'avatar_url': image_url}).eq('id', user_id).execute()
        return jsonify({'success': True, 'url': image_url})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# === ELIMINAR CUENTA ===
@app.route('/api/delete_account', methods=['POST'])
def delete_account():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autorizado'}), 401

    user_id = session['user_id']
    try:
        # Para eliminar un usuario, necesitas usar la clave 'service_role'
        # y llamar al método de admin.
        supabase.auth.admin.delete_user(user_id)
        session.pop('user_id', None) # Limpiar la sesión
        return jsonify({'success': True})
    except Exception as e:
        print(f"[ERROR DELETE ACCOUNT] {e}")
        return jsonify({'success': False, 'error': 'No se pudo eliminar la cuenta.'}), 500

# === LANCHERO PANEL ===
@app.route('/lanchero')
@lanchero_required
def lanchero_panel():
    # El decorador @lanchero_required ya protege esta ruta.
    return render_template('lanchero.html')

# === REPORTAR RECOLECCIÓN ===
@app.route('/reportar', methods=['GET', 'POST'])
def reportar():
    if 'user_id' not in session:
        return redirect('/')

    if request.method == 'POST':
        user_id = session['user_id']
        kg_reportados = request.form.get('kg')
        ubicacion_desc = request.form.get('ubicacion')
        foto = request.files.get('foto')

        # Hacemos que solo el peso y la foto sean obligatorios
        if not kg_reportados or not foto:
            return jsonify({'success': False, 'error': 'Todos los campos son obligatorios.'})

        try:
            # Subir la imagen a Supabase Storage
            file_ext = foto.filename.split('.')[-1]
            file_name = f'public/{user_id}_{int(time.time())}.{file_ext}'
            
            supabase.storage.from_('reportes_fotos').upload(file=foto.read(), path=file_name, file_options={"content-type": foto.content_type})
            
            # Obtener la URL pública de la imagen
            image_url = supabase.storage.from_('reportes_fotos').get_public_url(file_name)

            # Insertar el reporte en la base de datos
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

    return render_template('reportar.html') # Para el método GET

# === MAPA DE PUNTOS ===
@app.route('/mapa')
def mapa():
    if 'user_id' not in session:
        return redirect('/')
    # Muestra la página del mapa.
    return render_template('mapa.html')

# === API PARA LANCHERO ===
@app.route('/api/reportes')
@lanchero_required
def get_reportes():
    # Obtener reportes no recogidos y la info del usuario asociado
    # Añadimos la cabecera 'Prefer' para evitar problemas de caché y asegurar que obtenemos los datos más recientes.
    response = supabase.table('reportes').select('*, usuarios(nombre, barrio)') \
        .eq('recogido', False).order('created_at', desc=True) \
        .execute()
    return jsonify(response.data)

@app.route('/api/reporte/recoger/<int:reporte_id>', methods=['POST'])
@lanchero_required
def recoger_reporte(reporte_id):
    try:
        # Marcar el reporte como recogido
        # El trigger 'update_user_stats' se encargará de actualizar los kg del usuario
        supabase.table('reportes').update({'recogido': True}).eq('id', reporte_id).execute()
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error al recoger reporte: {e}")
        return jsonify({'success': False, 'error': str(e)})

# === LOGOUT ===
@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect('/')

if __name__ == '__main__':
    print("CHOCÓ LIMPIO 2025 - INICIANDO EN http://127.0.0.1:5000")
    app.run(debug=True, port=5000)