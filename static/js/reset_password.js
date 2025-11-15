document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('resetPasswordForm');
    const errorEl = document.getElementById('resetError');
    const successEl = document.getElementById('resetSuccess');
    let accessToken = null;

    // Extraer el access_token de la URL (ej: #access_token=...&...)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');

    if (!accessToken) {
        errorEl.textContent = 'Token de recuperación inválido o no encontrado. Por favor, solicita un nuevo enlace.';
        errorEl.style.display = 'block';
        form.style.display = 'none';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword.length < 6) {
            errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return errorEl.style.display = 'block';
        }
        if (newPassword !== confirmPassword) {
            errorEl.textContent = 'Las contraseñas no coinciden.';
            return errorEl.style.display = 'block';
        }

        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken, new_password: newPassword })
        });

        const result = await response.json();
        if (result.success) {
            successEl.textContent = '¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...';
            successEl.style.display = 'block';
            form.style.display = 'none';
            setTimeout(() => { window.location.href = '/'; }, 3000);
        } else {
            errorEl.textContent = result.error || 'No se pudo actualizar la contraseña.';
            errorEl.style.display = 'block';
        }
    });
});