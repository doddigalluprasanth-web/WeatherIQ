const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const cityName = document.getElementById("cityName");
const currentDate = document.getElementById("currentDate"); // NEW: Grabbed the date element
const temp = document.getElementById("temp");
const weatherCondition = document.getElementById("weatherCondition"); // NEW: For weather text
const weatherIconContainer = document.querySelector(".weather-icon"); // NEW: For weather emoji
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const uvIndex = document.getElementById("uvIndex");
const feelsLike = document.getElementById("feelsLike"); // NEW: Grabbed feels like element
const forecastContainer = document.getElementById("forecastContainer");
const loader = document.getElementById("loader");
const aqiValue = document.getElementById("aqiValue");
const aqiStatus = document.getElementById("aqiStatus");
const themeToggle = document.getElementById("themeToggle");

let weatherChart;
let map;
let marker;

// ===========================
// EVENTS
// ===========================
searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeather(city);
    }
});

cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        searchBtn.click();
    }
});

locationBtn.addEventListener("click", getCurrentLocation);

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});

// ===========================
// LOADER
// ===========================
function showLoader() {
    loader.classList.remove("hidden");
}

function hideLoader() {
    loader.classList.add("hidden");
}

// ===========================
// HELPER: WEATHER CODES
// ===========================
// NEW: Maps WMO weather codes to emojis and descriptions
function getWeatherInterpretation(code) {
    if (code === 0) return { icon: "☀️", text: "Clear Sky" };
    if (code >= 1 && code <= 3) return { icon: "⛅", text: "Partly Cloudy" };
    if (code >= 45 && code <= 48) return { icon: "🌫️", text: "Fog" };
    if (code >= 51 && code <= 67) return { icon: "🌧️", text: "Rain" };
    if (code >= 71 && code <= 77) return { icon: "❄️", text: "Snow" };
    if (code >= 95 && code <= 99) return { icon: "⛈️", text: "Thunderstorm" };
    return { icon: "🌤️", text: "Unknown" };
}

// ===========================
// WEATHER SEARCH
// ===========================
async function getWeather(city) {
    try {
        showLoader();

        // FIXED: Added backticks for template literal
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`);
        const geoData = await geoResponse.json();

        if (!geoData.results) {
            throw new Error("City not found");
        }

        const location = geoData.results[0];
        const lat = location.latitude;
        const lon = location.longitude;

        saveHistory(location.name);

        await fetchWeather(lat, lon, location.name, location.country);

    } catch (error) {
        alert(error.message);
        console.error(error);
    } finally {
        hideLoader();
    }
}

// ===========================
// WEATHER API
// ===========================
async function fetchWeather(lat, lon, city, country) {
    // FIXED: Added backticks. 
    // NEW: Added apparent_temperature, visibility, and weather_code to the API request
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,pressure_msl,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`);
    const data = await response.json();
    
    const current = data.current;

    // FIXED: Added backticks to all textContent assignments
    cityName.textContent = `${city}${country ? `, ${country}` : ""}`;
    temp.textContent = `${current.temperature_2m}°C`;
    humidity.textContent = `${current.relative_humidity_2m}%`;
    wind.textContent = `${current.wind_speed_10m} km/h`;
    pressure.textContent = `${current.pressure_msl} hPa`;
    
    // NEW: Populate previously hardcoded/missing fields
    feelsLike.textContent = `${current.apparent_temperature}°C`;
    visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`; 
    uvIndex.textContent = data.daily.uv_index_max[0];

    // NEW: Update Date
    const today = new Date();
    currentDate.textContent = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // NEW: Update Weather Icon and Text
    const weatherInfo = getWeatherInterpretation(current.weather_code);
    weatherIconContainer.textContent = weatherInfo.icon;
    weatherCondition.textContent = weatherInfo.text;

    renderForecast(data);
    renderChart(data);
    updateMap(lat, lon, city);
    await fetchAQI(lat, lon);
}

// ===========================
// FORECAST
// ===========================
function renderForecast(data) {
    forecastContainer.innerHTML = "";
    data.daily.time.forEach((date, index) => {
        const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const iconInfo = getWeatherInterpretation(data.daily.weather_code[index]);
        
        // FIXED: Completed the broken HTML template string
        forecastContainer.innerHTML += `
            <div class="forecast-card">
                <h3>${day}</h3>
                <div style="font-size: 2rem; margin: 10px 0;">${iconInfo.icon}</div>
                <p><strong>${data.daily.temperature_2m_max[index]}°</strong> / ${data.daily.temperature_2m_min[index]}°</p>
            </div>
        `;
    });
}

// ===========================
// CHART
// ===========================
function renderChart(data) {
    const ctx = document.getElementById("tempChart");
    if (weatherChart) {
        weatherChart.destroy();
    }
    
    // NEW: Improved chart colors to match the dark/glass theme
    weatherChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.daily.time,
            datasets: [{
                label: "Max Temperature (°C)",
                data: data.daily.temperature_2m_max,
                borderColor: "#00c6ff",
                backgroundColor: "rgba(0, 198, 255, 0.2)",
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#ffd700"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "white" } }
            },
            scales: {
                x: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.1)" } },
                y: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.1)" } }
            }
        }
    });
}

// ===========================
// MAP
// ===========================
function updateMap(lat, lon, city) {
    if (!map) {
        map = L.map('map').setView([lat, lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
    } else {
        map.setView([lat, lon], 10);
        if (marker) {
            map.removeLayer(marker);
        }
    }
    marker = L.marker([lat, lon]).addTo(map).bindPopup(`<b>${city}</b>`).openPopup();
}

// ===========================
// GEOLOCATION
// ===========================
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeather(position.coords.latitude, position.coords.longitude, "Current Location", "");
            },
            () => {
                alert("Location access denied");
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// ===========================
// SEARCH HISTORY
// ===========================
function saveHistory(city) {
    let history = JSON.parse(localStorage.getItem("weatherHistory")) || [];
    history = history.filter(item => item !== city);
    history.unshift(city);
    history = history.slice(0, 5); // Keep top 5
    localStorage.setItem("weatherHistory", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById("searchHistory");
    container.innerHTML = "";
    const history = JSON.parse(localStorage.getItem("weatherHistory")) || [];
    
    history.forEach(city => {
        const btn = document.createElement("button");
        btn.textContent = city;
        btn.addEventListener("click", () => {
            cityInput.value = city;
            getWeather(city);
        });
        container.appendChild(btn);
    });
}

// ===========================
// AQI
// ===========================
async function fetchAQI(lat, lon) {
    try {
        // FIXED: Added backticks
        const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);
        const data = await response.json();
        const value = data.current.us_aqi;
        
        aqiValue.textContent = value;
        
        let status = "Good";
        if (value > 50) status = "Moderate";
        if (value > 100) status = "Unhealthy";
        if (value > 150) status = "Very Unhealthy";
        if (value > 200) status = "Hazardous"; // NEW: Added an extra tier just in case
        
        aqiStatus.textContent = status;
    } catch (error) {
        console.error(error);
        aqiStatus.textContent = "Error";
    }
}

// ===========================
// STARTUP
// ===========================
window.addEventListener("load", () => {
    renderHistory();
    getWeather("Visakhapatnam");
});