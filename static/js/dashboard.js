document.addEventListener('DOMContentLoaded', () => {
    // Inicializar animaciones
    AOS.init({ duration: 800, once: true });

    // --- LÓGICA DEL GRÁFICO DE PROGRESO SEMANAL ---
    const ctx = document.getElementById('progressChart').getContext('2d');
    let progressChart;

    async function fetchWeeklyProgress() {
        try {
            const response = await fetch('/api/weekly_progress');
            const data = await response.json();

            if (data.success) {
                // Ordenar los datos por fecha
                const sortedProgress = Object.entries(data.progress).sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));
                
                const labels = sortedProgress.map(([date]) => {
                    const d = new Date(date);
                    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
                });
                const values = sortedProgress.map(([, total]) => total);

                renderChart(labels, values);
            }
        } catch (error) {
            console.error('Error al obtener el progreso semanal:', error);
        }
    }

    function renderChart(labels, data) {
        if (progressChart) {
            progressChart.destroy();
        }
        progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Kg Reciclados',
                    data: data,
                    backgroundColor: 'rgba(212, 160, 23, 0.2)',
                    borderColor: '#d4a017',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#d4a017',
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#adb5bd' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#adb5bd' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // --- LÓGICA DE AUTO-ACTUALIZACIÓN DE ESTADÍSTICAS ---
    async function fetchUserData() {
        const rankingContainer = document.getElementById('ranking-list');
        try {
            // "Cache Busting": Añadimos un timestamp para asegurar que siempre obtenemos datos frescos.
            const cacheBuster = `?t=${new Date().getTime()}`;
            const response = await fetch(`/api/user${cacheBuster}`);
            const data = await response.json();

            if (data.success) {
                document.getElementById('userName').textContent = data.nombre.split(' ')[0] + '!';
                document.getElementById('kgTotal').textContent = data.kg_reciclados.toFixed(2) + ' kg';
                document.getElementById('minutosTotal').textContent = data.minutos;
                document.getElementById('arbolesTotal').textContent = data.arboles;
                document.getElementById('co2Evitado').textContent = data.co2_evitado.toFixed(1) + ' kg de CO₂';

                // Actualizar el ranking del Top 3
                if (data.top_users && rankingContainer) {
                    rankingContainer.innerHTML = ''; // Limpiar la lista antes de redibujar
                    data.top_users.forEach((rankedUser, index) => {
                        const rankItem = `
                            <div class="list-group-item bg-transparent text-white border-secondary d-flex align-items-center py-3">
                                <div class="ranking-badge me-3">${index + 1}</div>
                                <div>
                                    ${rankedUser.nombre.split(' ')[0]} 
                                    <strong class="kg-top kg-${index + 1}">${parseFloat(rankedUser.kg_reciclados).toFixed(1)} kg</strong>
                                </div>
                            </div>
                        `;
                        rankingContainer.innerHTML += rankItem;
                    });
                }
            }
        } catch (error) {
            console.error('Error al actualizar datos de usuario:', error);
        }
    }

    // --- INICIALIZACIÓN ---
    // Cargar el gráfico al inicio
    fetchWeeklyProgress();

    // Verificar si venimos de una actualización de perfil para forzar la carga de datos
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('updated') === 'true') {
        fetchUserData(); // Forzar actualización inmediata
    }

    // Actualizar las estadísticas cada 10 segundos
    setInterval(fetchUserData, 10000);

    // Actualizar la hora en vivo
    const liveTimeEl = document.getElementById('liveTime');
    if (liveTimeEl) {
        setInterval(() => {
            liveTimeEl.textContent = new Date().toLocaleTimeString('es-CO');
        }, 1000);
    }
});