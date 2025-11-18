// Cuando todo el contenido de la página se ha cargado, ejecuto esta función.
document.addEventListener('DOMContentLoaded', () => {
    // Busco los elementos importantes de mi página y los guardo en variables.
    // El lugar donde voy a poner la lista de reportes.
    const listaReportes = document.getElementById('lista-reportes');
    // La plantilla HTML que uso para cada tarjeta de reporte.
    const reporteTemplate = document.getElementById('reporte-template');
    // El ícono de carga que se muestra mientras busco los reportes.
    const spinner = document.getElementById('spinner');
    // El mensaje que se muestra si no hay reportes.
    const noReportesMsg = document.getElementById('no-reportes');
    // El lugar donde muestro cuántos reportes hay.
    const contadorReportes = document.getElementById('contadorReportes');

    // Defino una función para ir a buscar los reportes al servidor.
    async function fetchReportes() {
        try {
            // Hago una petición a mi API. Le añado la fecha actual para que la respuesta no se quede en caché.
            const response = await fetch(`/api/reportes?_=${Date.now()}`);
            // Si la respuesta del servidor no fue buena (ej: error 404 o 500), lanzo un error.
            if (!response.ok) {
                throw new Error('Error al obtener los reportes');
            }
            // Convierto la respuesta (que es JSON) a un objeto que pueda usar.
            const reportes = await response.json();
            // Llamo a la función que se encarga de mostrar estos reportes en la página.
            renderReportes(reportes);
        } catch (error) { // Si algo falló en el 'try'...
            // ...muestro el error en la consola del navegador.
            console.error(error);
            // Y muestro un mensaje de error en la página.
            listaReportes.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        } finally {
            // Haya o no haya habido un error, al final siempre oculto el ícono de carga.
            spinner.style.display = 'none';
        }
    }

    // Defino la función que va a "pintar" los reportes en la pantalla.
    function renderReportes(reportes) {
        // Primero, vacío la lista por si había reportes de una carga anterior.
        listaReportes.innerHTML = '';
        
        // Si la lista de reportes que recibí está vacía...
        if (reportes.length === 0) {
            // ...muestro el mensaje de "No hay reportes".
            noReportesMsg.style.display = 'block';
            // Y pongo el contador en '0'.
            contadorReportes.textContent = '0';
        } else {
            // Si sí hay reportes, oculto el mensaje de "No hay reportes".
            noReportesMsg.style.display = 'none';
            // Y pongo en el contador cuántos reportes hay.
            contadorReportes.textContent = reportes.length;
        }

        // Ahora, por cada reporte que recibí...
        reportes.forEach(reporte => {
            // ...clono mi plantilla HTML para crear una nueva tarjeta de reporte.
            const clone = reporteTemplate.content.cloneNode(true);
            
            // Busco la imagen dentro de la tarjeta y le pongo la URL de la foto del reporte. Si no hay foto, pongo una imagen genérica.
            const reporteImagen = clone.querySelector('.reporte-imagen');
            reporteImagen.src = reporte.foto_url || 'https://via.placeholder.com/300x200.png?text=Sin+Imagen';

            // Relleno los demás datos de la tarjeta con la información del reporte.
            clone.querySelector('.reporte-kg').textContent = reporte.kg_reportados;
            clone.querySelector('.reporte-ubicacion').textContent = reporte.ubicacion_desc;
            clone.querySelector('.reporte-usuario').textContent = reporte.usuarios.nombre;
            clone.querySelector('.reporte-barrio').textContent = reporte.usuarios.barrio;
            
            // Busco el botón de "Recoger" dentro de la tarjeta.
            const botonRecoger = clone.querySelector('.btn-recoger');
            // Le guardo el ID del reporte a este botón, para saber cuál es cuando le hagan clic.
            botonRecoger.dataset.id = reporte.id;

            // Le digo al botón que cuando le hagan clic, ejecute la función 'marcarComoRecogido'.
            botonRecoger.addEventListener('click', marcarComoRecogido);

            // Finalmente, añado la tarjeta ya rellenada a la lista de reportes en la página.
            listaReportes.appendChild(clone);
        });
    }

    // Defino la función que se ejecuta cuando se hace clic en el botón "Marcar como Recogido".
    async function marcarComoRecogido(event) {
        // El 'event.currentTarget' es el botón al que le hicieron clic.
        const boton = event.currentTarget;
        // Recupero el ID del reporte que guardé antes en el botón.
        const reporteId = boton.dataset.id;
        
        // Pido una confirmación antes de hacer nada. Si el lanchero cancela, la función termina aquí.
        if (!confirm('¿Confirmas que has recogido este reciclaje?')) {
            return;
        }

        // Desactivo el botón y le cambio el texto para que se sepa que está trabajando.
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';

        try {
            // Hago una petición POST al servidor para marcar el reporte como recogido.
            const response = await fetch(`/api/reporte/recoger/${reporteId}`, { method: 'POST' });
            // Convierto la respuesta del servidor a un objeto.
            const result = await response.json();

            // Si el servidor me dice que todo salió bien...
            if (result.success) {
                // ...elimino la tarjeta del reporte de la pantalla.
                boton.closest('.col-md-6').remove();
                // Y vuelvo a pedir la lista de reportes para actualizar el contador.
                fetchReportes(); 
            } else {
                // Si algo salió mal, muestro una alerta con el error.
                alert(`Error: ${result.error}`);
                // Y vuelvo a activar el botón con su texto original.
                boton.disabled = false;
                boton.innerHTML = '<i class="bi bi-check-lg"></i> Marcar como Recogido';
            }
        } catch (error) { // Si hubo un error de conexión...
            // ...lo muestro en la consola.
            console.error('Error de red:', error);
        }
    }

    // Esto es para el modal que muestra la imagen en grande.
    const imageModal = document.getElementById('imageModal');
    // Le digo que justo antes de que se muestre el modal...
    imageModal.addEventListener('show.bs.modal', function (event) {
        // ...averigüe qué imagen fue la que activó el modal.
        const triggerImage = event.relatedTarget;
        // Obtengo la URL de esa imagen.
        const imageUrl = triggerImage.src;
        // Busco el elemento de imagen dentro del modal.
        const modalImageEl = imageModal.querySelector('#modalImage');
        // Y le pongo la URL de la imagen que se clickeó.
        modalImageEl.src = imageUrl;
    });

    // Llamo a la función para que busque los reportes en cuanto se carga la página.
    fetchReportes();
    // Y le digo que vuelva a buscar reportes automáticamente cada 15 segundos.
    setInterval(fetchReportes, 15000);
});