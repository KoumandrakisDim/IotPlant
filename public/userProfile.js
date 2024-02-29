$('#useWeatherButton').on('click', () => profileView.toggleUseWeatherButton());
$('#getUserLocationButton').on('click', () => profileView.getLocation());
$('#saveProfileButton').on('click', () => profileView.saveProfile());

class ProfileView {


    user = {};

    getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(profileView.showPosition);
        } else {
            // Geolocation is not supported by this browser
        }
    }
    async showPosition(position) {
        profileView.user.latitude = position.coords.latitude;
        profileView.user.longitude = position.coords.longitude;


        let weatherData = await profileController.getWeatherData(profileView.user);
        $('#city').val(weatherData.city.name);
        $('#userLocationLabelContainer').show();
        $('#userLocationLabel').val(weatherData.name);

    }
    toggleUseWeatherButton() {
        if (document.getElementById('useWeatherButton').checked) {
            $('#weatherFieldsContainer').show();

        } else {
            $('#weatherFieldsContainer').hide();

        }
    }

    addWeatherCards(data) {

        const div = document.createElement('div');
        div.className = 'row p-3';
        data = filterWeatherVariables(data.list);
        console.log(data)
        // Assuming data.list is an array of forecast data
        if (data) {
            // Iterate over the first 7 items (assuming daily forecast data is available)
            for (let i = 0; i < 6; i++) {
                const forecast = data[i];
                const card = profileView.createWeatherCard(forecast);
                div.appendChild(card);
            }
        }
        return div;
    }

    createWeatherCard(forecast) {
        console.log(forecast)
        const card = document.createElement('div');
        card.classList.add('col-4', 'col-lg-2', 'p-2');

        // Extract relevant information from the forecast object
        // const date = new Date(forecast.dt * 1000); // Convert timestamp to date
        const temperature = forecast.temp;
        let iconUrl = profileView.getWeatherIconUrl(forecast);
        // Create HTML structure for the card
        card.innerHTML = `<div class="weather-card p-2">
            <div class="card-header">${forecast.date}</div>
            <div class="card-body">
                <p> ${Number(temperature.toFixed(2))} °C</p>
                <div class='d-flex justify-content-center'>
                    <img class='weatherIcon' src=${iconUrl}>
                </div>
                <p> Humidity: ${Number(forecast.humidity.toFixed(2))} %</p>
                <p> Wind: ${Number(forecast.windSpeed.toFixed(2))} km/h</p>
            </div>
            </div>
        `;

        return card;
    }

    getWeatherIconUrl(data) {
        let description = data.description[0];
        let iconCode = data.icon[0];
        let isDaytime = profileView.isDaytimeIcon(iconCode);
        let clearSkyIcon;
        let scatteredCloudsIcon;

        // if (isDaytime) {
            clearSkyIcon = 'assets/weatherIcons/sun.png';
            scatteredCloudsIcon = 'assets/weatherIcons/day_partial_cloud.png';
        // } else {
        //     clearSkyIcon = 'assets/weatherIcons/night_half_moon_clear.png';
        //     scatteredCloudsIcon = 'assets/weatherIcons/night_full_moon_partial_cloud.png';

        // }

        if (data) {

        }
        switch (description) {
            case 'scattered clouds':
                return scatteredCloudsIcon;
            case 'broken clouds':
                return scatteredCloudsIcon;
            case 'few clouds':
                return scatteredCloudsIcon;
            case 'clear sky':
                return clearSkyIcon;

            case 'overcast clouds':
                return 'assets/weatherIcons/cloudy.png';
            case 'light rain':
                return 'assets/weatherIcons/day_rain.png';

            default:
                return clearSkyIcon;
        }
    }
    isDaytimeIcon(iconCode) {
        // Extract the last character of the icon code to determine day or night
        const lastCharacter = iconCode.charAt(iconCode.length - 1);
        return lastCharacter === 'd'; // 'd' indicates daytime, 'n' indicates nighttime
    }
    formatDate(date) {
        const options = { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }


    async saveProfile() {
        const data = {
            id: userId, username: $('#usernameView').val(), city: $('#city').val(),
            useWeather: document.getElementById('useWeatherButton').checked
        };

        if (data.useWeather) {
            try {
                let weatherData = await profileController.getWeatherData(data);
                $('#weatherContainer').html(null);

                document.getElementById('weatherContainer').appendChild(profileView.addWeatherCards(weatherData));
            } catch {
                showAlert('alert', 'City not found');
            }

        } else {
            $('#weatherContainer').html(null);
        }
        try {
            await profileController.saveProfile(data);
            showContainer('dashboard');
            getPredictedMoisture();
        } catch {
            return;
        }
    };


}
