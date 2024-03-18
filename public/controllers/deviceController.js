class DeviceController {

  getDevices(userId) {
    return new Promise(function (resolve, reject) {
      $.ajax({
        url: `/user/${userId}/devices`,
        method: 'POST',
        success: function (response) {
          resolve(response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          reject(errorThrown);
        }
      });

    });
  }
  getDevice(deviceId) {
    console.log('get device')
    console.log(deviceId)

    return new Promise(function (resolve, reject) {
      // Use jQuery's AJAX function
      $.ajax({
        url: `/devices/get/${deviceId}`,
        method: 'GET',
        success: function (response) {
          console.log(response)

          resolve(response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          // Reject the promise with an error message
          reject(errorThrown);
        }
      });
    });
  }

  createDeviceAjax(data) {
    return new Promise(function (resolve, reject) {
      // Use jQuery's AJAX function
      $.ajax({
        url: `/devices/create`,
        method: 'POST',
        data: data,
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (response) {
          $('#newDeviceModal').modal('hide');
          $("#devicesGrid").trigger("reloadGrid");
          resolve(response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          // Reject the promise with an error message
          reject(errorThrown);
        }
      });
    });
  }
  editDevice(data) {
    return new Promise(function (resolve, reject) {
      // Use jQuery's AJAX function
      $.ajax({
        url: `/devices/edit`, // Adjust the URL to match your server route
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (response) {
          $('#newDeviceModal').modal('hide');
          $("#devicesGrid").trigger("reloadGrid");

          // document.getElementById('devicesContainer').appendChild(createDevicesList(data));
          resolve(response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          // Reject the promise with an error message
          reject(errorThrown);
        }
      });
    });
  }
  deleteDevice(id) {
    $.ajax({
      url: `/devices/delete/${id}`,
      method: 'DELETE',
      success: function (response) {
        $("#devicesGrid").trigger("reloadGrid");

        console.log('deleted successfully');
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error('Error during logout:', errorThrown);
        // Handle the error if needed
      }
    });
  }

  toggleSaveSensorData(userId, flag) {
    $.ajax({
      url: `/api/toggleSaveData`,
      method: 'POST',
      data: { flag: flag, id: userId },
      success: function (response) {
        console.log(flag);

      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error('Error during logout:', errorThrown);
        // Handle the error if needed
      }
    });
  }

  predictMoisture(data) {
    const apiKey = localStorage.getItem('apiKey');

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
        method: 'POST',
        headers: headers,
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

  loadDevicesGrid(userId) {
    $("#devicesGrid").jqGrid({
      url: `/user/${userId}/devicesGrid`,
      datatype: "json",
      mtype: 'POST',
      colNames: ["id", "Name", "Status", "MinMoisture", "MaxMoisture", "location", "sampleRate", "Action"],
      colModel: [
        { name: "device_id", index: "device_id", width: 100, align: 'center', key: true },
        { name: "name", index: "name", align: 'center', width: 100 },
        { name: "status", index: "status", align: 'center', width: 150 },
        { name: "minMoisture", index: "minMoisture", align: 'center', width: 150 },
        { name: "maxMoisture", index: "maxMoisture", align: 'center', width: 150 },
        { name: "location", index: "location", align: 'center', width: 150 },
        { name: "sampleRate", index: "sampleRate", align: 'center', width: 150 },

        { name: "action", width: 200, sortable: false, search: false, align: 'center', formatter: actionButtonsFormatter }
      ],
      height: 300,
      guiStyle: "bootstrap4",
      iconSet: "fontAwesome",
      rownumbers: true,
      sortname: "invdate",
      sortorder: "desc",
      threeStateSort: true,
      sortIconsBeforeText: true,
      headertitles: true,
      toppager: false,
      pager: 'pager',
      rowNum: 5,
      viewrecords: true,
      searching: true,
      searching: {
        defaultSearch: "cn"
      }
    });
    function actionButtonsFormatter(cellValue, options, rowObject) {
      return cellValue;
    }
  }

}
