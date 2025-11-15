document.addEventListener('DOMContentLoaded', () => {
    // Manejar la actualización de los datos del perfil
    document.getElementById('editForm').onsubmit = async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);

        // --- VALIDACIÓN DE FECHA DE NACIMIENTO ---
        if (data.fecha_nac) {
            const hoy = new Date();
            const fechaNacimiento = new Date(data.fecha_nac);
            let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
            const m = hoy.getMonth() - fechaNacimiento.getMonth();

            if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
                edad--;
            }

            if (fechaNacimiento > hoy) {
                return alert('La fecha de nacimiento no puede ser en el futuro.');
            }
            if (edad < 18) {
                return alert('Debes ser mayor de 18 años para registrarte.');
            }
        }

        const response = await fetch('/perfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                document.getElementById('successMsg').style.display = 'block';
                // Redirigir al dashboard después de 1.5 segundos
                setTimeout(() => {
                    window.location.href = '/dashboard?updated=true';
                }, 1500);
            }
        } else {
            const errorResult = await response.json();
            alert(errorResult.error || 'Ocurrió un error al actualizar el perfil.');
        }
    };

    // Manejar la subida de la foto de perfil
    const avatarUpload = document.getElementById('avatarUpload');
    avatarUpload.onchange = async function() {
        const file = this.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('/upload_avatar', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                document.getElementById('avatarImage').src = result.url + '?t=' + new Date().getTime(); // Añadimos un timestamp para evitar problemas de caché
            } else {
                alert(result.error || 'Error al subir la imagen.');
            }
        } catch (error) {
            alert('Error de conexión al subir la imagen.');
        }
    };

    // Manejar la eliminación de la cuenta
    const deleteBtn = document.getElementById('deleteAccountBtn');
    deleteBtn.onclick = async function() {
        const confirmation = prompt("Esta acción es irreversible. Perderás todos tus datos.\n\nEscribe 'ELIMINAR' para confirmar.");
        if (confirmation !== 'ELIMINAR') {
            alert('Eliminación cancelada.');
            return;
        }

        try {
            const response = await fetch('/api/delete_account', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                alert('Tu cuenta ha sido eliminada con éxito.');
                window.location.href = '/'; // Redirigir a la página de inicio
            } else {
                alert(result.error || 'No se pudo eliminar la cuenta.');
            }
        } catch (error) {
            alert('Error de conexión al intentar eliminar la cuenta.');
        }
    };
});