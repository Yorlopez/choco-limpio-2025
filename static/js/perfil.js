// Cuando todo el contenido de la página se ha cargado, ejecuto esta función.
document.addEventListener('DOMContentLoaded', () => {
    // Le digo a mi formulario de edición que cuando se envíe, ejecute esta función.
    document.getElementById('editForm').onsubmit = async function(e) {
        // Evito que la página se recargue.
        e.preventDefault();
        // Recojo todos los datos del formulario.
        const formData = new FormData(this);
        // Convierto los datos del formulario a un objeto simple (clave: valor).
        const data = Object.fromEntries(formData);

        // Si el usuario cambió la fecha de nacimiento, la valido.
        if (data.fecha_nac) {
            const hoy = new Date();
            const fechaNacimiento = new Date(data.fecha_nac);
            let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
            const m = hoy.getMonth() - fechaNacimiento.getMonth();

            // Calculo la edad de forma precisa.
            if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
                edad--;
            }

            // No permito que la fecha de nacimiento sea en el futuro.
            if (fechaNacimiento > hoy) {
                return alert('La fecha de nacimiento no puede ser en el futuro.');
            }
            // Verifico que sea mayor de 18 años.
            if (edad < 18) {
                return alert('Debes ser mayor de 18 años para registrarte.');
            }
        }

        // Hago una petición al servidor para actualizar el perfil.
        const response = await fetch('/perfil', {
            method: 'POST', // Uso el método POST.
            headers: { 'Content-Type': 'application/json' }, // Le digo que le envío datos en formato JSON.
            body: JSON.stringify(data) // Convierto mi objeto de datos a texto JSON.
        });

        // Si la respuesta del servidor fue buena (ej: código 200)...
        if (response.ok) {
            // ...convierto la respuesta a un objeto.
            const result = await response.json();
            // Si el servidor me confirma que la actualización fue exitosa...
            if (result.success) {
                // ...muestro un mensaje de éxito que tenía oculto.
                document.getElementById('successMsg').style.display = 'block';
                // Y después de 1.5 segundos, redirijo al usuario al dashboard.
                setTimeout(() => {
                    window.location.href = '/dashboard?updated=true';
                }, 1500);
            }
        } else {
            // Si la respuesta del servidor fue un error...
            // ...convierto la respuesta de error a un objeto.
            const errorResult = await response.json();
            // Y muestro una alerta con el mensaje de error.
            alert(errorResult.error || 'Ocurrió un error al actualizar el perfil.');
        }
    };

    // Busco el campo para subir el avatar.
    const avatarUpload = document.getElementById('avatarUpload');
    // Le digo que cuando cambie (o sea, cuando se seleccione un archivo), ejecute esta función.
    avatarUpload.onchange = async function() {
        // Obtengo el primer archivo que se seleccionó.
        const file = this.files[0];
        // Si no se seleccionó ningún archivo, no hago nada.
        if (!file) return;

        // Creo un objeto FormData para poder enviar el archivo.
        const formData = new FormData();
        // Añado el archivo al FormData con el nombre 'avatar'.
        formData.append('avatar', file);

        try {
            // Hago una petición POST al servidor para subir la imagen.
            const response = await fetch('/upload_avatar', {
                method: 'POST',
                body: formData
            });
            // Convierto la respuesta a un objeto.
            const result = await response.json();
            // Si el servidor me dice que se subió bien...
            if (result.success) {
                // ...actualizo la imagen del avatar en la página con la nueva URL que me dio el servidor.
                // Le añado la fecha para evitar problemas de caché del navegador.
                document.getElementById('avatarImage').src = result.url + '?t=' + new Date().getTime();
            } else {
                // Si no, muestro una alerta con el error.
                alert(result.error || 'Error al subir la imagen.');
            }
        } catch (error) { // Si hay un error de conexión...
            // ...muestro una alerta.
            alert('Error de conexión al subir la imagen.');
        }
    };

    // Busco el botón para eliminar la cuenta.
    const deleteBtn = document.getElementById('deleteAccountBtn');
    // Le digo que cuando le hagan clic, ejecute esta función.
    deleteBtn.onclick = async function() {
        // Pido una confirmación muy específica para estar seguro de que el usuario quiere borrar su cuenta.
        const confirmation = prompt("Esta acción es irreversible. Perderás todos tus datos.\n\nEscribe 'ELIMINAR' para confirmar.");
        // Si no escribe 'ELIMINAR' exactamente...
        if (confirmation !== 'ELIMINAR') {
            // ...cancelo la operación.
            alert('Eliminación cancelada.');
            return;
        }

        try {
            // Si confirmó, hago una petición POST a mi API para eliminar la cuenta.
            const response = await fetch('/api/delete_account', { method: 'POST' });
            // Convierto la respuesta a un objeto.
            const result = await response.json();
            // Si el servidor confirma que la cuenta se eliminó...
            if (result.success) {
                // ...muestro una alerta de éxito.
                alert('Tu cuenta ha sido eliminada con éxito.');
                // Y lo redirijo a la página de inicio.
                window.location.href = '/';
            } else {
                // Si no, muestro una alerta con el error.
                alert(result.error || 'No se pudo eliminar la cuenta.');
            }
        } catch (error) { // Si hay un error de conexión...
            // ...muestro una alerta.
            alert('Error de conexión al intentar eliminar la cuenta.');
        }
    };
});