eventListeners();
let userId = '';
let devices = [];

let devicesChart;


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


}
function login() {
  loginAjax(document.getElementById('username').value, document.getElementById('password').value)
}
function loginAjax(username, password) {
  return new Promise(function (resolve, reject) {
    // Use jQuery's AJAX function
    $.ajax({
      url: '/login',
      method: 'POST',
      data: { username: username, password: password },
      success: async function (response) {
        userId = response.userId;
        let userDevices = await getDevices(userId);
        userDevices.forEach(function (device) {
          console.log(device)
          document.getElementById('devicesContainer').appendChild(createDevicesList(device));
        })
        getDeviceData(userDevices[0].device_id);

        showContainer('dashboard');
        document.getElementById('main').classList.remove('d-none');
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('usernameView').value = username;
        resolve(response);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        document.getElementById('alert').style.opacity = 1;
        setTimeout(() => {
          document.getElementById('alert').style.opacity = 0;
        }, "2000");
        // Reject the promise with an error message
        reject(errorThrown);
      }
    });
  });
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
  console.log(username)
  return new Promise(function (resolve, reject) {
    // Use jQuery's AJAX function
    $.ajax({
      url: '/register',
      method: 'POST',
      data: { username: username, password: password, device_id: deviceId },
      success: function (response) {
        console.log(response);
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
function getDeviceData(id) {
  return new Promise(function (resolve, reject) {
    // Use jQuery's AJAX function
    $.ajax({
      url: `/api/getSensorData/${id}`, // Adjust the URL to match your server route
      method: 'POST',
      success: function (response) {

        loadChart(response);
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
 * @param {*} data 
 */
function loadChart(data) {
  document.getElementById('devicesContainer').innerHTML = '';
  let labels = [];
  let graphData = [];
  data.forEach(function (deviceData) {
    labels.push(formatDateString(deviceData.timestamp));
    graphData.push(deviceData.value);
    devices = data;
  })
  const ctx = document.getElementById('devicesChart');

  devicesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels, // Initial X-axis labels
      datasets: [{
        label: "Moisture Level",
        data: graphData, // Initial moisture values
        borderWidth: 1,
      }],
    },
    options: {
      scales: {
        x: {
          display: false
        },
        y: {
          min: 0,    // Set the minimum value for the Y-axis
          max: 100,  // Set the maximum value for the Y-axis
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
  const socket = io('http://localhost:3001');

  // Listen for 'moistureUpdate' events from the server
  socket.on('moistureUpdate', (moistureData) => {
    console.log(moistureData)
    // Assuming devicesChart is already initialized
    updateChart(devicesChart, moistureData);
  });
  window.addEventListener('beforeunload', () => {
    // Close the WebSocket connection before leaving the page
    socket.close();
  });
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
  console.log(device)
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
  nameInput.value = device.name;

  idInput.setAttribute('disabled', true);
  statusInput.setAttribute('disabled', true);
  idInput.value = device.device_id;
  statusInput.value = device.status || 'Ok';

  const deleteButton = document.createElement('i');
  deleteButton.className = 'bi bi-trash text-danger littleTrash';
  deleteButton.style.float = 'right';
  deleteButton.addEventListener('click', function () {
    deleteDevice(device.device_id);
    div.remove();
  })

  div.appendChild(deleteButton);
  div.appendChild(namelabel);
  div.appendChild(nameInput);

  div.appendChild(idlabel);
  div.appendChild(idInput);
  div.appendChild(statuslabel);

  div.appendChild(statusInput);

  return div;
}

function toggleRegister(id) {
  event.preventDefault();
  console.log(id)
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

function updateChart(chart, data) {
  let date = new Date();
  devicesChart.data.labels.push(formatDateString(date));
  devicesChart.data.datasets[0].data.push(data);
  // Limit the number of data points to keep it manageable (adjust as needed)
  // const maxDataPoints = 10;
  // if (devicesChart.data.labels.length > maxDataPoints) {
  //   devicesChart.data.labels.shift();
  //   devicesChart.data.datasets[0].data.shift();
  // }

  // Update the chart
  devicesChart.update();
}


// const socket = io();

// socket.on('moistureUpdate', (moistureData) => {
//   document.getElementById('moistureDisplay').innerText = `Soil Moisture: ${moistureData.toFixed(2)}`;
//   // Assuming you have a function to process the data and extract labels and graphData
//   // const { labels, graphData } = processMoistureData(devicesChart, moistureData);

//   // Update the chart
//   // updateChart(devicesChart, labels, moistureData);
//   updateChart(devicesChart, moistureData);

// });

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
