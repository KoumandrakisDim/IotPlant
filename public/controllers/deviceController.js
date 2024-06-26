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
        url: `/devices/edit`, // Adjust the URL to match your server route
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        headers: headers,
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
    $.ajax({
      url: `/devices/delete/${id}`,
      method: 'DELETE',
      headers: headers,
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

  predictMoisture(data, moistureArray, devices) {
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
    console.log(devices);

    return new Promise(function (resolve, reject) {
      // Use jQuery's AJAX function
      $.ajax({
        url: `/api/predictMoisture`,
        method: 'POST',
        headers: headers,
        data: JSON.stringify({ data: data, moistureArray: moistureArray, devices: devices }),
        contentType: 'application/json',
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

  loadDevicesGrid(userId) {
    $("#devicesGrid").jqGrid({
        url: `/user/${userId}/devicesGrid`,
        datatype: "json",
        mtype: 'POST',
        colNames: ["id", "Name", "Status", "MinMoisture", "MaxMoisture", "Location", "SampleRate", "Action"],
        colModel: [
            { name: "device_id", index: "device_id", width: 100, align: 'center', key: true, sortable: true },
            { name: "name", index: "name", align: 'center', width: 100, sortable: true, search: true },
            { name: "status", index: "status", align: 'center', width: 150, sortable: true, search: true },
            { name: "minMoisture", index: "minMoisture", align: 'center', width: 150, sortable: true, search: true },
            { name: "maxMoisture", index: "maxMoisture", align: 'center', width: 150, sortable: true, search: true },
            { name: "location", index: "location", align: 'center', width: 150, sortable: true, search: true },
            { name: "sampleRate", index: "sampleRate", align: 'center', width: 150, sortable: true, search: true },
            { name: "action", width: 200, sortable: false, search: false, align: 'center', formatter: actionButtonsFormatter }
        ],
        height: 400,
        guiStyle: "bootstrap4",
        iconSet: "fontAwesome",
        rownumbers: true,
        sortname: "device_id",
        sortorder: "asc",
        threeStateSort: true,
        sortIconsBeforeText: true,
        headertitles: true,
        toppager: false,
        pager: '#pager',
        rowNum: 15,
        rowList: [15, 30, 45],
        viewrecords: true,
        caption: "Devices",
        jsonReader: {
            root: "rows",
            page: "page",
            total: "total",
            records: "records",
            repeatitems: false,
            id: "device_id"
        },
        prmNames: {
            page: "page",
            rows: "rows",
            sort: "sidx",
            order: "sord",
            search: "_search",
            nd: "nd",
            id: "id",
            filter: "filters",
            searchField: "searchField",
            searchString: "searchString",
            searchOper: "searchOper"
        },
        loadComplete: function() {
            const $grid = $("#devicesGrid");
            if ($grid.getGridParam("records") === 0) {
                $grid.addRowData("noData", {
                    device_id: "No records found"
                });
            }
        }
    });

    function actionButtonsFormatter(cellValue, options, rowObject) {
        return cellValue;
    }
}


}
