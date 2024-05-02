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
const devicesView = new DevicesView();

let fetchDataInterval;
let user;

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

  $('#realTimeTimeWindowButton').on('click', () => selectTimeWindowClick('realTimeTimeWindowButton', 'realTime'));
  $('#hourTimeWindowButton').on('click', () => selectTimeWindowClick('hourTimeWindowButton', 'hour'));
  $('#dayTimeWindowButton').on('click', () => selectTimeWindowClick('dayTimeWindowButton', 'day'));
  $('#weekTimeWindowButton').on('click', () => selectTimeWindowClick('weekTimeWindowButton', 'week'));
  $('#monthTimeWindowButton').on('click', () => selectTimeWindowClick('monthTimeWindowButton', 'month'));
  $('#yearTimeWindowButton').on('click', () => selectTimeWindowClick('yearTimeWindowButton', 'year'));
  $(window).on('resize', function () {
    hideColumnsBasedOnScreenSize('devicesContainer');
    resizeGrid('devicesGrid', 'devicesContainer')
  });
}
function hideColumnsBasedOnScreenSize(parentId) {
  // let grid = $("#" + parentId).children().eq(0);
  //   var screenWidth = $(window).width();
  //   console.log(grid)
  // // Define your breakpoint for hiding columns (adjust as needed)
  // var breakpoint = 768; // For example, hide columns on screens smaller than 768px

  // // Get the jqGrid instance
  // var colModel = grid.jqGrid('getGridParam', 'colModel');

  // // Check the screen size and hide/show columns accordingly
  // if (screenWidth < breakpoint) {
  //   // Hide columns
  //   for (var i = 0; i < colModel.length; i++) {
  //     var colName = colModel[i].name;
  //     grid.hideCol(colName);
  //     console.log(colName)
  //     grid.closest(".ui-jqgrid-view").find("th[aria-describedby='" + grid[0].id + "_" + colName + "']").hide();
  //   }
  // } else {
  //   // Show columns
  //   for (var i = 0; i < colModel.length; i++) {
  //     var colName = colModel[i].name;
  //     grid.showCol(colName);
  //     grid.closest(".ui-jqgrid-view").find("th[aria-describedby='" + grid[0].id + "_" + colName + "']").show();
  //   }
  // }
}
function resizeGrid(id, parentId) {
  let grid = $("#" + parentId).children().eq(0);
  let newWidth = grid.parent().width(); // Use parent() to select the parent container and width() method to get its width
  $("#" + id).jqGrid("setGridWidth", newWidth, true);
}
function selectTimeWindowClick(timeWindowButton, timeWindow) {
  let timeWindowButtons = document.querySelectorAll('.timeWindowButton');
  timeWindowButtons.forEach(function (button) {
    button.classList.remove('selectedTimeWindow');
  })

  document.getElementById(timeWindowButton).classList.add('selectedTimeWindow');
  changeTimeWindow(device.device_id, timeWindow);
}
async function login() {
  let response = await profileController.loginAjax(document.getElementById('username').value, document.getElementById('password').value);

  userId = response.userId;
  let userDevices = await deviceController.getDevices(userId);
  deviceController.loadDevicesGrid(userId);
  user = response.user;
  devicesView.devices = userDevices;
  // $('#devicesContainer').html(null);

  // userDevices.forEach(function (device) {
  //   document.getElementById('devicesContainer').appendChild(createDevicesList(device));
  // })
  if (userDevices[0]) {
    // sensorController.getDeviceData(userDevices[0].device_id, 'realTime', true);
    device = userDevices[0];
    console.log(device)
    selectTimeWindowClick('realTimeTimeWindowButton', 'realTime');
  }

  showContainer('dashboard');
  document.getElementById('main').classList.remove('d-none');
  $('#loginContainer').hide();
  profileView.user = response.user;
  document.getElementById('toggleSaveSensorDataButton').checked = profileView.user.toggleSaveSensorData;

  fillUserProfileData(response.user);
  // socket = io('http://localhost:' + response.port);
  loadPredictedMoistureChart();



}

async function fillUserProfileData(data) {
  $('#city').val(data.city);
  document.getElementById('usernameView').value = data.username;
  document.getElementById('useWeatherButton').checked = data.useWeather;
  document.getElementById('toggleSmsNotifications').checked = data.smsNotifications;
  document.getElementById('phoneNumberInput').value = data.phoneNumber;

  profileView.toggleUseWeatherButton();
  // document.getElementById('realTimeTimeWindow').checked = true;
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
    // getDevices();
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

// function fetchSensorData(){

// }
/**
 * 
 * @param {*} data 
 */
function loadChart(data, device) {
  let labels = [];
  let graphDatamoisture = [];
  // let filteredData = filterSensorData(data);
  let graphDatatempterature = [];
  let graphDatahumidity = [];
  let filteredData = data;

  filteredData.forEach(function (deviceData) {

    labels.push(formatDateString(deviceData.timestamp));
    graphDatamoisture.push(deviceData.moisture);
    graphDatatempterature.push(deviceData.temperature);
    graphDatahumidity.push(deviceData.humidity);

    devices = data;
  })

  var datasets = [{
    label: 'Moisture',
    data: graphDatamoisture,
    borderColor: 'rgba(0, 128, 255, 1)', // Light blue
    backgroundColor: 'rgba(0, 128, 255, 0.2)', // Light blue with transparency
    borderWidth: 2,
    pointRadius: 2, // Adjust point radius
    pointBorderWidth: 2 // Adjust point border width
  }, {
    label: 'Temperature',
    data: graphDatatempterature,
    borderColor: 'rgba(255, 99, 71, 1)', // Tomato red
    backgroundColor: 'rgba(255, 99, 71, 0.2)', // Tomato red with transparency
    borderWidth: 2,
    pointRadius: 2, // Adjust point radius
    pointBorderWidth: 2 // Adjust point border width
  }, {
    label: 'Humidity',
    data: graphDatahumidity,
    borderColor: 'rgba(128, 128, 128, 1)', // Gray
    backgroundColor: 'rgba(128, 128, 128, 0.2)', // Gray with transparency
    borderWidth: 2,
    pointRadius: 2, // Adjust point radius
    pointBorderWidth: 2 // Adjust point border width
  }];

  const ctx = document.getElementById('devicesChart');
  // let newGraphDiv = document.createElement('div')
  // document.getElementById('devicesChart').appendChild(newGraphDiv);

  // const filteredData = graphData.filter((point, index) => index % n === 0);
  devicesChart = new Chart(ctx, {
    type: 'line',

    data: {
      labels: labels, // Initial X-axis labels
      datasets: datasets,
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    },
    options: {
      plugins: {
        annotation: {
          annotations: {
            minLine: {
              type: 'line',
              mode: 'horizontal',
              scaleID: 'y',
              value: device.min_moisture,
              borderColor: 'red',
              borderWidth: 1,
              label: {
                content: 'Minimum Value', // Label text
                enabled: true, // Show label
                position: 'left', // Label position
                font: {
                  size: 12, // Adjust font size as needed
                },
                // content: ['This is my text', 'This is my text, second line'],
              }
            }
          }
        }
      },
      scales: {
        x: {
          display: false,
          ticks: {
            stepSize: 20 // Adjust the limit as needed
          }
        },
        y: {
          min: 0,    // Set the minimum value for the Y-axis
          max: 105,  // Set the maximum value for the Y-axis
          ticks: {
            stepSize: 10  // Set the step size between ticks (optional)
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

  var datasets = [{
    label: 'Predicted Moisture',
    borderColor: 'rgba(0, 128, 255, 1)', // Light blue
    backgroundColor: 'rgba(0, 128, 255, 0.2)', // Light blue with transparency
    borderWidth: 2,
    pointRadius: 2, // Adjust point radius
    pointBorderWidth: 2 // Adjust point border width
  }, {
    label: 'Predicted evapotranspiration',
    borderColor: '#4fac31', // Tomato red
    backgroundColor: '#4fac31', // Tomato red with transparency
    borderWidth: 2,
    pointRadius: 2, // Adjust point radius
    pointBorderWidth: 2 // Adjust point border width
  }];
  predictedMoistureChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates, // Initial X-axis labels
      datasets: datasets,
    },
    options: {
      plugins: {
        annotation: {
          annotations: {
            minLine: {
              type: 'line',
              mode: 'horizontal',
              scaleID: 'y',
              value: devicesView.devices[0].min_moisture,
              borderColor: 'red',
              borderWidth: 1,
              label: {
                content: 'Minimum Value', // Label text
                enabled: true, // Show label
                position: 'left', // Label position
                font: {
                  size: 12, // Adjust font size as needed
                },
                // content: ['This is my text', 'This is my text, second line'],
              }
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            stepSize: 10 // Adjust the limit as needed
          }
        },
        y: {
          min: 0,    // Set the minimum value for the Y-axis
          max: 105,  // Set the maximum value for the Y-axis
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

  predictedMoistureChart.data.datasets[0].data = dataObject.predictedMoisture;
  predictedMoistureChart.data.datasets[1].data = dataObject.predictedEvapotranspiration;

  predictedMoistureChart.update();
  $('#predictionChartLoadingIcon').hide();
  document.getElementById('predictedMoistureChart').style.opacity = 1;

}
function filterSensorData(data) {
  console.log(data)
  let selectedTimeWindow = getSelectedValueRadio();
  let targetPoints = 70;
  if (isPhone()) {
    targetPoints = 40;
  }
  console.log(data)

  if (selectedTimeWindow === 'realTime') {
    if (isPhone()) {
      console.log('isphone')
      return data.slice(-10);
    } else {
      console.log('is notphone')

      return data.slice(data);

    }
  }
  else {
    return downsampleTimeSeries(data, targetPoints);
  }

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
  devicesView.clearDeviceFormFields();
  document.getElementById('newDeviceModal').deviceId = '';
  $('#newDeviceModal').modal('show');
}
function newDevice() {
  let deviceId = document.getElementById('newDeviceModal').deviceId;
  if (deviceId) {
    deviceController.editDevice({
      device_id: deviceId, name: document.getElementById('newDeviceName').value, name: document.getElementById('newDeviceName').value,
      minMoisture: document.getElementById('deviceMinMoistureInput').value, maxMoisture: document.getElementById('deviceMaxMoistureInput').value,
      sampleRate: document.getElementById('deviceSampleRateInput').value, location: document.getElementById('deviceLocationInput').value
    });
  } else {
    const newDeviceId = document.getElementById('newDeviceId').value;
    if (newDeviceId.length > 0) {
      deviceController.createDeviceAjax({
        device_id: newDeviceId, name: document.getElementById('newDeviceName').value, name: document.getElementById('newDeviceName').value,
        minMoisture: document.getElementById('deviceMinMoistureInput').value, maxMoisture: document.getElementById('deviceMaxMoistureInput').value,
        sampleRate: document.getElementById('deviceSampleRateInput').value, location: document.getElementById('deviceLocationInput').value
      });
    }
  }

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
    // data = filterSensorData(data);
    data = data;

  }
  console.log(timeWindow)
  const valuesArray = data.map(obj => obj.moisture);
  let labelsArray = data.map(obj => obj.timestamp);
  const temperatureArray = data.map(obj => obj.temperature);
  const humidityArray = data.map(obj => obj.humidity);

  labelsArray = labelsArray.map(formatDateString);

  devicesChart.data.datasets[0].data = valuesArray;
  devicesChart.data.datasets[1].data = temperatureArray;
  devicesChart.data.datasets[2].data = humidityArray;

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
      timeWindow = getSelectedValueRadio();
    }
    let response = await sensorController.getAllDevicesData(device.device_id, timeWindow);
    
    // let devicesData = await sensorController.getAllDevicesData(timeWindow);

    originalData = response;
    console.log(originalData)

    if (!chartLoaded) {
      loadChart(response, devicesView.devices[0]);
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

function createCharts(devicesData) {
  if (!chartLoaded) {
    devicesData.forEach(function (device) {

      loadChart(device.data, device);
      chartLoaded = true;
    })

  }
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
