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
            data: { timeWindow: timeWindow, isFirstCall: isFirstCall },
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
}