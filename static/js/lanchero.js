document.addEventListener('DOMContentLoaded', () => {
    const listaReportes = document.getElementById('lista-reportes');
    const reporteTemplate = document.getElementById('reporte-template');
    const spinner = document.getElementById('spinner');
    const noReportesMsg = document.getElementById('no-reportes');
    const contadorReportes = document.getElementById('contadorReportes');

    async function fetchReportes() {
        try {
            const response = await fetch('/api/reportes');
            if (!response.ok) {
                throw new Error('Error al obtener los reportes');
            }
            const reportes = await response.json();
            renderReportes(reportes);
        } catch (error) {
            console.error(error);
            listaReportes.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        } finally {
            spinner.style.display = 'none';
        }
    }

    function renderReportes(reportes) {
        listaReportes.innerHTML = ''; // Limpiar la lista
        
        if (reportes.length === 0) {
            noReportesMsg.style.display = 'block';
            contadorReportes.textContent = '0';
        } else {
            noReportesMsg.style.display = 'none';
            contadorReportes.textContent = reportes.length;
        }

        reportes.forEach(reporte => {
            const clone = reporteTemplate.content.cloneNode(true);
            
            const reporteImagen = clone.querySelector('.reporte-imagen');
            reporteImagen.src = reporte.foto_url || 'https://via.placeholder.com/300x200.png?text=Sin+Imagen';
            
            // Añadir evento de clic para abrir el modal con la imagen grande
            reporteImagen.addEventListener('click', () => {
                const modalImage = document.getElementById('modalImage');
                modalImage.src = reporteImagen.src;
                const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
                imageModal.show();
            });

            clone.querySelector('.reporte-kg').textContent = reporte.kg_reportados;
            clone.querySelector('.reporte-ubicacion').textContent = reporte.ubicacion_desc;
            clone.querySelector('.reporte-usuario').textContent = reporte.usuarios.nombre;
            clone.querySelector('.reporte-barrio').textContent = reporte.usuarios.barrio;
            
            const botonRecoger = clone.querySelector('.btn-recoger');
            botonRecoger.dataset.id = reporte.id;

            botonRecoger.addEventListener('click', marcarComoRecogido);

            listaReportes.appendChild(clone);
        });
    }

    async function marcarComoRecogido(event) {
        const boton = event.currentTarget;
        const reporteId = boton.dataset.id;
        
        if (!confirm('¿Confirmas que has recogido este reciclaje?')) {
            return;
        }

        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';

        try {
            const response = await fetch(`/api/reporte/recoger/${reporteId}`, { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                // Eliminar la tarjeta de la vista
                boton.closest('.col-md-6').remove();
                fetchReportes(); // Recargar la lista para actualizar el contador
            } else {
                alert(`Error: ${result.error}`);
                boton.disabled = false;
                boton.innerHTML = '<i class="bi bi-check-lg"></i> Marcar como Recogido';
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    }

    // Cargar reportes al inicio y luego cada 15 segundos
    fetchReportes();
    setInterval(fetchReportes, 15000);
});