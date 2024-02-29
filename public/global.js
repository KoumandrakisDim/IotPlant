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
function interpolateDate(point1, point2, fraction) {
    const timestamp1 = new Date(point1.timestamp).getTime();
    const timestamp2 = new Date(point2.timestamp).getTime();

    const interpolatedTimestamp = timestamp1 + fraction * (timestamp2 - timestamp1);
    const interpolatedDate = new Date(interpolatedTimestamp);

    return {
        timestamp: interpolatedDate.toISOString(), // Convert back to a string if needed
        value: point1.value + fraction * (point2.value - point1.value)
    };
}

function downsampleTimeSeries(originalData, targetPoints) {
    targetPoints = 70;

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


function combineArrays(labels, data) {
    const combinedArray = [];

    // Assuming labels and data arrays have the same length
    for (let i = 0; i < labels.length; i++) {
        combinedArray.push({ timestamp: labels[i], value: data[i] });
    }

    return combinedArray;
}

function getSelectedValueRadio(name) {
    // Get all radio buttons with the name 'gender'
    const genderRadios = document.getElementsByName(name);

    // Initialize a variable to store the selected value
    let selectedValue = null;

    // Loop through the radio buttons to find the selected one
    for (const radio of genderRadios) {
        if (radio.checked) {
            return selectedValue = radio.value;
        }
    }
    return '';
}

function showAlert(alertId, alertText) {
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
    const todayDateString = new Date().toISOString().split('T')[0];
    const city = data.city.name;

    const todayWeatherData = data.list.filter(entry => {
        const entryDateString = new Date(entry.dt * 1000).toISOString().split('T')[0];
        return entryDateString === todayDateString;
    });

    return { city, todayWeatherData };
}

// Assume the OpenWeatherMap API returns data in the format you provided earlier
// Modify this function based on the actual structure of the data returned by the API
function weatherDataToJSON(data) {
    let jsonData = [];
    data.todayWeatherData.forEach(entry => {
        let weatherData = { humidity: entry.main.humidity, temp: entry.main.temp, wind: entry.wind.speed, dt: entry.dt_text };
        jsonData.push(weatherData);
    });
    return jsonData;
}

function saveDailyWeatherData(weatherData) {
    const currentDate = new Date();
    const currentDay = currentDate.toDateString(); // Extracting only the date without time

    // Check if the user has already saved weather data for the current day
    let savedWeatherData = JSON.parse(localStorage.getItem('weatherData')) || {};

    if (!savedWeatherData[currentDay]) {
        // If not saved for the current day, save it
        const filteredData = filterTodayWeather(weatherData);
        savedWeatherData[currentDay] = filteredData;

        // Save the updated weather data to localStorage
        localStorage.setItem('weatherData', JSON.stringify(savedWeatherData));
        console.log('Weather data saved for the day:', currentDay);

        // Prepare data to be sent to the server
        const finalData = {
            city: filteredData.city,
            weatherData: weatherDataToJSON(filteredData),
        };

        return new Promise(function (resolve, reject) {
            // Use jQuery's AJAX function
            $.ajax({
                url: '/api/saveWeatherData',
                method: 'POST',
                data: { data: finalData },
                success: function (response) {
                    resolve(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle the error here
                    reject(errorThrown);
                    console.error('Error:', errorThrown);
                }
            });
        });
    } else {
        console.log('Weather data already saved for the day:', currentDay);
        return Promise.resolve('Weather data already saved for the day.');
    }
}

function filterWeatherVariables(hourlyForecast) {
    const dailyData = {};

    hourlyForecast.forEach(hourlyData => {
        const date = new Date(hourlyData.dt * 1000).toLocaleDateString('en-US');
        if (!dailyData[date]) {
            dailyData[date] = {
                temp: [],
                wind_speed: [],
                humidity: [],
                description: [],
                icon: []
            };
        }
        dailyData[date].temp.push(hourlyData.main.temp);
        dailyData[date].wind_speed.push(hourlyData.wind.speed);
        dailyData[date].humidity.push(hourlyData.main.humidity);
        dailyData[date].description.push(hourlyData.weather[0].description);
        dailyData[date].icon.push(hourlyData.weather[0].icon);

    });
    
    // Calculate average for each day
    const forecastData = [];
    
    for (const date in dailyData) {
        if (dailyData.hasOwnProperty(date)) {
            const tempSum = dailyData[date].temp.reduce((acc, curr) => acc + curr, 0);
            const windSpeedSum = dailyData[date].wind_speed.reduce((acc, curr) => acc + curr, 0);
            const humiditySum = dailyData[date].humidity.reduce((acc, curr) => acc + curr, 0);
            const numDataPoints = dailyData[date].temp.length;
            const avgTemp = tempSum / numDataPoints;
            const avgWindSpeed = windSpeedSum / numDataPoints;
            const avgHumidity = humiditySum / numDataPoints;
    
            forecastData.push({
                date: date,
                temp: avgTemp,
                windSpeed: avgWindSpeed,
                humidity: avgHumidity,
                description: dailyData[date].description,
                icon: dailyData[date].icon

            });
        }
    }
    
    return forecastData;
    
}