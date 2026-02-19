// Weather App - Open-Meteo API Integration
// No API key required for non-commercial use

// API Configuration
const API_BASE_URL = 'https://api.open-meteo.com/v1';
const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingIndicator = document.getElementById('loadingIndicator');

// Weather Card Elements
const currentWeatherCard = document.getElementById('currentWeather');
const historicalWeatherCard = document.getElementById('historicalWeather');
const marineWeatherCard = document.getElementById('marineWeather');

// Current Weather Elements
const currentDateEl = document.getElementById('currentDate');
const temperatureEl = document.getElementById('temperature');
const weatherConditionEl = document.getElementById('weatherCondition');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('windSpeed');
const pressureEl = document.getElementById('pressure');
const locationEl = document.getElementById('location');

// Historical Weather Elements
const historicalContentEl = document.getElementById('historicalContent');

// Marine Weather Elements
const waveHeightEl = document.getElementById('waveHeight');
const seaTemperatureEl = document.getElementById('seaTemperature');
const marineWindSpeedEl = document.getElementById('marineWindSpeed');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set current date/time
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Event Listeners
    searchBtn.addEventListener('click', handleSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
});

/**
 * Update current date and time display
 */
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    currentDateEl.textContent = now.toLocaleDateString('en-US', options);
}

/**
 * Handle search button click
 */
async function handleSearch() {
    const cityName = cityInput.value.trim();
    
    if (!cityName) {
        showError('Please enter a city name or country');
        return;
    }

    // Hide previous results and errors
    hideAllCards();
    hideError();
    
    // Show loading state
    showLoading();
    disableSearch(true);

    try {
        // Step 1: Geocode city name to get coordinates
        const coordinates = await geocodeCity(cityName);
        
        if (!coordinates) {
            throw new Error('City not found. Please check the spelling and try again.');
        }

        // Step 2: Fetch all weather data in parallel
        const [currentData, historicalData, marineData] = await Promise.all([
            fetchCurrentWeather(coordinates.latitude, coordinates.longitude),
            fetchHistoricalWeather(coordinates.latitude, coordinates.longitude),
            fetchMarineWeather(coordinates.latitude, coordinates.longitude)
        ]);

        // Step 3: Display all data
        displayCurrentWeather(currentData, coordinates);
        displayHistoricalWeather(historicalData);
        
        // Only show marine weather if data is available
        if (marineData && marineData.waveHeight !== null) {
            displayMarineWeather(marineData);
        }

    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError(error.message || 'Failed to fetch weather data. Please try again.');
    } finally {
        hideLoading();
        disableSearch(false);
    }
}

/**
 * Geocode city name to get coordinates
 * @param {string} cityName - Name of the city or country
 * @returns {Promise<Object|null>} - Object with latitude and longitude, or null if not found
 */
async function geocodeCity(cityName) {
    try {
        const url = `${GEOCODING_API_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Geocoding API request failed');
        }

        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            return null;
        }

        const result = data.results[0];
        return {
            latitude: result.latitude,
            longitude: result.longitude,
            name: result.name,
            country: result.country,
            admin1: result.admin1 || ''
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        throw new Error('Failed to find location. Please check your internet connection.');
    }
}

/**
 * Fetch current weather data
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} - Current weather data
 */
async function fetchCurrentWeather(latitude, longitude) {
    try {
        const url = `${API_BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure&timezone=auto`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Current weather API request failed');
        }

        const data = await response.json();
        return data.current;
    } catch (error) {
        console.error('Current weather fetch error:', error);
        throw new Error('Failed to fetch current weather data.');
    }
}

/**
 * Fetch historical weather data (past 7 days)
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} - Historical weather data
 */
async function fetchHistoricalWeather(latitude, longitude) {
    try {
        // Calculate date range (past 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const url = `${API_BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&start_date=${startDateStr}&end_date=${endDateStr}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Historical weather API request failed');
        }

        const data = await response.json();
        return data.daily;
    } catch (error) {
        console.error('Historical weather fetch error:', error);
        throw new Error('Failed to fetch historical weather data.');
    }
}

/**
 * Fetch marine weather data
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object|null>} - Marine weather data or null if not available
 */
async function fetchMarineWeather(latitude, longitude) {
    try {
        const url = `${API_BASE_URL}/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,sea_surface_temperature,wind_wave_height&timezone=auto`;
        const response = await fetch(url);
        
        if (!response.ok) {
            // Marine data might not be available for all locations
            return null;
        }

        const data = await response.json();
        
        // Get the most recent data point
        if (data.hourly && data.hourly.wave_height && data.hourly.wave_height.length > 0) {
            const index = data.hourly.wave_height.length - 1;
            return {
                waveHeight: data.hourly.wave_height[index],
                seaTemperature: data.hourly.sea_surface_temperature[index],
                windSpeed: data.hourly.wind_wave_height[index]
            };
        }
        
        return null;
    } catch (error) {
        console.error('Marine weather fetch error:', error);
        // Return null instead of throwing - marine data is optional
        return null;
    }
}

/**
 * Get weather condition description from weather code
 * @param {number} code - Weather code from API
 * @returns {string} - Human-readable weather condition
 */
function getWeatherCondition(code) {
    const weatherCodes = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    
    return weatherCodes[code] || 'Unknown';
}

/**
 * Display current weather data
 * @param {Object} data - Current weather data from API
 * @param {Object} location - Location information
 */
function displayCurrentWeather(data, location) {
    temperatureEl.textContent = Math.round(data.temperature_2m);
    weatherConditionEl.textContent = getWeatherCondition(data.weather_code);
    humidityEl.textContent = `${data.relative_humidity_2m}%`;
    windSpeedEl.textContent = `${Math.round(data.wind_speed_10m)} km/h`;
    pressureEl.textContent = `${Math.round(data.surface_pressure)} hPa`;
    
    const locationName = location.admin1 
        ? `${location.name}, ${location.admin1}, ${location.country}`
        : `${location.name}, ${location.country}`;
    locationEl.textContent = locationName;
    
    currentWeatherCard.style.display = 'block';
}

/**
 * Display historical weather data
 * @param {Object} data - Historical weather data from API
 */
function displayHistoricalWeather(data) {
    if (!data || !data.time || data.time.length === 0) {
        return;
    }

    historicalContentEl.innerHTML = '';
    
    // Display last 7 days (excluding today if it's in the array)
    const daysToShow = Math.min(7, data.time.length);
    
    for (let i = 0; i < daysToShow; i++) {
        const date = new Date(data.time[i]);
        const maxTemp = Math.round(data.temperature_2m_max[i]);
        const minTemp = Math.round(data.temperature_2m_min[i]);
        const condition = getWeatherCondition(data.weather_code[i]);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'historical-day';
        dayElement.innerHTML = `
            <div class="historical-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <div class="historical-temp">${maxTemp}°</div>
            <div class="historical-condition">${condition}</div>
        `;
        
        historicalContentEl.appendChild(dayElement);
    }
    
    historicalWeatherCard.style.display = 'block';
}

/**
 * Display marine weather data
 * @param {Object} data - Marine weather data from API
 */
function displayMarineWeather(data) {
    if (!data) {
        return;
    }
    
    waveHeightEl.textContent = data.waveHeight !== null 
        ? `${data.waveHeight.toFixed(1)} m` 
        : 'N/A';
    seaTemperatureEl.textContent = data.seaTemperature !== null 
        ? `${Math.round(data.seaTemperature)}°C` 
        : 'N/A';
    marineWindSpeedEl.textContent = data.windSpeed !== null 
        ? `${data.windSpeed.toFixed(1)} m` 
        : 'N/A';
    
    marineWeatherCard.style.display = 'block';
}

/**
 * Show loading indicator
 */
function showLoading() {
    loadingIndicator.style.display = 'block';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.style.display = 'none';
}

/**
 * Hide all weather cards
 */
function hideAllCards() {
    currentWeatherCard.style.display = 'none';
    historicalWeatherCard.style.display = 'none';
    marineWeatherCard.style.display = 'none';
}

/**
 * Enable/disable search button
 * @param {boolean} disabled - Whether to disable the button
 */
function disableSearch(disabled) {
    searchBtn.disabled = disabled;
    if (disabled) {
        searchBtn.querySelector('.btn-text').style.display = 'none';
        searchBtn.querySelector('.btn-loader').style.display = 'inline';
    } else {
        searchBtn.querySelector('.btn-text').style.display = 'inline';
        searchBtn.querySelector('.btn-loader').style.display = 'none';
    }
}
