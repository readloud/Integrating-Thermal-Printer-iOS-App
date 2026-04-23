// BLE Printer Handler untuk iOS
let connectedDevice = null;
let thermalPrinter = null;

async function initBLEPrinter() {
    if (window.Capacitor && Capacitor.getPlatform() === 'ios') {
        thermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
        return true;
    }
    return false;
}

async function scanBLEPrinters() {
    if (!thermalPrinter) return [];
    
    await thermalPrinter.startScan();
    
    return new Promise((resolve) => {
        thermalPrinter.addListener('discoverDevices', (devices) => {
            thermalPrinter.stopScan();
            resolve(devices);
        });
        
        setTimeout(() => {
            thermalPrinter.stopScan();
            resolve([]);
        }, 15000);
    });
}

async function connectBLEPrinter(device) {
    const result = await thermalPrinter.connect({ 
        address: device.address || device.deviceId 
    });
    
    if (result) {
        connectedDevice = device;
        return true;
    }
    return false;
}

async function printViaBLE(text) {
    if (!connectedDevice || !thermalPrinter) {
        throw new Error('Printer not connected');
    }
    
    await thermalPrinter.begin()
        .initialize()
        .align('center')
        .text(text)
        .newline()
        .newline()
        .cutPaper()
        .write();
    
    return true;
}