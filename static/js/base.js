// Cuando todo el contenido de la página se ha cargado, ejecuto esta función.
document.addEventListener('DOMContentLoaded', () => {
    // Busco en mi página el elemento que tiene el id 'liveTime'.
    const liveTimeEl = document.getElementById('liveTime');
    // Si encontré ese elemento...
    if (liveTimeEl) {
        // ...le digo al navegador que cada 1000 milisegundos (o sea, cada segundo)...
        setInterval(() => { // ...actualice el texto de ese elemento...
            // ...con la hora actual, formateada para Colombia (es-CO).
            liveTimeEl.textContent = new Date().toLocaleTimeString('es-CO');
        }, 1000);
    }
});