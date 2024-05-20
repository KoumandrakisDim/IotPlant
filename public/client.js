eventListeners();
let userId = '';
let devices = [];

let originalData = []; // Your initial data
const targetPoints = 50;
// let socket;

var chartLoaded = false;
let device = {};
let predictedMoistureChartLoaded = false;

const sensorController = new SensorController();
const deviceController = new DeviceController();
const profileController = new ProfileController();
const profileView = new ProfileView();
const devicesView = new DevicesView();

let fetchDataInterval;
let user;
let userDevicesData = [];
var savedWeather;

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

async function login() {
  let response = await profileController.loginAjax(document.getElementById('username').value, document.getElementById('password').value);
  console.log(response)
  localStorage.setItem('apiKey', response.user.api_key);
  userId = response.userId;
  let userDevices = await deviceController.getDevices(userId);
  deviceController.loadDevicesGrid(userId);
  user = response.user;
  devicesView.devices = userDevices;
  try {
    userDevicesData = await sensorController.getAllDevicesData(userId);
    console.log(userDevicesData);
    loadDevicesCharts(userDevicesData);
  } catch (error) {

  }

  // $('#devicesContainer').html(null);

  // userDevices.forEach(function (device) {
  //   document.getElementById('devicesContainer').appendChild(createDevicesList(device));
  // })
  // if (userDevices[0]) {
  //   // sensorController.getDeviceData(userDevices[0].device_id, 'realTime', true);
  //   device = userDevices[0];
  //   console.log(device)
  //   selectTimeWindowClick('realTimeTimeWindowButton', 'realTime');
  // }

  showContainer('dashboard');
  document.getElementById('main').classList.remove('d-none');
  $('#loginContainer').hide();
  profileView.user = response.user;
  document.getElementById('toggleSaveSensorDataButton').checked = profileView.user.toggleSaveSensorData;

  fillUserProfileData(response.user);
  // socket = io('http://localhost:' + response.port);
  // loadPredictedMoistureChart();



}

async function fillUserProfileData(data) {
  $('#city').val(data.city);
  document.getElementById('usernameView').value = data.username;
  document.getElementById('useWeatherButton').checked = data.useWeather;
  document.getElementById('toggleSmsNotifications').checked = data.smsNotifications;
  document.getElementById('phoneNumberInput').value = data.phoneNumber || '';

  profileView.toggleUseWeatherButton();
  // document.getElementById('realTimeTimeWindow').checked = true;
  if (data.useWeather) {
    $('#predictionDiv').show();
    let weatherData = await profileController.getWeatherData(profileView.user);
    savedWeather = weatherData;
    $('#weatherContainer').html(null);
    document.getElementById('weatherContainer').appendChild(profileView.addWeatherCards(weatherData));
    saveDailyWeatherData(weatherData);

    let lastMoistureValues = [];
    console.log(userDevicesData)
    if (userDevicesData.length > 0) {
      userDevicesData.forEach(function (data) {
        console.log(data)
        if(data.length > 0){
          lastMoistureValues.push(data[data.length - 1].moisture);
        }
      })
      console.log(weatherData)

      console.log(lastMoistureValues)
      let predictions = await deviceController.predictMoisture(weatherData, lastMoistureValues);
      let predictionCharts = document.querySelectorAll('.predictionChart');
      console.log(predictions)

      for (i = 0; i < predictionCharts.length; i++) {
        let nextSibling = predictionCharts[i].nextSibling.firstChild;
        updatePredictionChart(predictions.predictedMoistureArray[i], predictionCharts[i].id, nextSibling.id);
      }

    }


  } else {
    $('#predictionDiv').hide();
  }
}
function getLoadingIconId(){
  
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


function filterSensorData(data) {

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


function createCharts(devicesData) {
  if (!chartLoaded) {
    devicesData.forEach(function (device) {

      // loadChart(device.data, device);
      chartLoaded = true;
    })

  }
}

async function getPredictedMoisture(deviceId) {

  console.log(deviceId)
  let chartId = 'predictedMoistureChart_' + deviceId;
  let chart = predictedMoistureCharts.find(chart => chart.chartId === chartId);

  let loadingIcon = document.getElementById(chartId).nextSibling.firstChild;

  $(loadingIcon).show();
  document.getElementById('predictedMoistureChart_' + deviceId).style.opacity = 0.5;
  console.log(chart.data.datasets[0]);
  let lastMoistureValues = [];

  if (userDevicesData.length > 0) {
    userDevicesData.forEach(function (data) {
      console.log(data)
      if (data[data.length - 1].device_id === deviceId) {
        lastMoistureValues.push(data[data.length - 1].moisture);
      }
    })
  }

  let lastMoistureValue = chart.data.datasets[0];
  chart.data.datasets[0].data = [];
  chart.update();
  let predictedMoisture;

  try {
    console.log(savedWeather)
    console.log(loadingIcon.id)

    let predictions = await deviceController.predictMoisture(savedWeather, lastMoistureValues);

    updatePredictionChart(predictions.predictedMoistureArray[0], chartId, loadingIcon.id)

  } catch(error) {
    console.log(error)
    showAlert('alert', 'Error getting moisture prediction: ' + error);
    return;
  }
  console.log(predictedMoisture)

}
