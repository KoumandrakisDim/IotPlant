eventListeners();
let userId = '';
let devices = [];

let devicesChart;
let originalData = []; // Your initial data
const targetPoints = 50;
// let socket;

var chartLoaded = false;
let device = {};
let predictedMoistureChart;
let predictedMoistureChartLoaded = false;

const sensorController = new SensorController();
const deviceController = new DeviceController();
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

  userId = response.userId;
  let userDevices = await getDevices(userId);
  userDevices.forEach(function (device) {
    document.getElementById('devicesContainer').appendChild(createDevicesList(device));
  })
  if (userDevices[0]) {
    // sensorController.getDeviceData(userDevices[0].device_id, 'realTime', true);
    device = userDevices[0];
    changeTimeWindow(device.device_id, 'realTime');
  }

  showContainer('dashboard');
  document.getElementById('main').classList.remove('d-none');
  $('#loginContainer').hide();
  profileView.user = response.user;
  document.getElementById('toggleSaveSensorDataButton').checked = profileView.user.toggleSaveSensorData;

  fillUserProfileData(response.user);
  // socket = io('http://localhost:' + response.port);

}

async function fillUserProfileData(data) {
  $('#city').val(data.city);
  document.getElementById('usernameView').value = data.username;
  document.getElementById('useWeatherButton').checked = data.useWeather;
  profileView.toggleUseWeatherButton();
  document.getElementById('realTimeTimeWindow').checked = true;

  if (data.useWeather) {
    $('#predictionDiv').show();
    let weatherData = await profileController.getWeatherData(profileView.user);
    $('#weatherContainer').html(null);
    document.getElementById('weatherContainer').appendChild(profileView.addWeatherCards(weatherData));
    saveDailyWeatherData(weatherData);
    getPredictedMoisture();
  } else {
    $('#predictionDiv').hide();
  }
}

async function register() {
  if (document.getElementById('usernameRegister').value.length > 0 &&
    document.getElementById('passwordRegister').value.length > 0) {
    let response = await profileController.registerAjax(document.getElementById('usernameRegister').value,
      document.getElementById('passwordRegister').value, document.getElementById('deviceId').value);
    userId = response.userId;
    getDevices();
    document.getElementById('usernameView').value = username;
    showContainer('dashboard');

    document.getElementById('main').classList.remove('d-none');
    document.getElementById('loginContainer').style.display = 'none';

  } else {
    document.getElementById('form').classList.add('was-validated');
  }
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
  document.getElementById('predictedMoistureChart').style.opacity = 1;


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
  document.getElementById('predictedMoistureChart').style.opacity = 1;

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
    deviceController.deleteDevice(device.device_id || device._id); // Adjust property name accordingly
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
/**
 * 
 * @param {*} device_id 
 * @param {*} timeWindow 
 */
async function changeTimeWindow(device_id, timeWindow) {

  try {
    if (!timeWindow) {
      timeWindow = getSelectedValueRadio('timeWindowRadio');
    }
    let response = await sensorController.getDeviceData(device.device_id, timeWindow);
    originalData = response;
    if (!chartLoaded) {
      loadChart(response);
      chartLoaded = true;
    }
    if (timeWindow === 'realTime') {
      if (!fetchDataInterval && profileView.user.toggleSaveSensorData) {
        fetchDataInterval = setInterval(() => changeTimeWindow(null, timeWindow), 21000);
      }

    } else {
      clearInterval(fetchDataInterval);
      fetchDataInterval = null;
    }
    updateChart(response, timeWindow);
  } catch {
    showAlert('alert', 'Could not get sensor data');
  }

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
  document.getElementById('predictedMoistureChart').style.opacity = 0.5;

  predictedMoistureChart.data.datasets[0].data = [];
  predictedMoistureChart.update();
  let predictedMoisture;

  try {
    predictedMoisture = await profileController.getPredictedMoisture();

  } catch {
    showAlert('alert', 'Wrong username or password');
    return;
  }
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
