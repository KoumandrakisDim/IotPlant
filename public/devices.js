class DevicesView {

    async editDevice(deviceId) {
        document.getElementById('newDeviceForm').classList.remove('was-validated');

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
        $('#newDeviceName').val(data.name);
        $('#newDeviceId').val(data.device_id);
        $('#deviceMinMoistureInput').val(data.min_moisture);
        $('#deviceMaxMoistureInput').val(data.max_moisture);
        $('#deviceSampleRateInput').val(data.sampleRate);
        $('#deviceStatusInput').val(data.status);
        $('#deviceLocationInput').val(data.location);
        $('#rootZoneDepthInput').val(data.rootZoneDepth);

    }

    clearDeviceFormFields() {
        $('#newDeviceName').val(null);
        $('#newDeviceId').val(null);
        $('#deviceMinMoistureInput').val(null);
        $('#deviceMaxMoistureInput').val(null);
        $('#deviceSampleRateInput').val(null);
        $('#deviceStatusInput').val(null);
        $('#deviceLocationInput').val(null);
        $('#rootZoneDepthInput').val(null);
    }
}
function newDeviceShowModal() {
    document.getElementById('newDeviceForm').classList.remove('was-validated');
    devicesView.clearDeviceFormFields();
    document.getElementById('newDeviceModal').deviceId = '';
    $('#newDeviceModal').modal('show');
}
function newDevice() {
    let deviceId = document.getElementById('newDeviceModal').deviceId;
    document.getElementById('newDeviceForm').classList.add('was-validated')
    if(!checkDeviceFields()){
        return false;
    }


    if (deviceId) {
        deviceController.editDevice({
            device_id: deviceId, name: document.getElementById('newDeviceName').value,
            minMoisture: document.getElementById('deviceMinMoistureInput').value,
            maxMoisture: document.getElementById('deviceMaxMoistureInput').value,
            sampleRate: document.getElementById('deviceSampleRateInput').value,
            location: document.getElementById('deviceLocationInput').value,
            rootZoneDepth: document.getElementById('rootZoneDepthInput').value
        });
    } else {
        const newDeviceId = document.getElementById('newDeviceId').value;
        if (newDeviceId.length > 0) {
            deviceController.createDeviceAjax({
                device_id: newDeviceId, name: document.getElementById('newDeviceName').value,
                minMoisture: document.getElementById('deviceMinMoistureInput').value,
                maxMoisture: document.getElementById('deviceMaxMoistureInput').value,
                sampleRate: document.getElementById('deviceSampleRateInput').value,
                location: document.getElementById('deviceLocationInput').value,
                rootZoneDepth: document.getElementById('rootZoneDepthInput').value
            });
        }
    }

}
function checkDeviceFields() {
    let isInvalid = false;

    const elements = [
        { id: 'deviceMinMoistureInput', min: 0, max: 100 },
        { id: 'deviceMaxMoistureInput', min: 0, max: 100 },
        { id: 'deviceSampleRateInput', min: 1, max: 1000 },
        { id: 'rootZoneDepthInput', min: 0, max: Infinity } // Assuming no upper limit for root zone depth
    ];
    if(document.getElementById('newDeviceName').value.length < 1 || document.getElementById('newDeviceId').value.length < 1){
        return false;
    }

    for (const el of elements) {
        const inputElement = document.getElementById(el.id);
        if (!validateNumber(inputElement, el.min, el.max)) {
            isInvalid = true;
        }
    }

    if (isInvalid) {
        // If all fields are valid, submit the form programmatically
        return false;
    }
    return true;
}