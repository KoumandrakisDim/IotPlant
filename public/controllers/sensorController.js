class SensorController {

    /**
     * 
     * @param {*} id 
     * @returns 
     */
    getDeviceData(id, timeWindow, isFirstCall) {
        if (!timeWindow) {
            timeWindow = 'realTime';
        }
        return new Promise(function (resolve, reject) {
            // Use jQuery's AJAX function
            $.ajax({
                url: `/api/getSensorData/${id}`, // Adjust the URL to match your server route
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ timeWindow: timeWindow, isFirstCall: isFirstCall }),
                success: function (response) {

                    resolve(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showAlert('alert', 'Unable to connect to the sensor')
                    // Reject the promise with an error message
                    reject(errorThrown);
                }
            });

        });
    }

    getAllDevicesData(timeWindow) {
        if (!timeWindow) {
            timeWindow = 'realTime';
        }
        return new Promise(function (resolve, reject) {
            // Use jQuery's AJAX function
            $.ajax({
                url: `/api/getAllSensosrData`, // Adjust the URL to match your server route
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ timeWindow: timeWindow }),
                success: function (response) {

                    resolve(response);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showAlert('alert', 'Unable to connect to the sensor')
                    // Reject the promise with an error message
                    reject(errorThrown);
                }
            });

        });
    }
}