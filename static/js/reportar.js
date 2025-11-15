document.getElementById('reportarForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const alertContainer = document.getElementById('alert-container');

    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
    alertContainer.innerHTML = '';

    try {
        const response = await fetch('/reportar', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showAlert('¡Reporte enviado con éxito! El lanchero ha sido notificado.', 'success');
            form.reset();
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } else {
            showAlert(result.error || 'Ocurrió un error al enviar el reporte.', 'danger');
        }

    } catch (error) {
        showAlert('Error de conexión. Por favor, intenta de nuevo.', 'danger');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Enviar Reporte';
    }
});

function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}