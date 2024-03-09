class DeviceController {
  deleteDevice(id) {
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

  toggleSaveSensorData(userId, flag) {
    $.ajax({
      url: `/api/toggleSaveData`,
      method: 'POST',
      data: {flag:flag, id: userId},
      success: function (response) {
        console.log(flag);

      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error('Error during logout:', errorThrown);
        // Handle the error if needed
      }
    });
  }
}