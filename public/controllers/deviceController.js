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
}