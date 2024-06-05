let devicesChart;
let predictedMoistureCharts = [];
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

    let newGraphDiv = document.createElement('canvas');
    document.getElementById('devicesChart_' + device).appendChild(newGraphDiv);
    // const filteredData = graphData.filter((point, index) => index % n === 0);

    devicesChart = new Chart(newGraphDiv, {
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
                        text: device,
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

    document.getElementById('devicesChart_' + device).chart = devicesChart;

}

function loadPredictedMoistureChart(data, deviceId, i) {

    // data = data.predictedMoisture;
    let labels = [];
    let graphData = [{ wtf: 'wtf' }];
    // let filteredData = filterSensorData(data);

    // let array = filterArray(data);

    // array.forEach(function (deviceData) {
    //   labels.push(formatDateString(deviceData.timestamp));
    //   graphData.push(deviceData.value);
    //   devices = data;
    // })
    let dates = getNext13Days();

    // const filteredData = graphData.filter((point, index) => index % n === 0);
    let newGraphDiv = document.createElement('canvas');
    document.getElementById('predictedMoistureChart_' + deviceId).appendChild(newGraphDiv);

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
    let predictedMoistureChart = new Chart(newGraphDiv, {
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
                            value: devicesView.devices[i].min_moisture,
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
                        text: deviceId,
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

    $('#predictionChartLoadingIcon_' + deviceId).hide();
    document.getElementById('predictedMoistureChart_' + deviceId).style.opacity = 1;
    predictedMoistureChart.chartId = 'predictedMoistureChart_' + deviceId;
    predictedMoistureCharts.push(predictedMoistureChart);
    applyLoadingToChart(predictedMoistureChart.chartId);
}

function updateChart(data, timeWindow, chartElement) {

    if (timeWindow !== 'realTime') {
        // data = filterSensorData(data);
        data = data;
    }

    const valuesArray = data.map(obj => obj.moisture);
    let labelsArray = data.map(obj => obj.timestamp);
    const temperatureArray = data.map(obj => obj.temperature);
    const humidityArray = data.map(obj => obj.humidity);

    console.log(data)

    labelsArray = labelsArray.map(formatDateString);
    let chart = chartElement.chart;

    chart.data.datasets[0].data = valuesArray;
    chart.data.datasets[1].data = temperatureArray;
    chart.data.datasets[2].data = humidityArray;

    chart.data.labels = labelsArray;


    chart.update();
}

function updatePredictionChart(data, chartId, loadingIconId) {
    console.log(data)
    if(!data){
        return;
    }
    // data = filterArray(data.predictedMoisture);
    // Remove newline characters
    const cleanedDataString = data.replace(/\r?\n|\r/g, '');

    // Parse the string into an object
    const dataObject = JSON.parse(cleanedDataString);

    console.log(cleanedDataString)
    console.log(dataObject)

    // Extract the predictedMoisture array
    // const predictedMoistureArray = JSON.parse(dataObject);
    predictedMoistureChart = document.getElementById(chartId).children[1];
    console.log(chartId)

    let chart = predictedMoistureCharts.find(chart => chart.chartId === chartId);

    console.log(predictedMoistureCharts)
    console.log(chart)

    chart.data.datasets[0].data = dataObject.predictedMoisture;
    chart.data.datasets[1].data = dataObject.predictedEvapotranspiration;

    chart.update();
    // $(loadingIconId).hide();
    // document.getElementById(chartId).style.opacity = 1;
    removeLoadingFromChart(chartId);
}

function loadDevicesCharts(sensorData) {
    console.log(sensorData);
    let i = 0;
    sensorData.forEach(function(deviceData) {
        console.log(deviceData);

        // Assuming deviceData is an array of sensor data entries for a device
        const deviceId = deviceData.length > 0 ? deviceData[0].device_id : null;

        if (deviceId) {
            document.getElementById('chartsContainer').appendChild(createChartContainer(deviceId));

            loadChart(deviceData, deviceId);
            loadPredictedMoistureChart(null, deviceId, i);
            i++;
        }
    });

    const timeWindowLabels = document.querySelectorAll('.timeWindowButton');
    timeWindowLabels.forEach(label => {
        label.addEventListener('click', () => {
            selectTimeWindowClick(label, label.getAttribute('value'));
        });
    });
}


function createChartContainer(deviceId) {
    const container = document.createElement('div');
    container.className = 'row greenContainer mb-3';
    container.id = 'row_' + deviceId;

    const leftColumn = document.createElement('div');
    leftColumn.className = 'col-12 col-md-6';

    const devicesChartDiv = document.createElement('div');
    devicesChartDiv.className = 'mt-2 chart';
    devicesChartDiv.id = 'devicesChart_' + deviceId;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'buttonContainer justify-content-center d-flex';
    buttonContainer.id = 'buttonContainer_' + deviceId;

    const timeWindowLabels = ['Year', 'Month', 'Week', 'Day', 'Hour', 'Real time'];
    timeWindowLabels.forEach(labelText => {
        const label = document.createElement('label');
        label.className = 'form-check-label timeWindowButton';
        label.id = labelText.toLowerCase().replace(/\s+/g, '') + 'TimeWindowButton_' + deviceId;
        label.setAttribute('value', labelText.toLowerCase().replace(/\s+/g, ''));
        label.textContent = labelText;
        buttonContainer.appendChild(label);

        if(label.getAttribute('value') === 'realtime'){
            label.classList.add('selectedTimeWindow');
        }

    });

    leftColumn.appendChild(devicesChartDiv);
    leftColumn.appendChild(buttonContainer);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'col-12 col-md-6 mt-2';
    rightColumn.id = 'predictionDiv_' + deviceId;
    rightColumn.style.position = 'relative';

    const predictedMoistureChartCanvasParent = document.createElement('div');

    const predictedMoistureChartCanvas = document.createElement('canvas');
    predictedMoistureChartCanvasParent.className = 'chart predictionChart';
    predictedMoistureChartCanvasParent.id = 'predictedMoistureChart_' + deviceId;
    predictedMoistureChartCanvasParent.style.position = 'relative';

    const predictMoistureButton = document.createElement('button');
    predictMoistureButton.className = 'btn btn-secondary roundButton predictMoistureButton';
    predictMoistureButton.id = 'predictMoistureButton_' + deviceId;
    predictMoistureButton.innerHTML = '<i class="bi bi-bootstrap-reboot d-block"></i>';

    const spinnerContainer = document.createElement('div');
    spinnerContainer.className = 'spinner-container';
    const spinner = document.createElement('div');
    spinner.className = 'spinner-border';
    spinner.setAttribute('role', 'status');
    spinner.id = 'predictionChartLoadingIcon_' + deviceId;
    spinnerContainer.appendChild(spinner);

    // predictedMoistureChartCanvasParent.appendChild(predictedMoistureChartCanvas);
    rightColumn.appendChild(predictedMoistureChartCanvasParent);
    predictedMoistureChartCanvasParent.appendChild(predictMoistureButton);
    rightColumn.appendChild(spinnerContainer);

    container.appendChild(leftColumn);
    container.appendChild(rightColumn);

    predictMoistureButton.addEventListener('click', () => getPredictedMoisture(deviceId));




    return container;
}

/**
 * 
 * @param {*} device_id 
 * @param {*} timeWindow 
 */
async function changeTimeWindow(device_id, timeWindow) {
    console.log(device_id)

    try {
        if (!timeWindow) {
            timeWindow = getSelectedValueRadio();
        }
        let response = await sensorController.getDeviceData(device_id, timeWindow);

        // let devicesData = await sensorController.getAllDevicesData(timeWindow);

        originalData = response;

        if (!chartLoaded) {
            // loadChart(response, devicesView.devices[0]);
            chartLoaded = true;
        }

        if(!fetchDataInterval){
            let fetchDataInterval = null;
            // if (timeWindow === 'realTime') {
            //     if (!fetchDataInterval && profileView.user.toggleSaveSensorData) {
            //         fetchDataInterval = setInterval(() => changeTimeWindow(null, timeWindow), 21000);
            //     }
    
            // } else {
            //     clearInterval(fetchDataInterval);
            //     fetchDataInterval = null;
            // }
        }

        let chart = document.getElementById('devicesChart_' + device_id);
        updateChart(response, timeWindow, chart);
        return;
    } catch {
        showAlert('alert', 'Could not get sensor data');
    }

}

function selectTimeWindowClick(timeWindowButton, timeWindow) {
    console.log(timeWindow)
    let buttonContainer = timeWindowButton.parentNode;
    let deviceId = buttonContainer.id.substring(16);

    let timeWindowButtons = document.querySelectorAll('#' + buttonContainer.id + ' .timeWindowButton');
    timeWindowButtons.forEach(function (button) {
        button.classList.remove('selectedTimeWindow');
    })

    timeWindowButton.classList.add('selectedTimeWindow');
    changeTimeWindow(deviceId, timeWindow);
}

function applyLoadingToChart(chartId){
    let chart = document.getElementById(chartId);
    chart.style.opacity = 0.5;
    console.log(chart)
    
    chart.parentNode.querySelector('.spinner-container').firstChild.style.display = 'block';
  }
  function removeLoadingFromChart(chartId){
    let chart = document.getElementById(chartId);
    chart.style.opacity = 1;    
    chart.parentNode.querySelector('.spinner-container').firstChild.style.display = 'none';
  }