// Inicializa animaciones
AOS.init({ duration: 1000, once: true });

// Scroll navbar
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 100);
});

// Partículas
particlesJS("particles-js", { 
    "particles": { 
        "number": { "value": 80 }, 
        "color": { "value": "#0d6efd" }, 
        "shape": { "type": "circle" }, 
        "opacity": { "value": 0.5 }, 
        "size": { "value": 3 }, 
        "move": { "enable": true, "speed": 2 } 
    }, 
    "interactivity": { 
        "events": { "onhover": { "enable": true, "mode": "repulse" } } 
    } 
});

// Mapa
const map = L.map('map').setView([5.692, -76.657], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
L.marker([5.692, -76.657]).addTo(map)
    .bindPopup('<b>Muelle Turístico</b><br>Recolección diaria 8:00 AM')
    .openPopup();

// Tema
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
}
themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
        localStorage.setItem('theme', 'dark');
    }
});

// === LOGIN ===
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const identificador = document.getElementById('loginIdentificador').value.trim();
    const contraseña = document.getElementById('loginContraseña').value;

    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';

    const errorEl = document.getElementById('loginError');
    errorEl.style.display = 'none';

    try {
        const res = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'login',
                identificador,
                contraseña
            })
        });

        const data = await res.json();

        if (data.success && data.redirect) {
            window.location.href = data.redirect;
        } else {
            errorEl.textContent = data.error || 'Error desconocido';
            errorEl.style.display = 'block';
            button.disabled = false;
            button.textContent = 'Entrar';
        }
    } catch (err) {
        errorEl.textContent = 'Error de conexión';
        errorEl.style.display = 'block';
        button.disabled = false;
        button.textContent = 'Entrar';
    }
});

// === REGISTRO ===
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('regNombre').value.trim();
    const telefono = document.getElementById('regTelefono').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const barrio = document.getElementById('regBarrio').value.trim();
    const contraseña = document.getElementById('regContraseña').value;
    const fechaNac = document.getElementById('regFechaNac').value;
    const rol = document.getElementById('regComoLanchero').checked ? 'lanchero' : 'usuario';

    const errorEl = document.getElementById('registerError');
    errorEl.style.display = 'none';

    if (!/^3\d{9}$/.test(telefono)) {
        errorEl.textContent = 'Teléfono inválido (10 dígitos, empieza con 3)';
        errorEl.style.display = 'block';
        return;
    }

    // --- VALIDACIÓN DE EDAD ---
    if (fechaNac) {
        const hoy = new Date();
        const fechaNacimiento = new Date(fechaNac);
        let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
        const m = hoy.getMonth() - fechaNacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
            edad--;
        }
        if (fechaNacimiento > hoy) {
            errorEl.textContent = 'La fecha de nacimiento no puede ser en el futuro.';
            return errorEl.style.display = 'block';
        }
        if (edad < 18) {
            errorEl.textContent = 'Debes ser mayor de 18 años para registrarte.';
            return errorEl.style.display = 'block';
        }
    }

    try {
        const res = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'register',
                nombre,
                telefono,
                email,
                barrio,
                contraseña,
                fecha_nac: fechaNac,
                rol
            })
        });

        const data = await res.json();

        if (data.success && data.redirect) {
            // El backend ahora nos redirige a la página de verificación
            // o al dashboard, dependiendo de la acción.
            window.location.href = data.redirect;
        } else {
            errorEl.textContent = data.error || 'Error al registrarse';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Error de conexión';
        errorEl.style.display = 'block';
    }
});

// === RECUPERAR CONTRASEÑA (opcional, si lo implementas después) ===
document.getElementById('recuperarForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('recuperarEmail').value;
    const form = e.target;
    const button = form.querySelector('button');

    button.disabled = true;
    button.textContent = 'Enviando...';

    await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email })
    });

    // Por seguridad, siempre mostramos un mensaje de éxito,
    // incluso si el correo no existe.
    alert('Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña en breve.');
    bootstrap.Modal.getInstance(document.getElementById('recuperarModal')).hide();
    button.disabled = false;
    button.textContent = 'Enviar enlace';
});