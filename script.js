// Weather App - Open-Meteo API Integration
// No API key required for non-commercial use

// API Configuration
const API_BASE_URL = 'https://api.open-meteo.com/v1';
const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// DOM Elements
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
const locationEl = document.getElementById('location');

// Search Elements
const currentSearch = document.getElementById('currentSearch');
const currentCityInput = document.getElementById('currentCityInput');
const currentSearchBtn = document.getElementById('currentSearchBtn');

const historicalSearch = document.getElementById('historicalSearch');
const historicalCityInput = document.getElementById('historicalCityInput');
const historicalSearchBtn = document.getElementById('historicalSearchBtn');
const historicalContentEl = document.getElementById('historicalContent');

const marineSearch = document.getElementById('marineSearch');
const marineCityInput = document.getElementById('marineCityInput');
const marineSearchBtn = document.getElementById('marineSearchBtn');

// Marine Weather Elements
const waveHeightEl = document.getElementById('waveHeight');
const seaTemperatureEl = document.getElementById('seaTemperature');
const marineEmptyState = document.getElementById('marineEmptyState');

// Track active card
let activeCard = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set current date/time
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Make cards clickable
    setupCardInteractions();
});

/**
 * Setup click interactions for weather cards
 */
function setupCardInteractions() {
    // Current Weather Card
    currentWeatherCard.addEventListener('click', (e) => {
        if (e.target.closest('.card-search')) return; // Don't trigger if clicking inside search
        toggleCardSearch('current');
    });
    
    currentSearchBtn.addEventListener('click', () => {
        const cityName = currentCityInput.value.trim();
        if (cityName) {
            fetchWeatherForCard('current', cityName);
        }
    });
    
    currentCityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const cityName = currentCityInput.value.trim();
            if (cityName) {
                fetchWeatherForCard('current', cityName);
            }
        }
    });

    // Historical Weather Card
    historicalWeatherCard.addEventListener('click', (e) => {
        if (e.target.closest('.card-search')) return;
        toggleCardSearch('historical');
    });
    
    historicalSearchBtn.addEventListener('click', () => {
        const cityName = historicalCityInput.value.trim();
        if (cityName) {
            fetchWeatherForCard('historical', cityName);
        }
    });
    
    historicalCityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const cityName = historicalCityInput.value.trim();
            if (cityName) {
                fetchWeatherForCard('historical', cityName);
            }
        }
    });

    // Marine Weather Card
    marineWeatherCard.addEventListener('click', (e) => {
        if (e.target.closest('.card-search')) return;
        toggleCardSearch('marine');
    });
    
    marineSearchBtn.addEventListener('click', () => {
        const cityName = marineCityInput.value.trim();
        if (cityName) {
            fetchWeatherForCard('marine', cityName);
        }
    });
    
    marineCityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const cityName = marineCityInput.value.trim();
            if (cityName) {
                fetchWeatherForCard('marine', cityName);
            }
        }
    });
}

/**
 * Toggle search input for a specific card
 * @param {string} cardType - Type of card ('current', 'historical', 'marine')
 */
function toggleCardSearch(cardType) {
    // Hide all search inputs first
    currentSearch.style.display = 'none';
    historicalSearch.style.display = 'none';
    marineSearch.style.display = 'none';
    
    // Remove active state from all cards
    currentWeatherCard.classList.remove('active');
    historicalWeatherCard.classList.remove('active');
    marineWeatherCard.classList.remove('active');
    
    // Show search for clicked card
    if (cardType === 'current') {
        currentSearch.style.display = 'flex';
        currentWeatherCard.classList.add('active');
        currentCityInput.focus();
        activeCard = 'current';
    } else if (cardType === 'historical') {
        historicalSearch.style.display = 'flex';
        historicalWeatherCard.classList.add('active');
        historicalCityInput.focus();
        activeCard = 'historical';
    } else if (cardType === 'marine') {
        marineSearch.style.display = 'flex';
        marineWeatherCard.classList.add('active');
        marineCityInput.focus();
        activeCard = 'marine';
    }
}

/**
 * Fetch weather data for a specific card type
 * @param {string} cardType - Type of card ('current', 'historical', 'marine')
 * @param {string} cityName - Name of the city to search
 */
async function fetchWeatherForCard(cardType, cityName) {
    hideError();
    showLoading();
    
    try {
        // Geocode city name
        const coordinates = await geocodeCity(cityName);
        
        if (!coordinates) {
            throw new Error('City not found. Please check the spelling and try again.');
        }

        if (cardType === 'current') {
            const currentData = await fetchCurrentWeather(coordinates.latitude, coordinates.longitude);
            displayCurrentWeather(currentData, coordinates);
            currentSearch.style.display = 'none';
            currentWeatherCard.classList.remove('active');
        } 
        else if (cardType === 'historical') {
            const historicalData = await fetchHistoricalWeather(coordinates.latitude, coordinates.longitude);
            displayHistoricalWeather(historicalData);
            historicalSearch.style.display = 'none';
            historicalWeatherCard.classList.remove('active');
        } 
        else if (cardType === 'marine') {
            const marineData = await fetchMarineWeather(coordinates.latitude, coordinates.longitude);
            if (marineData && marineData.waveHeight !== null) {
                displayMarineWeather(marineData);
                marineEmptyState.style.display = 'none';
            } else {
                showError('Marine weather data not available for this location. Please try a coastal city.');
                marineEmptyState.style.display = 'block';
            }
            marineSearch.style.display = 'none';
            marineWeatherCard.classList.remove('active');
        }

    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError(error.message || 'Failed to fetch weather data. Please try again.');
    } finally {
        hideLoading();
    }
}

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
        const url = `${API_BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
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
        const url = `${API_BASE_URL}/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,sea_surface_temperature&timezone=auto`;
        const response = await fetch(url);
        
        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        
        // Get the most recent data point
        if (data.hourly && data.hourly.wave_height && data.hourly.wave_height.length > 0) {
            const index = data.hourly.wave_height.length - 1;
            return {
                waveHeight: data.hourly.wave_height[index],
                seaTemperature: data.hourly.sea_surface_temperature[index]
            };
        }
        
        return null;
    } catch (error) {
        console.error('Marine weather fetch error:', error);
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
    
    const locationName = location.admin1 
        ? `${location.name}, ${location.admin1}, ${location.country}`
        : `${location.name}, ${location.country}`;
    locationEl.textContent = locationName;
}

/**
 * Display historical weather data
 * @param {Object} data - Historical weather data from API
 */
function displayHistoricalWeather(data) {
    if (!data || !data.time || data.time.length === 0) {
        historicalContentEl.innerHTML = '<div class="empty-state"><p>No historical data available</p></div>';
        return;
    }

    historicalContentEl.innerHTML = '';
    
    // Display last 7 days
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
    
    marineEmptyState.style.display = 'none';
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
