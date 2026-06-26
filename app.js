// CONFIGURACIÓN DE APIS Y LLAVES
const CONFIG = {
    cat: {
        apiKey: "live_DoapfaGn2dhhIbJT6YH2xOYwi9aPYzVlBnQ9rOC8kSAsJfh11XxAzoYOv5U2Cl2e",
        baseUrl: "https://api.thecatapi.com/v1/breeds/search?q="
    },
    dog: {
        apiKey: "live_ledH8TF8eDxyUiMShePyjscIgWARFZQvh1qvzaJzWtlzCeQWcZhtuJ90YSj8v5UL",
        baseUrl: "https://api.thedogapi.com/v1/breeds/search?q="
    },
    animal: {
        baseUrl: "https://es.wikipedia.org/api/rest_v1/page/summary/"
    }
};

const petTypeSelect = document.getElementById('petType');
const breedInput = document.getElementById('breedInput');
const searchBtn = document.getElementById('searchBtn');
const resultContainer = document.getElementById('result');
const themeToggle = document.getElementById('themeToggle');
const weatherWidget = document.getElementById('weatherWidget');

//EJECUCIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initWeatherAndGeo();
});

//LPGICA DE MODO OSCURO
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = "Modo Claro";
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = "☀️ Modo Claro";
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = "Modo Oscuro";
        }
    });
}

//LOGICA DE GEOLOCALIZACIÓN Y CLIMA ---
function initWeatherAndGeo() {
    if (!navigator.geolocation) {
        weatherWidget.innerHTML = "Geolocalización no soportada";
        return;
    }

    // Solicita las coordenadas nativas del navegador
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
            // 1. Llamada a Open-Meteo API (Clima en base a Latitud y Longitud)
            const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const weatherData = await weatherResponse.json();
            const temp = weatherData.current_weather.temperature;

            // 2. Llamada a Nominatim OpenStreetMap (Obtener nombre de la ciudad a partir de coordenadas)
            const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const geoData = await geoResponse.json();
            // Validamos campos comunes de ciudad que devuelve la API
            const city = geoData.address.city || geoData.address.town || geoData.address.village || "Ubicación Desconocida";

            // Renderizamos en el widgHet
            weatherWidget.innerHTML = `<strong>${city}</strong>: ${temp}°C 🌤️`;

        } catch (error) {
            console.error(error);
            weatherWidget.innerHTML = "Error al obtener datos del clima";
        }
    }, (error) => {
        // Manejo si el usuario deniega el permiso de ubicación
        weatherWidget.innerHTML = "Ubicación denegada";
    });
}

// --- LÓGICA DEL BUSCADOR DE ANIMALES (Mantenida e intacta) ---
searchBtn.addEventListener('click', searchData);
breedInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchData(); });

async function searchData() {
    const type = petTypeSelect.value; 
    const query = breedInput.value.trim();
    const currentApi = CONFIG[type];

    resultContainer.style.display = "block";
    resultContainer.innerHTML = "<p style='text-align:center;'>Buscando en los registros...</p>";

    if (query === "") {
        resultContainer.innerHTML = `<p class="error">Por favor, escribe un término de búsqueda.</p>`;
        return;
    }

    try {
        if (type === 'animal') {
            const formattedQuery = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
            const response = await fetch(`${currentApi.baseUrl}${encodeURIComponent(formattedQuery)}`);
            
            if (!response.ok) {
                resultContainer.innerHTML = `<p class="error">No se encontraron resultados para "${query}" en esta categoría.</p>`;
                return;
            }

            const data = await response.json();

            if (data.type === 'disambiguation') {
                resultContainer.innerHTML = `<p class="error">El término "${query}" es muy ambiguo. Intenta con algo más específico.</p>`;
                return;
            }

            const imgHtml = data.originalimage && data.originalimage.source 
                ? `<img src="${data.originalimage.source}" alt="${data.title}" class="pet-img">`
                : `<p class="error">Se encontró información de "${data.title}", pero no hay una foto disponible.</p>`;

            resultContainer.innerHTML = `
                <h2>${data.title} </h2>
                <p style="line-height: 1.6;">${data.extract}</p>
                ${imgHtml}
            `;
        } 
        else {
            const headers = { 'x-api-key': currentApi.apiKey };
            const response = await fetch(`${currentApi.baseUrl}${query}`, { headers });
            const data = await response.json();

            if (data.length === 0) {
                resultContainer.innerHTML = `<p class="error">No se encontraron resultados para "${query}" en esta categoría.</p>`;
                return;
            }

            const item = data[0];
            const name = item.name;
            const infoText = item.description || item.temperament || "Sin descripción disponible.";
            const extraInfo = item.life_span ? `<span class="badge">Vida estimada: ${item.life_span}</span>` : '';

            const imgBaseUrl = type === 'cat' ? 'https://api.thecatapi.com/v1' : 'https://api.thedogapi.com/v1';
            
            const imageResponse = await fetch(`${imgBaseUrl}/images/search?breed_ids=${item.id}`, { headers });
            const imageData = await imageResponse.json();

            if (imageData.length > 0) {
                resultContainer.innerHTML = `
                    <h2>${name}</h2>
                    <p>${infoText}</p>
                    <div style="text-align:center;">${extraInfo}</div>
                    <img src="${imageData[0].url}" alt="${name}" class="pet-img">
                `;
            } else {
                resultContainer.innerHTML = `
                    <h2>${name}</h2>
                    <p>${infoText}</p>
                    <div style="text-align:center;">${extraInfo}</div>
                    <p class="error">Se encontró la raza, pero no hay fotos disponibles.</p>
                `;
            }
        }

    } catch (error) {
        console.error(error);
        resultContainer.innerHTML = `<p class="error">Error de conexión o fallo en los servidores de información.</p>`;
    }
}
