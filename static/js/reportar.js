// Aquí le digo a mi formulario con el id 'reportarForm' que cuando alguien lo envíe, ejecute esta función.
document.getElementById('reportarForm').addEventListener('submit', async function(e) {
    // Con esto evito que la página se recargue cuando envío el formulario, que es lo que haría normalmente.
    e.preventDefault();

    // Guardo el formulario que se acaba de enviar en una variable para usarlo más fácil.
    const form = e.target;
    // Creo un objeto 'FormData' que me ayuda a recoger todos los datos del formulario (como el texto y la foto).
    const formData = new FormData(form);
    // Busco el botón de enviar dentro de mi formulario para poder cambiarlo.
    const submitButton = form.querySelector('button[type="submit"]');
    // Busco el lugar donde voy a mostrar los mensajes de alerta.
    const alertContainer = document.getElementById('alert-container');

    // Desactivo el botón para que no se pueda hacer clic varias veces mientras se envía.
    submitButton.disabled = true;
    // Le cambio el texto al botón para que el usuario sepa que se está enviando.
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
    // Limpio cualquier mensaje de alerta que pudiera haber de antes.
    alertContainer.innerHTML = '';

    try {
        // Hago una petición a mi servidor, a la ruta '/reportar'.
        const response = await fetch('/reportar', {
            method: 'POST', // Le digo que es una petición de tipo POST.
            body: formData // Le envío todos los datos del formulario que recogí antes.
        });

        // Espero la respuesta del servidor y la convierto de JSON a un objeto que pueda usar.
        const result = await response.json();

        // Si el servidor me dice en su respuesta que todo salió bien ('success' es true)...
        if (result.success) {
            // ...llamo a mi función para mostrar una alerta de éxito.
            showAlert('¡Reporte enviado con éxito! El lanchero ha sido notificado.', 'success');
            // Limpio todos los campos del formulario.
            form.reset();
            // Espero 2 segundos y después redirijo al usuario a su panel de control (dashboard).
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } else {
            // Si el servidor me dice que hubo un error, muestro una alerta de peligro con el mensaje que me envió.
            showAlert(result.error || 'Ocurrió un error al enviar el reporte.', 'danger');
        }

    } catch (error) { // Si ocurre un error de conexión (por ejemplo, si no hay internet)...
        // ...muestro una alerta de error de conexión.
        showAlert('Error de conexión. Por favor, intenta de nuevo.', 'danger');
    } finally {
        // Haya o no haya habido un error, esto se ejecuta siempre al final.
        // Vuelvo a activar el botón.
        submitButton.disabled = false;
        // Le devuelvo su texto original.
        submitButton.innerHTML = 'Enviar Reporte';
    }
});

// Defino una función sencilla para mostrar alertas. Recibe un mensaje y un tipo (como 'success' o 'danger').
function showAlert(message, type) {
    // Busco el contenedor de alertas.
    const alertContainer = document.getElementById('alert-container');
    // Le pongo adentro un div de alerta de Bootstrap con el mensaje y el tipo que me pasaron.
    alertContainer.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}