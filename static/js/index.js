// Inicio la librería AOS para las animaciones. Les pongo una duración de 1 segundo y que solo se ejecuten una vez.
AOS.init({ duration: 1000, once: true });

// Le digo a la ventana del navegador que esté atenta a cuando hago scroll.
window.addEventListener('scroll', () => {
    // Busco mi barra de navegación.
    const navbar = document.querySelector('.navbar');
    // Le añado o le quito la clase 'scrolled' dependiendo de si he bajado más de 100 píxeles. Esto me sirve para cambiarle el estilo.
    navbar.classList.toggle('scrolled', window.scrollY > 100);
});

// Inicio la animación de partículas en el elemento con id 'particles-js' con una configuración específica.
particlesJS("particles-js", { 
    "particles": { // Configuración de las partículas.
        "number": { "value": 80 }, // Quiero 80 partículas.
        "color": { "value": "#0d6efd" }, // De color azul.
        "shape": { "type": "circle" }, // Con forma de círculo.
        "opacity": { "value": 0.5 }, // Con un 50% de opacidad.
        "size": { "value": 3 }, // De 3 píxeles de tamaño.
        "move": { "enable": true, "speed": 2 } // Que se muevan a una velocidad de 2.
    }, 
    "interactivity": { // Configuración de la interactividad.
        "events": { "onhover": { "enable": true, "mode": "repulse" } } // Cuando paso el ratón por encima, las partículas se alejan.
    } 
});

// Creo un mapa usando la librería Leaflet en el elemento con id 'map'. Lo centro en unas coordenadas y le pongo un nivel de zoom.
const map = L.map('map').setView([5.692, -76.657], 13);
// Le añado al mapa una capa de "azulejos" (las imágenes del mapa) de OpenStreetMap.
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
// Añado un marcador en las mismas coordenadas donde centré el mapa.
L.marker([5.692, -76.657]).addTo(map)
    // Le asocio una ventanita emergente (popup) a ese marcador.
    .bindPopup('<b>Muelle Turístico</b><br>Recolección diaria 8:00 AM')
    // Y hago que esa ventanita aparezca abierta por defecto.
    .openPopup();

// Busco el botón que usé para cambiar el tema (claro/oscuro).
const themeToggle = document.getElementById('themeToggle');
// Reviso en la memoria del navegador si ya había guardado un tema preferido. Si no, uso 'light' por defecto.
const currentTheme = localStorage.getItem('theme') || 'light';
// Si el tema guardado es 'dark'...
if (currentTheme === 'dark') {
    // ...le pongo el atributo 'data-theme="dark"' a todo el documento HTML para que se apliquen los estilos oscuros.
    document.documentElement.setAttribute('data-theme', 'dark');
    // Y cambio el icono del botón para que muestre la luna.
    themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
}
// Le digo al botón del tema que, cuando le hagan clic, ejecute esta función.
themeToggle.addEventListener('click', () => {
    // Reviso si el tema actual es oscuro.
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    // Si es oscuro...
    if (isDark) {
        // ...le quito el atributo 'data-theme', volviendo al tema claro.
        document.documentElement.removeAttribute('data-theme');
        // Cambio el icono del botón al sol.
        themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
        // Guardo en la memoria del navegador que la preferencia ahora es 'light'.
        localStorage.setItem('theme', 'light');
    } else {
        // Si no era oscuro, hago lo contrario: pongo el tema oscuro.
        document.documentElement.setAttribute('data-theme', 'dark');
        // Cambio el icono a la luna.
        themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
        // Y guardo 'dark' como preferencia.
        localStorage.setItem('theme', 'dark');
    }
});

// Busco mi formulario de inicio de sesión y le digo que ejecute esta función cuando se envíe.
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    // Evito que la página se recargue.
    e.preventDefault();
    // Guardo el formulario y el botón de envío en variables.
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    // Obtengo el valor del campo de identificador (email o teléfono) y le quito espacios.
    const identificador = document.getElementById('loginIdentificador').value.trim();
    // Obtengo la contraseña.
    const contraseña = document.getElementById('loginContraseña').value;

    // Desactivo el botón y le cambio el texto para que el usuario sepa que se está procesando.
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';

    // Busco el elemento donde muestro los errores y lo oculto por si había un error anterior.
    const errorEl = document.getElementById('loginError');
    errorEl.style.display = 'none';

    // Intento enviar los datos al servidor.
    try {
        // Hago una petición POST a la misma página ('/').
        const res = await fetch('/', {
            method: 'POST',
            // Le digo al servidor que le estoy enviando datos de un formulario.
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            // Preparo los datos para enviarlos.
            body: new URLSearchParams({
                action: 'login', // Le digo al servidor que esta es una acción de 'login'.
                identificador, // El email o teléfono.
                contraseña // La contraseña.
            })
        });

        // Convierto la respuesta del servidor a un objeto.
        const data = await res.json();

        // Si el servidor me dice que el login fue exitoso y me da una dirección a dónde ir...
        if (data.success && data.redirect) {
            // ...redirijo al usuario a esa página.
            window.location.href = data.redirect;
        } else {
            // Si no, muestro el mensaje de error que me dio el servidor.
            errorEl.textContent = data.error || 'Error desconocido';
            errorEl.style.display = 'block';
            // Y vuelvo a activar el botón.
            button.disabled = false;
            button.textContent = 'Entrar';
        }
    } catch (err) { // Si hubo un error de conexión...
        // ...muestro un mensaje genérico de error.
        errorEl.textContent = 'Error de conexión';
        errorEl.style.display = 'block';
        // Y reactivo el botón.
        button.disabled = false;
        button.textContent = 'Entrar';
    }
});

// Busco mi formulario de registro y le digo que ejecute esta función cuando se envíe.
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    // Evito que la página se recargue.
    e.preventDefault();
    // Recojo todos los datos de los campos del formulario.
    const nombre = document.getElementById('regNombre').value.trim();
    const telefono = document.getElementById('regTelefono').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const barrio = document.getElementById('regBarrio').value.trim();
    const contraseña = document.getElementById('regContraseña').value;
    const fechaNac = document.getElementById('regFechaNac').value;
    // Reviso si el checkbox de 'lanchero' está marcado para saber el rol.
    const rol = document.getElementById('regComoLanchero').checked ? 'lanchero' : 'usuario';
    const mensajeLanchero = document.getElementById('regMensajeLanchero')?.value.trim();
    const fotoLanchaInput = document.getElementById('regFotoLancha');
    // Obtengo el archivo de la foto de la lancha, si es que se subió uno.
    const fotoLancha = fotoLanchaInput?.files[0];

    // Busco el elemento de error y lo oculto.
    const errorEl = document.getElementById('registerError');
    errorEl.style.display = 'none';

    // Valido que el teléfono tenga 10 dígitos y empiece por 3.
    if (!/^3\d{9}$/.test(telefono)) {
        errorEl.textContent = 'Teléfono inválido (10 dígitos, empieza con 3)';
        errorEl.style.display = 'block';
        return;
    }

    // Si se ingresó una fecha de nacimiento, la valido.
    if (fechaNac) {
        const hoy = new Date();
        const fechaNacimiento = new Date(fechaNac);
        let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
        const m = hoy.getMonth() - fechaNacimiento.getMonth();
        // Calculo la edad exacta.
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
            edad--;
        }
        // No permito fechas en el futuro.
        if (fechaNacimiento > hoy) {
            errorEl.textContent = 'La fecha de nacimiento no puede ser en el futuro.';
            return errorEl.style.display = 'block';
        }
        // Verifico que sea mayor de 18 años.
        if (edad < 18) {
            errorEl.textContent = 'Debes ser mayor de 18 años para registrarte.';
            return errorEl.style.display = 'block';
        }
    }

    // Si se está registrando como lanchero, me aseguro de que haya escrito un mensaje y subido una foto.
    if (rol === 'lanchero' && (!mensajeLanchero || !fotoLancha)) {
        errorEl.textContent = 'Para registrarte como lanchero, el mensaje y la foto de la lancha son obligatorios.';
        return errorEl.style.display = 'block';
    }

    // Intento enviar los datos.
    try {
        // Uso un objeto 'FormData' porque necesito enviar un archivo (la foto).
        const formData = new FormData();
        // Añado todos los datos al objeto FormData.
        formData.append('action', 'register');
        formData.append('nombre', nombre);
        formData.append('telefono', telefono);
        formData.append('email', email);
        formData.append('barrio', barrio);
        formData.append('contraseña', contraseña);
        formData.append('fecha_nac', fechaNac);
        formData.append('rol', rol);

        // Si es un lanchero, añado también el mensaje y la foto.
        if (rol === 'lanchero') {
            formData.append('mensaje_lanchero', mensajeLanchero);
            formData.append('foto_lancha', fotoLancha);
        }

        // Hago la petición POST al servidor con todos los datos del formulario.
        const res = await fetch('/', {
            method: 'POST',
            body: formData
        });

        // Si la petición fue bien (código 2xx)...
        if (res.ok) {
            // ...convierto la respuesta a un objeto.
            const data = await res.json();
            // Si el registro fue exitoso y me redirigen...
            if (data.success && data.redirect) {
                // ...voy a la nueva página.
                window.location.href = data.redirect;
            } else {
                // Si no, muestro el error que me dio el servidor.
                errorEl.textContent = data.error || 'Ocurrió un error inesperado.';
                errorEl.style.display = 'block';
            }
        } else {
            // Si la petición falló (código 4xx o 5xx), también muestro el error.
            const errorData = await res.json();
            errorEl.textContent = errorData.error || `Error del servidor (${res.status})`;
            errorEl.style.display = 'block';
        }
    } catch (err) { // Si hay un error de conexión...
        // ...muestro un mensaje genérico.
        errorEl.textContent = 'Error de conexión';
        errorEl.style.display = 'block';
    }
});

// Busco el formulario para recuperar contraseña y le asigno una función al envío.
document.getElementById('recuperarForm')?.addEventListener('submit', async (e) => {
    // Evito que la página se recargue.
    e.preventDefault();
    // Obtengo el email ingresado.
    const email = document.getElementById('recuperarEmail').value;
    const form = e.target;
    const button = form.querySelector('button');

    // Desactivo el botón y le cambio el texto.
    button.disabled = true;
    button.textContent = 'Enviando...';

    // Hago una petición a mi API para solicitar el reseteo de contraseña.
    await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email })
    });

    // Muestro una alerta al usuario. No le digo si el correo existe o no por seguridad.
    alert('Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña en breve.');
    // Cierro la ventana modal de recuperación.
    bootstrap.Modal.getInstance(document.getElementById('recuperarModal')).hide();
    // Reactivo el botón.
    button.disabled = false;
    button.textContent = 'Enviar enlace';
});
// Busco el checkbox para registrarse como lanchero y le digo que esté atento a los cambios.
document.getElementById('regComoLanchero').addEventListener('change', function() {
    // Busco la sección del formulario que tiene los campos solo para lancheros.
    const lancheroFields = document.getElementById('lancheroFields');
    // Si el checkbox está marcado...
    if (this.checked) {
        // ...muestro los campos de lanchero (quitando la clase que los oculta).
        lancheroFields.classList.remove('d-none');
    } else {
        // Si no está marcado, los oculto.
        lancheroFields.classList.add('d-none');
    }
});
