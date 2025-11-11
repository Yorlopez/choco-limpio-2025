from flask import Flask, request, jsonify, render_template, redirect, url_for, session
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import hashlib
import re

app = Flask(__name__)
app.secret_key = 'chocolimpio2025_mosqu_co'

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'chocolimpio_db'
}

def get_db():
    try:
        return mysql.connector.connect(**db_config)
    except Error as e:
        print(f"[ERROR MySQL] {e}")
        return None

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def validar_telefono(telefono):
    return re.match(r'^3[0-9]{9}$', telefono.replace(' ', ''))

def calcular_edad(fecha_nac):
    hoy = datetime.now()
    nac = datetime.strptime(fecha_nac, '%Y-%m-%d')
    edad = hoy.year - nac.year
    if (hoy.month, hoy.day) < (nac.month, nac.day):
        edad -= 1
    return edad

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect('/')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE id = %s", (session['user_id'],))
    user = cursor.fetchone()
    conn.close()
    if user:
        user['kg_reciclados'] = float(user['kg_reciclados']) if user['kg_reciclados'] else 0.0
        user['minutos'] = int(user['minutos']) if user['minutos'] else 0
    return render_template('dashboard.html', user=user)

@app.route('/perfil')
def perfil():
    if 'user_id' not in session:
        return redirect('/')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE id = %s", (session['user_id'],))
    user = cursor.fetchone()
    conn.close()
    return render_template('perfil.html', user=user)

@app.route('/mapa')
def mapa():
    return render_template('mapa.html')

@app.route('/reportar')
def reportar():
    return render_template('reportar.html')

@app.route('/api/stats')
def api_stats():
    if 'user_id' not in session:
        return jsonify({'success': False}), 401
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT kg_reciclados, minutos FROM usuarios WHERE id = %s", (session['user_id'],))
    user = cursor.fetchone()
    conn.close()
    if user:
        return jsonify({
            'success': True,
            'kg_reciclados': float(user['kg_reciclados']),
            'minutos': int(user['minutos'])
        })
    return jsonify({'success': False})

@app.route('/registro', methods=['POST'])
def registro():
    data = request.json
    nombre = data.get('nombre', '').strip()
    telefono = data.get('telefono', '').strip().replace(' ', '')
    barrio = data.get('barrio', '').strip()
    email = data.get('email', '').strip() or None
    fecha_nac = data.get('fecha_nac')
    pregunta = data.get('pregunta')
    respuesta = data.get('respuesta', '').strip().lower()
    contraseña = data.get('contraseña', '123456')

    if not all([nombre, telefono, barrio, fecha_nac, pregunta, respuesta]):
        return jsonify({'error': 'Faltan campos'}), 400
    if not validar_telefono(telefono):
        return jsonify({'error': 'Teléfono inválido'}), 400
    edad = calcular_edad(fecha_nac)
    if edad < 13:
        return jsonify({'error': 'Edad mínima 13'}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM usuarios WHERE telefono = %s", (telefono,))
        if cursor.fetchone():
            return jsonify({'error': 'Teléfono ya registrado'}), 400
        hashed = hash_password(contraseña)
        cursor.execute("""
            INSERT INTO usuarios 
            (nombre, telefono, barrio, email, fecha_nac, edad, pregunta_seguridad, respuesta_seguridad, contraseña)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (nombre, telefono, barrio, email, fecha_nac, edad, pregunta, respuesta, hashed))
        conn.commit()
        session['user_id'] = cursor.lastrowid
        return jsonify({'success': True, 'redirect': '/dashboard'})
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    identificador = data.get('identificador', '').strip()
    contraseña = data.get('contraseña', '123456')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    query = "SELECT id, contraseña FROM usuarios WHERE telefono = %s OR LOWER(nombre) LIKE %s OR email = %s"
    cursor.execute(query, (identificador, f"%{identificador.lower()}%", identificador))
    user = cursor.fetchone()
    if user and user['contraseña'] == hash_password(contraseña):
        session['user_id'] = user['id']
        conn.close()
        return jsonify({'success': True, 'redirect': '/dashboard'})
    conn.close()
    return jsonify({'error': 'Datos incorrectos'}), 401

@app.route('/editar_perfil', methods=['POST'])
def editar_perfil():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    data = request.json
    nombre = data.get('nombre', '').strip()
    barrio = data.get('barrio', '').strip()
    email = data.get('email', '').strip() or None
    fecha_nac = data.get('fecha_nac')
    if not all([nombre, barrio, fecha_nac]):
        return jsonify({'error': 'Faltan campos'}), 400
    edad = calcular_edad(fecha_nac)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE usuarios SET nombre=%s, barrio=%s, email=%s, fecha_nac=%s, edad=%s WHERE id=%s
        """, (nombre, barrio, email, fecha_nac, edad, session['user_id']))
        conn.commit()
        return jsonify({'success': True})
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

if __name__ == '__main__':
    print("CHOCÓ LIMPIO 2025 - INICIANDO...")
    app.run(debug=True, port=5000)