class ProfileController {
  saveProfile(data) {
    return new Promise(function (resolve, reject) {
      $.ajax({
        url: `/api/user/editProfile`, // Adjust the URL to match your server route
        method: 'POST',
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
        contentType: 'application/json',
        data: JSON.stringify({ user }),
        success: function (response) {
          console.log(response)
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
  getPredictedMoisture() {
    // const apiKey = localStorage.getItem('apiKey');
    const apiKey = user.api_key;
    // Check if API key exists
    if (!apiKey) {
      // Reject the promise with an error message
      reject('API key is missing');
      return;
    }

    // Add the API key to the headers
    const headers = {
      'Authorization': `API_KEY ${apiKey}`
    };
    return new Promise(function (resolve, reject) {
      // Use jQuery's AJAX function
      $.ajax({
        url: `/api/predictMoisture`,
        method: 'GET',
        headers: headers,
        success: function (response) {
          console.log(response)
          resolve(response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          // Handle the error here
          reject();
        }
      });
    });
  }

  loginAjax(username, password) {

    return new Promise(function (resolve, reject) {
      // Use jQuery's AJAX function
      $.ajax({
        url: '/login',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username: username, password: password }),
        success: async function (response) {

          const apiKey = response.user.api_key;
          // Store the API key securely (e.g., in localStorage or sessionStorage)
          localStorage.setItem('apiKey', apiKey);

          resolve(response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          showAlert('alert', 'Wrong username or password');
          // Reject the promise with an error message
          reject(errorThrown);
        }
      });
    });
  }

  logout() {
    clearInterval(fetchDataInterval);
    $.ajax({
      url: '/logout',
      method: 'GET',
      success: function (response) {
        console.log('Logged out successfully');
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('main').classList.add('d-none');
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error('Error during logout:', errorThrown);
        // Handle the error if needed
      }
    });
  }

  registerAjax(username, password, deviceId) {
    return new Promise(function (resolve, reject) {
      // Use jQuery's AJAX function
      $.ajax({
        url: '/register',
        method: 'POST',
        data: { username: username, password: password, device_id: deviceId },
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

  saveDailyWeatherData (data) {
    return new Promise(function (resolve, reject) {
      // Use jQuery's AJAX function
      $.ajax({
        url: '/api/saveWeatherData',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ data }),
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
  }
}