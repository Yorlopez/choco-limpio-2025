// Cuando todo el contenido de la página se ha cargado, ejecuto esta función.
document.addEventListener('DOMContentLoaded', function() {
    // Esto es para inicializar los 'tooltips' de Bootstrap. Son esas pequeñas ayudas que aparecen cuando pasas el ratón sobre algo.
    // Busco todos los elementos que tengan el atributo 'data-bs-toggle="tooltip"'.
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    // Luego, para cada uno de esos elementos, creo un nuevo objeto Tooltip de Bootstrap para que funcione.
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
});

// Defino una función que se va a encargar de procesar una solicitud, ya sea para aprobarla o rechazarla.
async function procesarSolicitud(button, solicitudId, accion) {
    // Encuentro la fila de la tabla (el 'tr') que contiene el botón que apreté.
    const row = button.closest('tr');
    // Preparo el mensaje de confirmación. Si la acción es 'aprobar', muestro un texto; si es 'rechazar', muestro otro.
    const confirmationText = accion === 'aprobar' 
        ? '¿Estás seguro de que quieres aprobar a este lanchero?'
        : '¿Estás seguro de que quieres rechazar y eliminar a este usuario? Esta acción no se puede deshacer.';

    // Muestro una ventana de confirmación con el texto que preparé. Si no hago clic en 'Aceptar', la función se detiene aquí.
    if (!confirm(confirmationText)) {
        return;
    }

    // Si confirmé, intento ejecutar el siguiente código, y si hay un error, lo capturo.
    try {
        // Hago una petición al servidor, a la ruta '/admin/solicitud/procesar'.
        const response = await fetch('/admin/solicitud/procesar', {
            method: 'POST', // Le digo que es una petición de tipo POST.
            headers: { // Le especifico que la información que envío está en formato JSON.
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ // Convierto a texto JSON los datos que voy a enviar.
                // Envío el ID de la solicitud que quiero procesar.
                solicitud_id: solicitudId,
                // Y envío la acción que quiero realizar ('aprobar' o 'rechazar').
                accion: accion
            })
        });

        // Espero la respuesta del servidor y la convierto de JSON a un objeto que pueda usar.
        const result = await response.json();

        // Si el servidor me dice que todo salió bien ('success' es true)...
        if (result.success) {
            // ...hago que la fila de la tabla desaparezca con una animación suave.
            row.style.transition = 'opacity 0.5s ease';
            row.style.opacity = '0';
            // Y después de medio segundo, elimino la fila por completo de la página.
            setTimeout(() => row.remove(), 500);
        } else {
            // Si algo salió mal, muestro una alerta con el error que me devolvió el servidor.
            alert('Error al procesar la solicitud: ' + result.error);
        }
    } catch (error) { // Si hubo un error de conexión o algo parecido...
        // ...lo muestro en la consola del navegador para depuración.
        console.error('Error de red:', error);
        // Y le muestro una alerta al usuario.
        alert('Error de conexión al procesar la solicitud.');
    }
}