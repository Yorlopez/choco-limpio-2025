// Cuando todo el contenido de la página se ha cargado, ejecuto esta función.
document.addEventListener('DOMContentLoaded', () => { 
    // Inicio la librería AOS para las animaciones al hacer scroll. Durarán 800ms y solo se ejecutarán una vez.
    AOS.init({ duration: 800, once: true });

    // Obtengo el "contexto" 2D de mi elemento canvas con id 'progressChart'. Es como el lienzo donde voy a dibujar.
    const ctx = document.getElementById('progressChart').getContext('2d');
    // Declaro una variable para guardar mi gráfica una vez que la cree.
    let progressChart;

    // Defino una función para ir a buscar al servidor los datos del progreso de la semana.
    async function fetchWeeklyProgress() {
        // Intento hacer lo siguiente, y si hay un error, lo atrapo.
        try {
            // Hago una petición a mi API en la ruta '/api/weekly_progress' para obtener los datos.
            const response = await fetch('/api/weekly_progress');
            // Convierto la respuesta del servidor (que viene en JSON) a un objeto de JavaScript.
            const data = await response.json();

            // Si la respuesta del servidor dice que todo fue un éxito...
            if (data.success) {
                // Ordeno los datos que recibí por fecha, de la más antigua a la más nueva.
                const sortedProgress = Object.entries(data.progress).sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));
                
                // Creo una lista de etiquetas para la gráfica (ej: "lun. 1", "mar. 2").
                const labels = sortedProgress.map(([date]) => {
                    const d = new Date(date);
                    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
                });
                // Creo una lista con los valores (los kilos reciclados) para cada día.
                const values = sortedProgress.map(([, total]) => total);

                // Llamo a mi función para dibujar la gráfica con estas etiquetas y valores.
                renderChart(labels, values);
            }
        } catch (error) { // Si algo falló en el 'try'...
            // ...muestro un mensaje de error en la consola del navegador.
            console.error('Error al obtener el progreso semanal:', error);
        }
    }

    // Defino la función que dibuja o actualiza la gráfica.
    function renderChart(labels, data) {
        // Si ya existía una gráfica, la destruyo para poder dibujar una nueva encima.
        if (progressChart) {
            progressChart.destroy();
        }
        // Creo una nueva instancia de Chart.js para dibujar la gráfica.
        progressChart = new Chart(ctx, {
            type: 'line', // Le digo que quiero una gráfica de líneas.
            data: { // Aquí le paso los datos.
                labels: labels, // Las etiquetas para el eje X (los días).
                datasets: [{ // El conjunto de datos que voy a graficar.
                    label: 'Kg Reciclados', // El nombre de esta línea de datos.
                    data: data, // Los valores para el eje Y (los kilos).
                    backgroundColor: 'rgba(212, 160, 23, 0.2)', // El color del área debajo de la línea.
                    borderColor: '#d4a017', // El color de la línea.
                    borderWidth: 3, // El grosor de la línea.
                    pointBackgroundColor: '#fff', // El color de relleno de los puntos en la línea.
                    pointBorderColor: '#d4a017', // El color del borde de los puntos.
                    pointHoverRadius: 7, // El tamaño del punto cuando paso el ratón por encima.
                    tension: 0.4, // Esto hace que la línea sea curva en lugar de recta.
                    fill: true, // Le digo que rellene el área bajo la línea.
                }]
            },
            options: { // Aquí configuro la apariencia y comportamiento de la gráfica.
                responsive: true, // Para que se adapte al tamaño de la pantalla.
                maintainAspectRatio: false, // Permite que la gráfica no mantenga una proporción fija, adaptándose mejor.
                scales: { // Configuración de los ejes.
                    y: { // Para el eje Y (vertical).
                        beginAtZero: true, // Empieza a contar desde 0.
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }, // Color de las líneas de la cuadrícula.
                        ticks: { color: '#adb5bd' } // Color de los números del eje.
                    },
                    x: { // Para el eje X (horizontal).
                        grid: { display: false }, // Oculto la cuadrícula vertical.
                        ticks: { color: '#adb5bd' } // Color de las etiquetas del eje.
                    }
                },
                plugins: { // Configuración de los plugins de Chart.js.
                    legend: { display: false } // Oculto la leyenda (el cuadrito que dice 'Kg Reciclados').
                }
            }
        });
    }

    // Defino una función para obtener y mostrar los datos del usuario (estadísticas y ranking).
    async function fetchUserData() {
        // Busco el contenedor donde voy a poner la lista del ranking.
        const rankingContainer = document.getElementById('ranking-list');
        try {
            // Añado un parámetro a la URL para evitar que el navegador use una versión guardada (caché) de los datos.
            const cacheBuster = `?t=${new Date().getTime()}`;
            // Hago una petición a mi API para obtener los datos del usuario.
            const response = await fetch(`/api/user${cacheBuster}`);
            // Convierto la respuesta a un objeto JavaScript.
            const data = await response.json();

            // Si la respuesta del servidor fue exitosa...
            if (data.success) {
                // ...actualizo los elementos en la página con los nuevos datos.
                document.getElementById('userName').textContent = data.nombre.split(' ')[0] + '!'; // Muestro solo el primer nombre.
                document.getElementById('kgTotal').textContent = data.kg_reciclados.toFixed(2) + ' kg'; // Muestro los kilos con 2 decimales.
                document.getElementById('minutosTotal').textContent = data.minutos; // Muestro los minutos.
                document.getElementById('arbolesTotal').textContent = data.arboles; // Muestro los árboles salvados.
                document.getElementById('co2Evitado').textContent = data.co2_evitado.toFixed(1) + ' kg de CO₂'; // Muestro el CO2 con 1 decimal.

                // Si recibí la lista de los mejores usuarios y existe el contenedor del ranking...
                if (data.top_users && rankingContainer) {
                    // ...limpio el contenido actual del ranking.
                    rankingContainer.innerHTML = '';
                    // Y por cada usuario en el top...
                    data.top_users.forEach((rankedUser, index) => {
                        // ...creo un nuevo elemento HTML para mostrar su posición, nombre y kilos.
                        const rankItem = `
                            <div class="list-group-item bg-transparent text-white border-secondary d-flex align-items-center py-3">
                                <div class="ranking-badge me-3">${index + 1}</div>
                                <div>
                                    ${rankedUser.nombre.split(' ')[0]} 
                                    <strong class="kg-top kg-${index + 1}">${parseFloat(rankedUser.kg_reciclados).toFixed(1)} kg</strong>
                                </div>
                            </div>
                        `;
                        // Añado este nuevo elemento al contenedor del ranking.
                        rankingContainer.innerHTML += rankItem;
                    });
                }
            }
        } catch (error) { // Si algo falla...
            // ...muestro el error en la consola.
            console.error('Error al actualizar datos de usuario:', error);
        }
    }

    // Llamo a la función para que cargue la gráfica de progreso semanal en cuanto se carga la página.
    fetchWeeklyProgress();

    // Reviso si en la URL de la página viene "?updated=true".
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('updated') === 'true') {
        // Si es así, llamo inmediatamente a la función para actualizar los datos del usuario (útil después de editar el perfil).
        fetchUserData();
    }

    // Configuro un intervalo para que los datos del usuario se actualicen automáticamente cada 10 segundos.
    setInterval(fetchUserData, 10000);

    // Busco el elemento para mostrar la hora en vivo.
    const liveTimeEl = document.getElementById('liveTime');
    // Si existe...
    if (liveTimeEl) {
        // ...la actualizo cada segundo.
        setInterval(() => {
            liveTimeEl.textContent = new Date().toLocaleTimeString('es-CO');
        }, 1000);
    }
});

// Defino una función para suscribirme a las actualizaciones en tiempo real de Supabase.
function subscribeToUpdates() {
    // Verifico que las variables de Supabase (URL y KEY) existan en la página.
    if (typeof supabaseUrl !== 'undefined' && typeof supabaseKey !== 'undefined') {
        // Si existen, creo un cliente de Supabase.
        const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

        // Me conecto a un "canal" de Supabase para escuchar cambios.
        const channel = supabase
            .channel('public:usuarios') // Escucho específicamente en la tabla 'usuarios'.
            // Le digo que me avise cuando haya una ACTUALIZACIÓN (UPDATE) en esa tabla.
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'usuarios' }, payload => {
                // Cuando reciba un aviso, muestro un mensaje en la consola.
                console.log('Cambio detectado en la tabla de usuarios, actualizando dashboard...', payload);
                // Y llamo a mi función para refrescar los datos del dashboard.
                fetchUserData(); // Esto es lo que hace que el dashboard sea "en tiempo real".
            })
            // Finalmente, me suscribo para empezar a escuchar.
            .subscribe();
    }
}

// Le digo al navegador que llame a la función 'subscribeToUpdates' cuando la página se haya cargado.
document.addEventListener('DOMContentLoaded', subscribeToUpdates);
        // Estas líneas las inyecta mi servidor (Flask) en el HTML para pasarle las claves de Supabase al JavaScript.
        const supabaseUrl = "{{ SUPABASE_URL }}";
        const supabaseKey = "{{ SUPABASE_KEY }}";