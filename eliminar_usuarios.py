# c:\Users\mosqu\OneDrive\Desktop\pfe\eliminar_usuarios.py

# Importo 'datetime' para poder trabajar con fechas, como la de nacimiento.
from datetime import datetime
# Importo 'os' para poder interactuar con el sistema operativo, en este caso, para leer variables de entorno.
import os
# Importo 'load_dotenv' de la librería 'dotenv' para cargar las variables que guardé en el archivo .env.
from dotenv import load_dotenv
# Importo 'create_client' y 'Client' de la librería 'supabase' para poder conectarme y hablar con mi base de datos de Supabase.
from supabase import create_client, Client

# Con esta línea, cargo las variables de mi archivo .env para que el script pueda usarlas.
load_dotenv()

# Aquí guardo mi email de administrador. Así el script sabe cuál es mi usuario y no lo borra.
ADMIN_EMAIL = "mosqueralopezyoryani@gmail.com" 

# Obtengo la URL de mi proyecto de Supabase desde las variables de entorno que cargué antes.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
# Obtengo la llave (KEY) de Supabase, también de las variables de entorno. La necesito para autenticarme.
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Defino una función que me va a servir para crear un nuevo usuario. Le paso 'supabase' para que pueda conectarse.
def crear_usuario(supabase: Client):
    # Muestro un título para que se sepa que estamos en la parte de crear usuarios.
    print("\n--- Creación de Nuevo Usuario ---")
    # Pido el email para el nuevo usuario y le quito los espacios en blanco que pueda tener al inicio o al final.
    email = input("Email del nuevo usuario: ").strip()
    # Pido la contraseña para el nuevo usuario y también le quito los espacios.
    password = input("Contraseña para el nuevo usuario: ").strip()
    # Pido el nombre de usuario y le quito los espacios.
    nombre = input("Nombre de usuario: ").strip()
    # Pido el número de teléfono y le quito los espacios.
    telefono = input("Teléfono: ").strip()
    # Pido el barrio y le quito los espacios.
    barrio = input("Barrio: ").strip()
    # Empiezo un bucle que no se detendrá hasta que se ingrese una fecha válida.
    while True:
        # Pido la fecha de nacimiento y le quito los espacios.
        fecha_nac_str = input("Fecha de nacimiento (YYYY-MM-DD): ").strip()
        # Intento convertir el texto de la fecha a un formato de fecha real.
        try:
            # Si el formato es 'Año-Mes-Día', la conversión funciona.
            datetime.strptime(fecha_nac_str, '%Y-%m-%d')
            # Si funcionó, rompo el bucle para continuar.
            break
        # Si la conversión falla porque el formato es incorrecto...
        except ValueError:
            # ...le aviso al usuario que se equivocó y que lo intente de nuevo.
            print("Formato de fecha incorrecto. Por favor, usa YYYY-MM-DD.")
    
    # Empiezo otro bucle para asegurarme de que el rol ingresado sea válido.
    while True:
        # Pido el rol y lo convierto a minúsculas para que no importe si escriben 'Admin' o 'admin'.
        rol = input("Rol (usuario, lanchero, admin): ").strip().lower()
        # Compruebo si el rol es uno de los que permito.
        if rol in ['usuario', 'lanchero', 'admin']:
            # Si es válido, rompo el bucle.
            break
        # Si no es un rol válido...
        else:
            # ...le digo al usuario cuáles son las opciones correctas.
            print("Rol no válido. Elige entre 'usuario', 'lanchero' o 'admin'.")

    # Verifico si alguno de los campos que pedí está vacío.
    if not all([email, password, nombre, telefono, barrio, fecha_nac_str, rol]):
        # Si falta algún dato, muestro un error y detengo la creación.
        print("Error: Todos los campos son obligatorios. Operación cancelada.")
        # Salgo de la función 'crear_usuario'.
        return

    # Intento ejecutar el siguiente bloque de código, pero estoy atento a posibles errores.
    try:
        # Reviso en mi tabla 'usuarios' si ya existe alguien con ese nombre de usuario.
        nombre_existente = supabase.table('usuarios').select('nombre', count='exact').ilike('nombre', nombre).execute()
        # Si la consulta devuelve algún resultado, significa que el nombre ya está en uso.
        if nombre_existente.data:
            # Muestro un mensaje de error diciendo que el nombre ya existe.
            print(f"\nError: El nombre de usuario '{nombre}' ya está en uso. Por favor, elige otro.")
            # Salgo de la función para no continuar.
            return
        
        # Ahora reviso en la tabla 'usuarios' si el número de teléfono ya está registrado.
        telefono_existente = supabase.table('usuarios').select('telefono', count='exact').eq('telefono', telefono).execute()
        # Si la consulta encuentra ese teléfono...
        if telefono_existente.data:
            # ...le aviso al usuario que ese teléfono ya está en uso.
            print(f"\nError: El número de teléfono '{telefono}' ya está registrado.")
            # Y salgo de la función.
            return

        # Hago lo mismo para el email, verifico si ya existe en la tabla 'usuarios'.
        email_existente = supabase.table('usuarios').select('email', count='exact').eq('email', email).execute()
        # Si el email ya está en la tabla...
        if email_existente.data:
            # ...muestro un mensaje explicando que el email ya está asociado a un perfil.
            print(f"\nError: El email '{email}' ya está asociado a un perfil. Puede que el usuario exista pero no esté en el sistema de autenticación.")
            # Y salgo de la función.
            return

        # Si todas las validaciones pasaron, muestro un mensaje de que estoy creando el usuario.
        print(f"\nCreando usuario '{nombre}' con email '{email}'...")
        # Uso la función de administrador de Supabase para crear un nuevo usuario en el sistema de autenticación.
        user_response = supabase.auth.admin.create_user({
            "email": email, # Le paso el email que recogí.
            "password": password, # Le paso la contraseña.
            "email_confirm": True, # Marco el email como confirmado para que el usuario no tenga que hacerlo.
            "user_metadata": { # Aquí guardo información adicional del usuario.
                'nombre': nombre, # El nombre de usuario.
                'telefono': telefono, # El teléfono.
                'barrio': barrio, # El barrio.
                'fecha_nac': fecha_nac_str, # La fecha de nacimiento.
                'rol': rol # Y el rol que va a tener.
            }
        })
        
        # Compruebo si Supabase me devolvió una respuesta con el usuario creado.
        if user_response:
            # Si todo salió bien, muestro un mensaje de éxito.
            print("\n¡Éxito! Usuario creado correctamente.")
            # Muestro el ID único que Supabase le dio al nuevo usuario.
            print(f"  ID: {user_response.id}")
            # Muestro el email del usuario creado.
            print(f"  Email: {user_response.email}")
            # Muestro el rol que le asigné.
            print(f"  Rol: {rol}")
        # Si Supabase no devolvió nada...
        else:
            # ...significa que hubo un problema, así que muestro un error.
            print("\nError: No se pudo crear el usuario. La respuesta fue vacía.")

    # Si ocurre cualquier error durante el bloque 'try'...
    except Exception as e:
        # ...lo capturo y muestro un mensaje de error con los detalles del problema.
        print(f"\nError al crear el usuario: {e}")

# Defino una función para eliminar usuarios, pasándole la conexión a Supabase.
def eliminar_usuarios(supabase: Client):
    # Muestro un título para esta sección.
    print("\n--- Eliminación Masiva de Usuarios ---")
    # Muestro un mensaje de que estoy buscando a los usuarios.
    print("Obteniendo la lista de usuarios...")
    # Le pido a Supabase la lista completa de todos los usuarios registrados en la autenticación.
    response = supabase.auth.admin.list_users()
    
    # Guardo la lista de usuarios en una variable para que sea más fácil de usar.
    all_users = response
    # Informo cuántos usuarios encontré en total.
    print(f"Se encontraron {len(all_users)} usuarios en total.")

    # Creo una nueva lista, pero esta vez filtro y dejo fuera a mi usuario administrador.
    usuarios_a_eliminar = [user for user in all_users if user.email != ADMIN_EMAIL]

    # Si la lista de usuarios a eliminar está vacía...
    if not usuarios_a_eliminar:
        # ...informo que no hay nadie a quien borrar (además de mí).
        print("No hay usuarios para eliminar (aparte del administrador).")
        # Salgo de la función porque no hay nada más que hacer.
        return

    # Informo cuántos usuarios se van a borrar y recuerdo que mi cuenta de admin no se tocará.
    print(f"Se van a eliminar {len(usuarios_a_eliminar)} usuarios. El administrador '{ADMIN_EMAIL}' será conservado.")
    
    # Pido una confirmación final, porque borrar usuarios es una acción muy delicada.
    confirmacion = input("¿Estás seguro de que quieres continuar? Esta acción no se puede deshacer. (escribe 'si' para confirmar): ")
    # Si la respuesta no es 'si'...
    if confirmacion.lower() != 'si':
        # ...cancelo todo y aviso al usuario.
        print("Operación cancelada por el usuario.")
        # Salgo de la función.
        return

    # Si el usuario confirmó, empiezo el proceso de borrado.
    print("\nIniciando eliminación...")
    # Creo un contador para llevar la cuenta de cuántos usuarios he eliminado.
    eliminados_count = 0
    # Creo otro contador para los errores que puedan ocurrir.
    errores_count = 0

    # Recorro la lista de usuarios que decidí eliminar.
    for user in usuarios_a_eliminar:
        # Intento borrar cada usuario.
        try:
            # Muestro a quién estoy intentando borrar en este momento.
            print(f"Eliminando usuario: {user.email} (ID: {user.id})...")
            # Le pido a Supabase que elimine al usuario usando su ID.
            supabase.auth.admin.delete_user(user.id)
            # Si se borró bien, aumento mi contador de eliminados.
            eliminados_count += 1
        # Si algo sale mal al intentar borrar un usuario...
        except Exception as e:
            # ...muestro un mensaje de error específico para ese usuario.
            print(f"  -> Error al eliminar a {user.email}: {e}")
            # Y aumento mi contador de errores.
            errores_count += 1
    
    # Al terminar el bucle, muestro un resumen de lo que pasó.
    print("\n--- Proceso Finalizado ---")
    # Informo cuántos usuarios se borraron con éxito.
    print(f"Usuarios eliminados exitosamente: {eliminados_count}")
    # Informo si hubo errores y cuántos.
    print(f"Errores durante la eliminación: {errores_count}")

# Defino una función para limpiar perfiles que se quedaron sin un usuario de autenticación correspondiente.
def limpiar_registros(supabase: Client):
    # Muestro un título para esta operación.
    print("\n--- Limpieza de Registros Incompletos ---")
    # Intento hacer la limpieza, preparado para cualquier error.
    try:
        # Pido a Supabase todos los perfiles de mi tabla 'usuarios'.
        perfiles_response = supabase.table('usuarios').select('id, nombre, email').execute()
        # Guardo los datos de los perfiles en una variable.
        perfiles = perfiles_response.data
        # Informo cuántos perfiles encontré en la tabla.
        print(f"Se encontraron {len(perfiles)} perfiles en la tabla 'usuarios'.")
        # Ahora pido la lista de todos los usuarios que existen en el sistema de autenticación de Supabase.
        auth_users_response = supabase.auth.admin.list_users()
        # Guardo esa lista de usuarios de autenticación.
        auth_users = auth_users_response
        # Creo un conjunto (set) con los IDs de los usuarios de autenticación para buscar más rápido.
        auth_user_ids = {user.id for user in auth_users}
        # Informo cuántos usuarios de autenticación encontré.
        print(f"Se encontraron {len(auth_user_ids)} usuarios en el sistema de autenticación.")

        # Busco perfiles en mi tabla 'usuarios' cuyo ID no corresponda a ningún usuario de autenticación. A estos los llamo "huérfanos".
        huerfanos = [p for p in perfiles if str(p['id']) not in auth_user_ids]

        # Si no encontré ningún perfil huérfano...
        if not huerfanos:
            # ...lo celebro con un mensaje positivo.
            print("¡Excelente! No se encontraron registros de perfiles incompletos.")
            # Y salgo de la función.
            return

        # Si encontré perfiles huérfanos, informo cuántos son.
        print(f"\nSe encontraron {len(huerfanos)} perfiles incompletos que serán eliminados:")
        # Muestro los detalles de cada perfil que voy a borrar.
        for h in huerfanos:
            print(f"  -> Perfil a eliminar: Nombre='{h['nombre']}', Email='{h['email']}', ID='{h['id']}'")
        
        # Creo una lista con los IDs de los perfiles huérfanos que voy a eliminar.
        ids_a_eliminar = [h['id'] for h in huerfanos]
        # Le digo a Supabase que borre de la tabla 'usuarios' todas las filas cuyos IDs estén en mi lista.
        supabase.table('usuarios').delete().in_('id', ids_a_eliminar).execute()
        # Informo que la limpieza se completó.
        print("\nLimpieza completada exitosamente.")

    # Si ocurre algún error durante la limpieza...
    except Exception as e:
        # ...lo capturo y muestro un mensaje de error.
        print(f"\nOcurrió un error durante la limpieza: {e}")

# Esta es la función principal que organiza todo el script.
def main():
    # Primero, verifico si tengo la URL y la KEY de Supabase. Sin ellas, no puedo conectarme.
    if not SUPABASE_URL or not SUPABASE_KEY:
        # Si faltan, muestro un error y explico cómo solucionarlo.
        print("Error: Asegúrate de que las variables de entorno SUPABASE_URL y SUPABASE_KEY están configuradas en tu archivo .env.")
        # Detengo el script.
        return

    # Hago una comprobación de seguridad. Si el email de admin no se ha cambiado...
    if ADMIN_EMAIL == "tu_admin_email@example.com":
        # ...muestro un error grande para que se note.
        print("\n--- ERROR ---")
        # Le pido al usuario que ponga su email de verdad.
        print("Por favor, edita este script y cambia la variable 'ADMIN_EMAIL' por el correo de tu cuenta de administrador.")
        # Detengo el script para evitar que se borre la cuenta equivocada.
        print("Deteniendo el proceso por seguridad.")
        # Salgo de la función.
        return

    # Intento conectar y ejecutar el menú principal.
    try:
        # Creo el cliente de Supabase para poder hacer llamadas a la base de datos.
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Si la conexión se establece, lo confirmo con un mensaje.
        print("Conectado a Supabase correctamente.")

        # Muestro el menú de opciones al usuario.
        print("\n--- Herramienta de Gestión de Usuarios ---")
        print("1. Crear un nuevo usuario")
        print("2. Eliminar todos los usuarios (excepto el admin)")
        print("3. Limpiar registros de usuario incompletos")
        # Pido al usuario que elija una de las opciones.
        opcion = input("Elige una opción (1, 2 o 3): ")

        # Si el usuario eligió '1'...
        if opcion == '1':
            # ...llamo a la función para crear un usuario.
            crear_usuario(supabase)
        # Si el usuario eligió '2'...
        elif opcion == '2':
            # ...llamo a la función para eliminar usuarios.
            eliminar_usuarios(supabase)
        # Si el usuario eligió '3'...
        elif opcion == '3':
            # ...llamo a la función para limpiar registros.
            limpiar_registros(supabase)
        # Si no eligió ninguna de las opciones válidas...
        else:
            # ...le digo que la opción no es correcta.
            print("Opción no válida.")

    # Si ocurre cualquier otro error inesperado en el script...
    except Exception as e:
        # ...lo capturo y muestro un mensaje de error general.
        print(f"\nOcurrió un error general durante la ejecución: {e}")
        # Doy una pista sobre posibles problemas comunes.
        print("Verifica que tu SUPABASE_KEY sea la 'service_role' y que tengas conexión a internet.")

# Esta línea comprueba si estoy ejecutando este archivo directamente.
if __name__ == '__main__':
    # Si es así, llama a la función 'main' para que todo comience.
    main()
