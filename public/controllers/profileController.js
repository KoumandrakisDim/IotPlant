class ProfileController {
    saveProfile(data) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: `/api/user/editProfile`, // Adjust the URL to match your server route
                method: 'POST',
                data: data,
                contentType: 'application/json',
                data: JSON.stringify({ data }),
                success: function (response) {
                    resolve(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Reject the promise with an error message
                    reject(errorThrown);
                }
            });
        });
    }
    getWeatherData(user) {
        return new Promise(function (resolve, reject) {
            // Use jQuery's AJAX function
            $.ajax({
                url: `/getWeather`,
                method: 'POST',
                data: { user: user },
                success: function (response) {
                    resolve(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle the error here
                    reject();
                    console.error('Error:', errorThrown);
                }
            });
        });
    }
}