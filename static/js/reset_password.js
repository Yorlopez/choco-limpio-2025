// Cuando todo el contenido de la página se ha cargado, ejecuto esta función.
document.addEventListener('DOMContentLoaded', () => {
    // Busco los elementos que voy a necesitar: el formulario y los contenedores para los mensajes de error y éxito.
    const form = document.getElementById('resetPasswordForm'); // El formulario de restablecimiento de contraseña.
    const errorEl = document.getElementById('resetError'); // El contenedor para mensajes de error.
    const successEl = document.getElementById('resetSuccess'); // El contenedor para mensajes de éxito.
    // Declaro una variable para guardar el "token" de acceso que viene en la URL.
    let accessToken = null;

    // Extraigo el "token" de la URL. Supabase lo pone en el "hash" (la parte que empieza con #).
    // Primero, obtengo todo lo que hay después del #.
    const hash = window.location.hash.substring(1);
    // Luego, uso URLSearchParams para poder leer fácilmente los parámetros que vienen ahí.
    const params = new URLSearchParams(hash);
    // Pido el valor del parámetro 'access_token' y lo guardo.
    accessToken = params.get('access_token');

    // Si por alguna razón no encontré el token en la URL...
    if (!accessToken) {
        // ...muestro un mensaje de error.
        errorEl.textContent = 'Token de recuperación inválido o no encontrado. Por favor, solicita un nuevo enlace.'; // Mensaje de error.
        errorEl.style.display = 'block'; // Lo muestro.
        // Y oculto el formulario, porque sin token no se puede hacer nada.
        form.style.display = 'none';
    }

    // Le digo a mi formulario que cuando se envíe, ejecute esta función.
    form.addEventListener('submit', async (e) => {
        // Evito que la página se recargue.
        e.preventDefault();
        // Oculto los mensajes de error y éxito por si había algo de antes.
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        // Obtengo los valores de los campos de nueva contraseña y de confirmación.
        const newPassword = document.getElementById('newPassword').value; // Nueva contraseña.
        const confirmPassword = document.getElementById('confirmPassword').value; // Confirmación de la nueva contraseña.

        // Valido que la contraseña tenga al menos 6 caracteres.
        if (newPassword.length < 6) {
            errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return errorEl.style.display = 'block';
        }
        // Valido que las dos contraseñas que escribió sean iguales.
        if (newPassword !== confirmPassword) {
            errorEl.textContent = 'Las contraseñas no coinciden.';
            return errorEl.style.display = 'block';
        }

        // Hago una petición a mi API para actualizar la contraseña.
        const response = await fetch('/api/update-password', {
            method: 'POST', // Es una petición POST.
            headers: { 'Content-Type': 'application/json' }, // Le digo que le envío datos en formato JSON.
            body: JSON.stringify({ access_token: accessToken, new_password: newPassword }) // Le envío el token y la nueva contraseña.
        });

        // Convierto la respuesta del servidor a un objeto.
        const result = await response.json();
        // Si el servidor me dice que todo salió bien...
        if (result.success) {
            // ...muestro un mensaje de éxito.
            successEl.textContent = '¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...'; // Mensaje de éxito.
            successEl.style.display = 'block'; // Lo muestro.
            // Oculto el formulario porque ya no se necesita.
            form.style.display = 'none';
            // Y después de 3 segundos, lo redirijo a la página de inicio para que entre con su nueva contraseña.
            setTimeout(() => { window.location.href = '/'; }, 3000);
        } else {
            // Si algo salió mal, muestro el error que me devolvió el servidor.
            errorEl.textContent = result.error || 'No se pudo actualizar la contraseña.'; // Mensaje de error.
            errorEl.style.display = 'block'; // Lo muestro.
        }
    });
});