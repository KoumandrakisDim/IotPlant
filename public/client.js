eventListeners();
let userId = '';
let devices = [];

let devicesChart;
let originalData = []; // Your initial data
const targetPoints = 50;
let socket;

var chartLoaded = false;
let device = {};
let predictedMoistureChart;
let predictedMoistureChartLoaded = false;

const profileController = new ProfileController();
const profileView = new ProfileView();
let fetchDataInterval;

function eventListeners() {
  document.getElementById('loginButton').addEventListener('click', function () {
    event.preventDefault();
    login();
  });
  document.getElementById('registerButton').addEventListener('click', function () {
    event.preventDefault();
    register();
  });
  document.getElementById('addDevice').addEventListener('click', newDeviceShowModal);
  document.getElementById('saveNewDevice').addEventListener('click', newDevice);

  const timeWindowRadios = document.getElementsByName('timeWindowRadio');

  // Attach an event listener to each radio button
  for (const radio of timeWindowRadios) {
    radio.addEventListener('change', changeTimeWindow);
  }
  document.getElementById('predictMoistureButton').addEventListener('click', getPredictedMoisture);

}
async function login() {
  let response = await profileController.loginAjax(document.getElementById('username').value, document.getElementById('password').value);
  console.log(response)
  userId = response.userId;
  let userDevices = await getDevices(userId);
  userDevices.forEach(function (device) {
    document.getElementById('devicesContainer').appendChild(createDevicesList(device));
  })
  if (userDevices[0]) {
    getDeviceData(userDevices[0].device_id, 'realTime', true);
    device = userDevices[0];
  }

  showContainer('dashboard');
  document.getElementById('main').classList.remove('d-none');
  $('#loginContainer').hide();
  profileView.user = response.user;


  fillUserProfileData(response.user);
  socket = io('http://localhost:' + response.port);

}

async function fillUserProfileData(data) {
  $('#city').val(data.city);
  document.getElementById('usernameView').value = data.username;
  document.getElementById('useWeatherButton').checked = data.useWeather;
  profileView.toggleUseWeatherButton();
  document.getElementById('realTimeTimeWindow').checked = true;
  if (data.useWeather) {
    let weatherData = await profileController.getWeatherData(profileView.user);
    $('#weatherContainer').html(null);
    document.getElementById('weatherContainer').appendChild(profileView.addWeatherCards(weatherData));
    saveDailyWeatherData(weatherData);
    getPredictedMoisture();
  }
}
function logout() {
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

function register() {
  if (document.getElementById('usernameRegister').value.length > 0 &&
    document.getElementById('passwordRegister').value.length > 0) {
    registerAjax(document.getElementById('usernameRegister').value,
      document.getElementById('passwordRegister').value, document.getElementById('deviceId').value);

  } else {
    document.getElementById('form').classList.add('was-validated');
  }
}
function registerAjax(username, password, deviceId) {
  return new Promise(function (resolve, reject) {
    // Use jQuery's AJAX function
    $.ajax({
      url: '/register',
      method: 'POST',
      data: { username: username, password: password, device_id: deviceId },
      success: function (response) {
        userId = response.userId;
        getDevices();
        document.getElementById('usernameView').value = username;
        showContainer('dashboard');

        document.getElementById('main').classList.remove('d-none');
        document.getElementById('loginContainer').style.display = 'none';

        resolve(response);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        // Reject the promise with an error message
        reject(errorThrown);
      }
    });
  });
}
function showContainer(id) {
  const containers = document.querySelectorAll('.fileContainer');
  containers.forEach(function (container) {
    container.style.display = 'none';
  })
  document.getElementById(id).style.display = 'block';
}
function loadPage(url) {
  fetch(url)
    .then(response => response.text())
    .then(html => {
      document.getElementById('main-content').innerHTML = html;
    })
    .catch(error => console.error('Error loading page:', error));
}
function getDevices(userId) {
  return new Promise(function (resolve, reject) {
    // Use jQuery's AJAX function
    $.ajax({
      url: `/user/${userId}/devices`, // Adjust the URL to match your server route
      method: 'GET',
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
/**
 * 
 * @param {*} id 
 * @returns 
 */
function getDeviceData(id, timeWindow, isFirstCall) {
  if (!timeWindow) {
    timeWindow = 'realTime';
  }
  return new Promise(function (resolve, reject) {
    // Use jQuery's AJAX function
    $.ajax({
      url: `/api/getSensorData/${id}`, // Adjust the URL to match your server route
      method: 'POST',
      data: { timeWindow: timeWindow, isFirstCall: isFirstCall },
      success: function (response) {
        originalData = response;
        if (!chartLoaded) {
          loadChart(response);
          chartLoaded = true;
        }
        if (timeWindow === 'realTime') {
          enableDataTransmission();
          fetchDataInterval = setInterval(changeTimeWindow, 10000);

        } else {
          console.log(timeWindow)
          disableDataTransmission();
          clearInterval(fetchDataInterval);

        }
        resolve(response);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        // Reject the promise with an error message
        reject(errorThrown);
      }
    });

  });
}
// function fetchSensorData(){
  
// }
/**
 * 
 * @param {*} data 
 */
function loadChart(data) {
  let labels = [];
  let graphData = [];
  let filteredData = filterSensorData(data);

  filteredData.forEach(function (deviceData) {
    labels.push(formatDateString(deviceData.timestamp));
    graphData.push(deviceData.value);
    devices = data;
  })

  const ctx = document.getElementById('devicesChart');
  // const filteredData = graphData.filter((point, index) => index % n === 0);
  devicesChart = new Chart(ctx, {
    type: 'line',

    data: {
      labels: labels, // Initial X-axis labels
      datasets: [{
        label: 'Moisture Level',
        data: graphData, // Initial moisture values
        borderWidth: 1,
      }],
    },
    options: {
      scales: {
        x: {
          display: false,
          ticks: {
            stepSize: 10 // Adjust the limit as needed
          }
        },
        y: {
          min: 0,    // Set the minimum value for the Y-axis
          max: 101,  // Set the maximum value for the Y-axis
          ticks: {
            stepSize: 1  // Set the step size between ticks (optional)
          },
          title: {
            display: true,
            text: 'Moisture Level',
          },
        },
      },
      animation: {
        duration: 0, // Set animation duration to 0 for no animation
      },
      animations: {
        tension: {
          duration: 1000,
          easing: 'linear',
        }
      },
    },
  });


}
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

// Function to get the dates of the next 13 days
function getNext13Days() {
  const dates = [];
  let currentDate = new Date();

  for (let i = 0; i < 6; i++) {
    currentDate.setDate(currentDate.getDate() + 1);
    dates.push(formatDate(currentDate));
  }

  return dates;
}
function loadPredictedMoistureChart(data) {

  // data = data.predictedMoisture;
  let labels = [];
  let graphData = [];
  // let filteredData = filterSensorData(data);

  // let array = filterArray(data);

  // array.forEach(function (deviceData) {
  //   labels.push(formatDateString(deviceData.timestamp));
  //   graphData.push(deviceData.value);
  //   devices = data;
  // })
  let dates = getNext13Days();

  const ctx = document.getElementById('predictedMoistureChart');
  // const filteredData = graphData.filter((point, index) => index % n === 0);

  predictedMoistureChart = new Chart(ctx, {
    type: 'line',
    data: {
      title: 'hi',
      labels: dates, // Initial X-axis labels
      datasets: [{
        label: 'Predicted Moisture',
        // data: array, // Initial moisture values
        borderWidth: 1,
      }],
    },
    options: {
      scales: {
        x: {
          display: true,
          ticks: {
            stepSize: 10 // Adjust the limit as needed
          }
        },
        y: {
          min: 0,    // Set the minimum value for the Y-axis
          max: 101,  // Set the maximum value for the Y-axis
          ticks: {
            stepSize: 1  // Set the step size between ticks (optional)
          },
          title: {
            display: true,
            text: 'Moisture Level',
          },
        },
      },
      animation: {
        duration: 1000, // Set animation duration to 0 for no animation
      },
      animations: {
        tension: {
          duration: 1000,
          easing: 'linear',
        }
      },
    },
  });
  $('#predictionChartLoadingIcon').hide();


}
function updatePredictionChart(data) {
  console.log(data)
  // data = filterArray(data.predictedMoisture);
  // Remove newline characters
  const cleanedDataString = data.predictedMoisture.replace(/\r?\n|\r/g, '');

  // Parse the string into an object
  const dataObject = JSON.parse(cleanedDataString);

  console.log(cleanedDataString)
  console.log(dataObject)

  // Extract the predictedMoisture array
  // const predictedMoistureArray = JSON.parse(dataObject);

  predictedMoistureChart.data.datasets[0].data = dataObject;
  predictedMoistureChart.update();
  $('#predictionChartLoadingIcon').hide();

}
function filterSensorData(data) {
  console.log(data)
  if (getSelectedValueRadio('timeWindowRadio') === 'realTime') {
    return data;
  }
  else {
    return downsampleTimeSeries(data, 50);
  }

}
function enableDataTransmission() {
  // Listen for 'moistureUpdate' events from the server
  socket.on('moistureUpdate', (moistureData) => {
    // Assuming devicesChart is already initialized
    addRealTimeDataToChart(moistureData);
  });
}
function disableDataTransmission() {

  // Remove the 'moistureUpdate' event listener
  socket.off('moistureUpdate');
}

function deleteDevice(id) {
  $.ajax({
    url: `/devices/delete/${id}`,
    method: 'DELETE',
    success: function (response) {
      console.log('deleted successfully');
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error('Error during logout:', errorThrown);
      // Handle the error if needed
    }
  });
}

function createDevicesList(device) {
  const div = document.createElement('div');
  div.className = 'card col-6';

  const idlabel = document.createElement('label');
  const statuslabel = document.createElement('label');
  idlabel.innerText = 'Id';
  statuslabel.innerText = 'Status';
  const namelabel = document.createElement('label');
  namelabel.innerText = 'Name';

  const idInput = document.createElement('input');
  const statusInput = document.createElement('input');
  const nameInput = document.createElement('input');
  nameInput.setAttribute('disabled', true);
  nameInput.value = device.name || device.device_name; // Adjust property name accordingly

  idInput.setAttribute('disabled', true);
  statusInput.setAttribute('disabled', true);
  idInput.value = device.device_id || device._id; // Adjust property name accordingly
  statusInput.value = device.status || 'Ok';

  const deleteButton = document.createElement('i');
  deleteButton.className = 'bi bi-trash text-danger littleTrash';
  deleteButton.style.float = 'right';
  deleteButton.addEventListener('click', function () {
    deleteDevice(device.device_id || device._id); // Adjust property name accordingly
    div.remove();
  })

  div.appendChild(deleteButton);
  div.appendChild(namelabel);
  div.appendChild(nameInput);

  div.appendChild(idlabel);
  div.appendChild(idInput);

  // Uncomment the following lines if needed
  div.appendChild(statuslabel);
  div.appendChild(statusInput);

  return div;
}

function toggleRegister(id) {
  event.preventDefault();
  if (id === 'login') {
    document.getElementById('loginPage').classList.remove('d-none');
    document.getElementById('registerPage').classList.add('d-none');

  } else {
    document.getElementById('loginPage').classList.add('d-none');
    document.getElementById('registerPage').classList.remove('d-none');
  }
}


function newDeviceShowModal() {
  $('#newDeviceModal').modal('show');
}
function newDevice() {
  const newDeviceId = document.getElementById('newDeviceId').value;
  if (newDeviceId.length > 0) {
    createDeviceAjax({ device_id: newDeviceId, name: document.getElementById('newDeviceName').value });
  }
}
function createDeviceAjax(data) {
  return new Promise(function (resolve, reject) {
    // Use jQuery's AJAX function
    $.ajax({
      url: `/devices/create`, // Adjust the URL to match your server route
      method: 'POST',
      data: data,
      success: function (response) {
        $('#newDeviceModal').modal('hide');
        document.getElementById('devicesContainer').appendChild(createDevicesList(data));
        resolve(response);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        // Reject the promise with an error message
        reject(errorThrown);
      }
    });
  });
}
function addRealTimeDataToChart(newValue) {
  let date = new Date();
  let fomattedDate = formatDateString(date);

  let values = devicesChart.data.datasets[0].data;
  let labels = devicesChart.data.labels;
  values.shift();
  values.push(newValue);
  labels.shift();
  labels.push(fomattedDate);

  // Update the chart
  devicesChart.update();
}

function updateChart(data, timeWindow) {

  if (timeWindow !== 'realTime') {
    data = filterSensorData(data);
  }
  console.log(timeWindow)
  const valuesArray = data.map(obj => obj.value);
  let labelsArray = data.map(obj => obj.timestamp);
  labelsArray = labelsArray.map(formatDateString);

  devicesChart.data.datasets[0].data = valuesArray;
  devicesChart.data.labels = labelsArray;

  devicesChart.update();
}

// Function to process the WebSocket data and update the chart
function processMoistureData(chart, moistureData) {
  // Process the moisture data and update the chart labels and data
  const labels = chart.data.labels;
  const data = chart.data.datasets[0].data;

  // Assuming you want to add the new moistureData to the chart
  labels.push(new Date().toLocaleTimeString()); // Assuming time-based labels
  data.push(moistureData);

  // Keep a maximum number of data points (adjust as needed)
  const maxDataPoints = 10;
  if (labels.length > maxDataPoints) {
    labels.shift();
    data.shift();
  }

  // Return the updated labels and data
  return { labels, data };
}

async function changeTimeWindow() {
  let timeWindow = getSelectedValueRadio('timeWindowRadio');
  let data = await getDeviceData(device.device_id, timeWindow);

  updateChart(data, timeWindow);
}

function predictMoisture(data) {
  return new Promise(function (resolve, reject) {
    // Use jQuery's AJAX function
    $.ajax({
      url: `/api/predictMoisture`,
      method: 'POST',
      data: { data: data },
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

async function getPredictedMoisture() {
  $('#predictionChartLoadingIcon').show();
  predictedMoistureChart.data.datasets[0].data = [];
  predictedMoistureChart.update();

  let predictedMoisture = await profileController.getPredictedMoisture();
  console.log(predictedMoisture)
  // if(predictedMoistureChart){
  //   predictedMoistureChart.destroy();
  // }
  // loadPredictedMoistureChart(predictedMoisture);

  // if (!predictedMoistureChartLoaded) {
  //   loadPredictedMoistureChart(predictedMoisture);
  //   predictedMoistureChartLoaded = true;

  // } else {
  updatePredictionChart(predictedMoisture);
  // }

}
loadPredictedMoistureChart();
