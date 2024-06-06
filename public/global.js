/**
 * 
 * @param {*} dateString 
 * @returns 
 */
function formatDateString(dateString) {
    const date = new Date(dateString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
/**
 * 
 * @param {*} point1 
 * @param {*} point2 
 * @param {*} fraction 
 * @returns 
 */
function interpolateDate(point1, point2, fraction) {
    const timestamp1 = new Date(point1.timestamp).getTime();
    const timestamp2 = new Date(point2.timestamp).getTime();

    const interpolatedTimestamp = timestamp1 + fraction * (timestamp2 - timestamp1);
    const interpolatedDate = new Date(interpolatedTimestamp);

    return {
        timestamp: interpolatedDate.toISOString(), // Convert back to a string if needed
        moisture: point1.moisture + fraction * (point2.moisture - point1.moisture),
        humidity: point1.humidity + fraction * (point2.humidity - point1.humidity),
        temperature: point1.temperature + fraction * (point2.temperature - point1.temperature)
    };
}
/**
 * 
 * @param {*} originalData 
 * @param {*} targetPoints 
 * @returns 
 */
function downsampleTimeSeries(originalData, targetPoints) {


    console.log(targetPoints)
    if (!originalData || originalData.length === 0 || targetPoints <= 0) {
        return []; // Return an empty array if input is invalid
    }

    if (originalData.length <= targetPoints) {
        return originalData; // No downsampling needed
    }

    const ratio = originalData.length / targetPoints;
    const downsampledData = [];

    for (let i = 0; i < targetPoints; i++) {
        const index = Math.floor(i * ratio);
        const fraction = i * ratio - index;

        const interpolatedPoint = interpolateDate(originalData[index], originalData[index + 1], fraction);
        downsampledData.push(interpolatedPoint);
    }

    console.log(downsampledData);
    return downsampledData;
}

/**
 * 
 * @param {*} labels 
 * @param {*} data 
 * @returns 
 */
function combineArrays(labels, data) {
    const combinedArray = [];

    // Assuming labels and data arrays have the same length
    for (let i = 0; i < labels.length; i++) {
        combinedArray.push({ timestamp: labels[i], value: data[i] });
    }

    return combinedArray;
}

function getSelectedValueRadio(name) {
    let timeWindowButtons = document.querySelectorAll('.timeWindowButton');

    timeWindowButtons.forEach(function (button) {
        if (button.classList.contains('selectedTimeWindow')) {
            console.log(button.getAttribute('value'))
            return button.getAttribute('value');
        }
    })
}
/**
 * 
 * @param {*} alertId 
 * @param {*} alertText 
 * @param {*} className 
 */
function showAlert(alertId, alertText, className) {
    let alert = document.getElementById(alertId);
    alert.innerText = alertText;
    alert.style.opacity = 1;
    alert.style.zIndex = 1000;

    setTimeout(() => {
        alert.style.opacity = 0;
        setTimeout(() => {
            alert.style.zIndex = 0;

        }, "500");
    }, "2000");
}

// Assume the OpenWeatherMap API returns data in the format you provided earlier
// Modify this function based on the actual structure of the data returned by the API
function filterTodayWeather(data) {
    // const todayDateString = new Date().toISOString().split('T')[0];
    // const city = data.city;
    // const todayWeatherData = data.list.filter(entry => {
    //     const entryDateString = new Date(entry.dt * 1000).toISOString().split('T')[0];
    //     return entryDateString === todayDateString;
    // });
    const todayWeatherData = data.daily[0];
    const lat = data.lat;
    const lon = data.lon;

    return { lat, lon, todayWeatherData };
}

// Assume the OpenWeatherMap API returns data in the format you provided earlier
// Modify this function based on the actual structure of the data returned by the API
function weatherDataToJSON(data) {
    let jsonData = [];
    // data.todayWeatherData.forEach(entry => {
    let weatherData = {
        humidity: data.todayWeatherData.humidity, tempMin: data.todayWeatherData.temp.min,
        tempMax: data.todayWeatherData.temp.max, wind: data.todayWeatherData.wind_speed, dt: data.todayWeatherData.dt,
        poprecip: data.todayWeatherData.pop, rain: data.todayWeatherData.rain
    };
    jsonData.push(weatherData);
    // });
    return jsonData;
}

function saveDailyWeatherData(weatherData) {
    const currentDate = new Date();
    const currentDay = currentDate.toDateString(); // Extracting only the date without time

    // Check if the user has already saved weather data for the current day
    let savedWeatherData = JSON.parse(localStorage.getItem('weatherData')) || {};

    // if (!savedWeatherData[currentDay]) {
    // If not saved for the current day, save it
    const filteredData = filterTodayWeather(weatherData);
    savedWeatherData[currentDay] = filteredData;
    console.log(filteredData)

    // Save the updated weather data to localStorage
    localStorage.setItem('weatherData', JSON.stringify(savedWeatherData));
    console.log('Weather data saved for the day:', currentDay);

    // Prepare data to be sent to the server
    const finalData = {
        lon: filteredData.lon,
        lat: filteredData.lat,
        weatherData: weatherDataToJSON(filteredData),
    };

    profileController.saveDailyWeatherData(finalData);


    // } else {
    //     console.log('Weather data already saved for the day:', currentDay);
    //     return Promise.resolve('Weather data already saved for the day.');
    // }
}

function convertUnixTimestamp(timestamp) {
    // Convert Unix timestamp to milliseconds by multiplying by 1000
    const milliseconds = timestamp * 1000;

    // Create a new Date object using the milliseconds
    const dateObject = new Date(milliseconds);

    // Get day, month, and year from the date object
    const day = dateObject.getDate().toString().padStart(2, '0'); // Add leading zero if needed
    const month = (dateObject.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based
    const year = dateObject.getFullYear();

    // Return the formatted date string (dd/mm/yyyy)
    return `${day}/${month}/${year}`;
}
function filterWeatherVariables(hourlyForecast) {
    const dailyData = {};
    console.log(hourlyForecast)
    hourlyForecast.forEach(hourlyData => {
        const date = new Date(hourlyData.dt * 1000).toLocaleDateString('en-US');
        if (!dailyData[date]) {
            dailyData[date] = {
                temp: [],
                wind_speed: [],
                humidity: [],
                description: [],
                pop: [],
                icon: []
            };
        }
        dailyData[date].temp.push(hourlyData.main.temp);
        dailyData[date].wind_speed.push(hourlyData.wind.speed);
        dailyData[date].humidity.push(hourlyData.main.humidity);
        dailyData[date].description.push(hourlyData.weather[0].description);
        dailyData[date].pop.push(hourlyData.pop);

        dailyData[date].icon.push(hourlyData.weather[0].icon);

    });

    // Calculate average for each day
    const forecastData = [];

    for (const date in dailyData) {
        if (dailyData.hasOwnProperty(date)) {
            const tempSum = dailyData[date].temp.reduce((acc, curr) => acc + curr, 0);
            const windSpeedSum = dailyData[date].wind_speed.reduce((acc, curr) => acc + curr, 0);
            const humiditySum = dailyData[date].humidity.reduce((acc, curr) => acc + curr, 0);
            const popSum = dailyData[date].pop.reduce((acc, curr) => acc + curr, 0);

            const numDataPoints = dailyData[date].temp.length;
            const avgTemp = tempSum / numDataPoints;
            const avgWindSpeed = windSpeedSum / numDataPoints;
            const avgHumidity = humiditySum / numDataPoints;
            const avgPop = popSum / numDataPoints;

            forecastData.push({
                date: date,
                temp: avgTemp,
                windSpeed: avgWindSpeed,
                humidity: avgHumidity,
                description: dailyData[date].description,
                icon: dailyData[date].icon,
                pop: avgPop,

            });
        }
    }

    return forecastData;

}
function validateNumber(element, min, max) {
    const value = element.value;
    const regex = /^\d*\.?\d+$/;

    if (!regex.test(value)) {
        element.setCustomValidity('Invalid input: Please enter a valid number.');
        return false;
    }

    const numericValue = parseFloat(value);

    if (numericValue < min) {
        element.setCustomValidity('Invalid input: Please enter a number greater than ' + min + '.');
        return false;
    }
    if (numericValue > max) {
        element.setCustomValidity('Invalid input: Please enter a number less than ' + max + '.');
        return false;
    }

    element.setCustomValidity('');
    return true;
}

function validateInput(event, min, max) {
    const inputElement = event.target;
    validateNumber(inputElement, min, max);
    inputElement.reportValidity(); // This will show the custom validation message if the input is invalid
}
function isPhone() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

