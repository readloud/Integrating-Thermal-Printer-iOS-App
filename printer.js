/**
 * Thermal Printer Integration Module
 * Support: iOS (BLE + AirPrint), Android (USB/BLE), Web (AirPrint)
 */

class ThermalPrinterManager {
    constructor() {
        this.connectedDevice = null;
        this.isNative = false;
        this.plugin = null;
        this.platform = 'web';
        this.init();
    }
    
    async init() {
        // Detect platform
        if (window.Capacitor) {
            this.isNative = true;
            this.platform = Capacitor.getPlatform();
            
            if (this.platform === 'ios' || this.platform === 'android') {
                try {
                    this.plugin = Capacitor.Plugins.CapacitorThermalPrinter;
                    console.log(`✅ Native plugin loaded on ${this.platform}`);
                } catch (e) {
                    console.warn('Plugin not available, using fallback');
                    this.plugin = null;
                }
            }
        }
        
        // Emit ready event
        window.dispatchEvent(new CustomEvent('printer-ready', {
            detail: { platform: this.platform, isNative: this.isNative }
        }));
    }
    
    async scanDevices() {
        if (!this.isNative || !this.plugin) {
            throw new Error('Scan only available in native app');
        }
        
        try {
            await this.plugin.startScan();
            
            return new Promise((resolve) => {
                this.plugin.addListener('discoverDevices', (devices) => {
                    this.plugin.stopScan();
                    resolve(devices);
                });
                
                // Timeout after 15 seconds
                setTimeout(() => {
                    this.plugin.stopScan();
                    resolve([]);
                }, 15000);
            });
        } catch (error) {
            console.error('Scan error:', error);
            throw error;
        }
    }
    
    async connect(device) {
        if (!this.isNative || !this.plugin) {
            throw new Error('Connect only available in native app');
        }
        
        const address = device.address || device.deviceId;
        
        try {
            const result = await this.plugin.connect({ address });
            if (result) {
                this.connectedDevice = device;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }
    
    async print(text, options = {}) {
        const { align = 'center', cut = true } = options;
        
        // Priority 1: Native BLE
        if (this.isNative && this.plugin && this.connectedDevice) {
            return this.printNativeBLE(text, align, cut);
        }
        
        // Priority 2: AirPrint (iOS/Web)
        if (this.platform === 'ios' || !this.isNative) {
            return this.printAirPrint(text);
        }
        
        // Priority 3: Network (fallback)
        return this.printNetwork(text);
    }
    
    async printNativeBLE(text, align, cut) {
        try {
            await this.plugin.begin()
                .initialize()
                .align(align)
                .text(text)
                .newline()
                .newline();
            
            if (cut) {
                await this.plugin.cutPaper();
            }
            
            await this.plugin.write();
            return { success: true, method: 'BLE' };
        } catch (error) {
            throw new Error(`BLE print failed: ${error.message}`);
        }
    }
    
    async printAirPrint(text) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        font-family: monospace; 
                        padding: 20px; 
                        white-space: pre-wrap;
                        max-width: 80mm;
                        margin: 0 auto;
                    }
                </style>
            </head>
            <body>${text.replace(/\n/g, '<br>')}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        
        setTimeout(() => printWindow.close(), 1000);
        return { success: true, method: 'AirPrint' };
    }
    
    async printNetwork(text) {
        const response = await fetch('/api/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text, 
                ip: localStorage.getItem('printer_ip') || '192.168.1.100',
                port: 9100
            })
        });
        
        const result = await response.json();
        return result;
    }
    
    async disconnect() {
        if (this.isNative && this.plugin && this.connectedDevice) {
            await this.plugin.disconnect();
            this.connectedDevice = null;
        }
        return true;
    }
    
    getStatus() {
        return {
            platform: this.platform,
            isNative: this.isNative,
            isConnected: !!this.connectedDevice,
            deviceName: this.connectedDevice?.name || null
        };
    }
}

// Export singleton
window.printerManager = new ThermalPrinterManager();