class DevicesView {

    async editDevice(deviceId) {
        this.clearDeviceFormFields();
        document.getElementById('newDeviceModal').deviceId = deviceId;
        $('#newDeviceModal').modal('show');
        try {
            let deviceData = await deviceController.getDevice(deviceId);
            this.setDeviceFormFields(deviceData);
        } catch {
            showAlert('alert', 'Device id not found');
        }
    }

    setDeviceFormFields(data) {
        console.log(data)
        $('#newDeviceName').val(data.name);
        $('#newDeviceId').val(data.device_id);
        $('#deviceMinMoistureInput').val(data.min_moisture);
        $('#deviceMaxMoistureInput').val(data.max_moisture);
        $('#deviceSampleRateInput').val(data.sampleRate);
        $('#deviceStatusInput').val(data.status);
        $('#deviceLocationInput').val(data.location);

    }

    clearDeviceFormFields() {
        $('#newDeviceName').val(null);
        $('#newDeviceId').val(null);
        $('#deviceMinMoistureInput').val(null);
        $('#deviceMaxMoistureInput').val(null);
        $('#deviceSampleRateInput').val(null);
        $('#deviceStatusInput').val(null);
        $('#deviceLocationInput').val(null);

    }
}