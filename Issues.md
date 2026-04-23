# 📱 Masalah Printer Thermal di iOS

Pesan error **"Tidak didukung di browser ini"** untuk koneksi USB dan Bluetooth di iOS adalah **kendala fundamental dari Safari/WebKit**, bukan bug pada aplikasi Anda.

![Alt Text](https://github.com/readloud/IntegratingThermal-Printer-iOS-App/blob/main/Existing%20Web%20App/2026042269e8904511d5b.jpg)

## 🔍 Penyebab Utama

Apple dengan sengaja **tidak mendukung** WebUSB dan Web Bluetooth API di Safari karena alasan privasi dan keamanan. Ini berlaku untuk **semua browser di iOS** (Chrome, Firefox, dll.) karena Apple mewajibkan semua browser menggunakan mesin WebKit yang sama.

## ✅ Solusi yang Tersedia

### 1. **Native App Wrapper (Paling Direkomendasikan)**

Bungkus aplikasi web Anda dengan **Capacitor** (dari tim Ionic) untuk mengakses native Bluetooth iOS:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install capacitor-thermal-printer
npx cap sync
```

Gunakan plugin ini untuk deteksi printer thermal via Bluetooth di iOS:

```javascript
import { CapacitorThermalPrinter } from 'capacitor-thermal-printer';

// Scan printer
await CapacitorThermalPrinter.startScan();
CapacitorThermalPrinter.addListener('discoverDevices', (devices) => {
  console.log('Printer ditemukan:', devices);
});

// Konek ke printer
const device = await CapacitorThermalPrinter.connect({
  address: 'XX:XX:XX:XX:XX:XX',
});
```

**Setup tambahan untuk iOS** - tambahkan permission di `ios/App/App/Info.plist`:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
```

### 2. **Gunakan Printer dengan Aplikasi Pendamping**

Beberapa printer thermal (seperti LFPERT, TATTMUSE) menyediakan **aplikasi iOS native** sendiri yang bisa dipanggil dari web app Anda menggunakan **URL Scheme**:

```javascript
// Memanggil app printer dari web
window.location.href = "thermalprinter://print?data=your_text";
```

### 3. **Printer dengan MFi Certification**

Pilih printer yang sudah **Apple MFi Certified** seperti Star Micronics SM-T300i, yang memiliki SDK resmi untuk integrasi iOS.

### 4. **Network Printing (Jika Printer Support)**

Ganti koneksi ke **Network (IP/Port)** yang sudah muncul di pilihan Anda:

```javascript
const net = require('net');
const client = new net.Socket();
client.connect(9100, '192.168.1.100', () => {
  client.write(Buffer.from('Hello World\n\n\n'));
});
```

## 📊 Perbandingan Solusi

| Solusi | USB iOS | Bluetooth iOS | Biaya | Kompleksitas |
|--------|---------|---------------|-------|--------------|
| Capacitor Wrapper | ❌ | ✅ | Gratis | Sedang |
| Aplikasi Pendamping | ❌ | ✅ | Gratis | Rendah |
| Printer MFi | ❌ | ✅ | $$$ | Rendah |
| Network Printing | ❌ | ❌ | Gratis | Rendah |

## 🚀 Langkah Implementasi Terbaik

**Rekomendasi saya**: Gunakan **Capacitor + capacitor-thermal-printer** karena:
1. Tetap bisa menggunakan kode web yang sudah ada (Node.js backend tetap sama)
2. Mendukung Bluetooth di iOS dengan performa Swift yang cepat
3. Satu codebase untuk Android & iOS

# 🚀 Solusi Lengkap: Integrasi Printer Thermal di iOS dengan Capacitor

Saya akan bantu Anda membuat aplikasi hybrid yang bisa mendeteksi printer thermal via **Bluetooth** di iOS (karena USB tidak bisa di iOS, fokus ke Bluetooth).

## 📁 Struktur Proyek

```
thermal-printer-app/
├── backend/          # Node.js server (yang sudah ada)
├── mobile/           # Capacitor app baru
│   ├── src/
│   │   └── printer.js
│   ├── ios/
│   └── capacitor.config.json
```

## 🔧 Langkah 1: Setup Capacitor di Proyek Web Anda

```bash
# Di folder root aplikasi web Anda yang sudah ada
cd /path/to/your-web-app

# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/app

# Inisialisasi Capacitor (ganti com.example.app dengan ID unik Anda)
npx cap init "Thermal Printer App" "com.yourcompany.thermalprinter" --web-dir ./

# Install plugin printer thermal untuk Capacitor
npm install @capacitor-community/bluetooth-le
npm install capacitor-thermal-printer
# Atau alternatif:
npm install cordova-plugin-thermal-printer
```

## 📱 Langkah 2: Buat Custom Capacitor Plugin (Jika plugin di atas tidak work)

Buat file `src/printer-plugin.ts`:

```typescript
// src/printer-plugin.ts
import { registerPlugin } from '@capacitor/core';

export interface ThermalPrinterPlugin {
  connectBluetooth(options: { address: string }): Promise<{ success: boolean }>;
  disconnect(): Promise<{ success: boolean }>;
  printText(options: { text: string }): Promise<{ success: boolean }>;
  printImage(options: { base64: string }): Promise<{ success: boolean }>;
  scanDevices(): Promise<{ devices: BluetoothDevice[] }>;
}

export interface BluetoothDevice {
  name: string;
  address: string;
  rssi?: number;
}

const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');
export default ThermalPrinter;
```

## 🍎 Langkah 3: Implementasi iOS Native (Swift)

Buat file `ios/App/App/Plugins/ThermalPrinterPlugin.swift`:

```swift
import Capacitor
import CoreBluetooth

@objc(ThermalPrinterPlugin)
public class ThermalPrinterPlugin: CAPPlugin, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager!
    private var discoveredPeripherals: [CBPeripheral] = []
    private var connectedPeripheral: CBPeripheral?
    private var characteristic: CBCharacteristic?
    private var scanCallback: JSObject?
    
    // Printer thermal ESC/POS commands
    private let ESC: UInt8 = 0x1B
    private let GS: UInt8 = 0x1D
    private let LF: UInt8 = 0x0A
    
    override public func load() {
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    @objc func scanDevices(_ call: CAPPluginCall) {
        self.scanCallback = [
            "call": call,
            "devices": []
        ]
        
        if centralManager.state == .poweredOn {
            centralManager.scanForPeripherals(withServices: nil, options: nil)
            
            // Stop scan after 10 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                self?.centralManager.stopScan()
                call.resolve([
                    "devices": self?.discoveredPeripherals.map { [
                        "name": $0.name ?? "Unknown",
                        "address": $0.identifier.uuidString,
                        "rssi": 0
                    ] } ?? []
                ])
            }
        } else {
            call.reject("Bluetooth not available")
        }
    }
    
    @objc func connectBluetooth(_ call: CAPPluginCall) {
        guard let address = call.getString("address") else {
            call.reject("Address required")
            return
        }
        
        let uuid = UUID(uuidString: address)
        let peripheral = discoveredPeripherals.first { $0.identifier == uuid }
        
        if let peripheral = peripheral {
            centralManager.connect(peripheral, options: nil)
            call.resolve(["success": true])
        } else {
            call.reject("Printer not found")
        }
    }
    
    @objc func printText(_ call: CAPPluginCall) {
        guard let text = call.getString("text"),
              let peripheral = connectedPeripheral,
              let characteristic = characteristic else {
            call.reject("Printer not connected")
            return
        }
        
        // Convert text to ESC/POS format
        var commands = Data()
        
        // Initialize printer
        commands.append(contentsOf: [ESC, 0x40])
        
        // Set alignment center
        commands.append(contentsOf: [ESC, 0x61, 0x01])
        
        // Set bold on
        commands.append(contentsOf: [ESC, 0x45, 0x01])
        
        // Add text
        commands.append(contentsOf: text.data(using: .utf8)!)
        
        // Line feed
        commands.append(contentsOf: [LF, LF, LF])
        
        // Cut paper (if supported)
        commands.append(contentsOf: [GS, 0x56, 0x42, 0x00])
        
        peripheral.writeValue(commands, for: characteristic, type: .withResponse)
        call.resolve(["success": true])
    }
    
    @objc func disconnect(_ call: CAPPluginCall) {
        if let peripheral = connectedPeripheral {
            centralManager.cancelPeripheralConnection(peripheral)
            connectedPeripheral = nil
            characteristic = nil
        }
        call.resolve(["success": true])
    }
    
    // MARK: - CBCentralManagerDelegate
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("Bluetooth is powered on")
        case .poweredOff:
            print("Bluetooth is powered off")
        default:
            break
        }
    }
    
    public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        if !discoveredPeripherals.contains(where: { $0.identifier == peripheral.identifier }) {
            discoveredPeripherals.append(peripheral)
        }
    }
    
    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        connectedPeripheral = peripheral
        peripheral.delegate = self
        peripheral.discoverServices(nil)
    }
    
    public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("Failed to connect: \(error?.localizedDescription ?? "")")
    }
    
    // MARK: - CBPeripheralDelegate
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }
        
        // Find characteristic that supports write
        for char in characteristics {
            if char.properties.contains(.write) || char.properties.contains(.writeWithoutResponse) {
                characteristic = char
                break
            }
        }
    }
}
```

## 📄 Langkah 4: Register Plugin di Capacitor

Buat file `ios/App/App/Plugins/ThermalPrinterPlugin.m`:

```objective-c
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(ThermalPrinterPlugin, "ThermalPrinter",
    CAP_PLUGIN_METHOD(scanDevices, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(connectBluetooth, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(printText, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disconnect, CAPPluginReturnPromise);
)
```

## 🌐 Langkah 5: Frontend JavaScript untuk iOS

Update file HTML/JS Anda:

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer iOS</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont; padding: 20px; }
        button { 
            background: #007AFF; color: white; border: none; 
            padding: 12px 24px; border-radius: 10px; margin: 5px;
            font-size: 16px;
        }
        .device-list { margin-top: 20px; }
        .device-item { 
            padding: 12px; background: #f0f0f0; margin: 5px 0; 
            border-radius: 8px; cursor: pointer;
        }
        .status { padding: 10px; margin: 10px 0; border-radius: 8px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>🖨️ Printer Thermal</h1>
    
    <div id="status" class="status">Status: Siap</div>
    
    <button id="scanBtn">🔍 Scan Printer</button>
    <button id="printTestBtn" disabled>📄 Test Print</button>
    <button id="disconnectBtn" disabled>🔌 Disconnect</button>
    
    <div id="deviceList" class="device-list">
        <p>Klik Scan untuk mencari printer...</p>
    </div>
    
    <textarea id="printText" rows="5" placeholder="Masukkan teks untuk dicetak..." style="width:100%; margin-top:20px; padding:10px;">
============================
      THERMAL PRINTER
============================
Tanggal: 2026-04-23
Item 1: Rp 10.000
Item 2: Rp 25.000
--------------------------
Total: Rp 35.000
--------------------------
    Terima kasih!
    </textarea>

    <script>
        let connectedDevice = null;
        let isWebView = false;
        let ThermalPrinter = null;
        
        // Deteksi apakah di Capacitor atau browser biasa
        if (window.Capacitor) {
            isWebView = true;
            ThermalPrinter = Capacitor.Plugins.ThermalPrinter;
            updateStatus("Mode iOS Native - Bluetooth siap", "success");
        } else {
            updateStatus("Mode Web - Gunakan koneksi Network/Serial", "error");
            // Fallback ke Network printing
            setupNetworkPrinting();
        }
        
        function updateStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = `Status: ${message}`;
            statusDiv.className = `status ${type || ''}`;
        }
        
        // Scan printer via Bluetooth (iOS Native)
        async function scanPrinters() {
            if (!isWebView || !ThermalPrinter) {
                updateStatus("Fitur scan hanya tersedia di aplikasi iOS", "error");
                return;
            }
            
            updateStatus("Mencari printer... (10 detik)", "");
            
            try {
                const result = await ThermalPrinter.scanDevices();
                const devices = result.devices || [];
                
                const deviceListDiv = document.getElementById('deviceList');
                
                if (devices.length === 0) {
                    deviceListDiv.innerHTML = '<p>❌ Tidak ada printer ditemukan. Pastikan printer Bluetooth menyala.</p>';
                    updateStatus("Tidak ada printer ditemukan", "error");
                } else {
                    deviceListDiv.innerHTML = '<h3>📱 Printer ditemukan:</h3>';
                    devices.forEach(device => {
                        const deviceEl = document.createElement('div');
                        deviceEl.className = 'device-item';
                        deviceEl.innerHTML = `
                            <strong>${device.name || 'Unknown Printer'}</strong><br>
                            <small>Address: ${device.address}</small>
                        `;
                        deviceEl.onclick = () => connectToPrinter(device);
                        deviceListDiv.appendChild(deviceEl);
                    });
                    updateStatus(`Ditemukan ${devices.length} printer`, "success");
                }
            } catch (error) {
                updateStatus(`Error scan: ${error.message}`, "error");
                console.error(error);
            }
        }
        
        // Connect ke printer yang dipilih
        async function connectToPrinter(device) {
            if (!isWebView) return;
            
            updateStatus(`Menghubungkan ke ${device.name}...`, "");
            
            try {
                const result = await ThermalPrinter.connectBluetooth({ 
                    address: device.address 
                });
                
                if (result.success) {
                    connectedDevice = device;
                    updateStatus(`Terhubung ke ${device.name}`, "success");
                    
                    // Enable print button
                    document.getElementById('printTestBtn').disabled = false;
                    document.getElementById('disconnectBtn').disabled = false;
                    document.getElementById('scanBtn').disabled = true;
                }
            } catch (error) {
                updateStatus(`Gagal konek: ${error.message}`, "error");
            }
        }
        
        // Print teks
        async function printText() {
            if (!isWebView || !connectedDevice) {
                updateStatus("Printer tidak terhubung", "error");
                return;
            }
            
            const text = document.getElementById('printText').value;
            updateStatus("Mencetak...", "");
            
            try {
                const result = await ThermalPrinter.printText({ text: text });
                
                if (result.success) {
                    updateStatus("✅ Cetak berhasil!", "success");
                }
            } catch (error) {
                updateStatus(`❌ Gagal cetak: ${error.message}`, "error");
            }
        }
        
        // Disconnect printer
        async function disconnectPrinter() {
            if (!isWebView) return;
            
            try {
                await ThermalPrinter.disconnect();
                connectedDevice = null;
                updateStatus("Terputus dari printer", "");
                
                document.getElementById('printTestBtn').disabled = true;
                document.getElementById('disconnectBtn').disabled = true;
                document.getElementById('scanBtn').disabled = false;
            } catch (error) {
                updateStatus(`Gagal disconnect: ${error.message}`, "error");
            }
        }
        
        // Fallback: Network printing (untuk browser biasa dan Android WebView)
        function setupNetworkPrinting() {
            // Ganti dengan IP printer thermal Anda
            const PRINTER_IP = "192.168.1.100";
            const PRINTER_PORT = 9100;
            
            window.printViaNetwork = async function(text) {
                try {
                    // Kirim ke Node.js backend yang sudah ada
                    const response = await fetch('http://localhost:3000/print', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: text, ip: PRINTER_IP, port: PRINTER_PORT })
                    });
                    
                    if (response.ok) {
                        updateStatus("✅ Cetak via network berhasil!", "success");
                    }
                } catch (error) {
                    updateStatus(`Network print error: ${error.message}`, "error");
                }
            };
            
            // Override print function
            window.printText = window.printViaNetwork;
        }
        
        // Event listeners
        document.getElementById('scanBtn').addEventListener('click', scanPrinters);
        document.getElementById('printTestBtn').addEventListener('click', printText);
        document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
        
        // Informasi tambahan untuk pengguna iOS
        if (window.Capacitor && Capacitor.getPlatform() === 'ios') {
            const infoDiv = document.createElement('div');
            infoDiv.style.background = '#e7f3ff';
            infoDiv.style.padding = '12px';
            infoDiv.style.borderRadius = '8px';
            infoDiv.style.marginTop = '20px';
            infoDiv.innerHTML = `
                <strong>💡 Tips untuk iOS:</strong><br>
                1. Pastikan Bluetooth printer menyala<br>
                2. Izinkan akses Bluetooth saat diminta<br>
                3. Printer harus dalam mode pairing<br>
                4. Beberapa printer perlu dinyalakan ulang
            `;
            document.body.appendChild(infoDiv);
        }
    </script>
    
    <script src="https://unpkg.com/@capacitor/core@latest/dist/index.js"></script>
</body>
</html>
```

## 🛠️ Langkah 6: Backend Node.js (Network Printing Fallback)

Update backend Anda untuk support network printing:

```javascript
// backend/server.js
const express = require('express');
const net = require('net');
const app = express();
app.use(express.json());

// ESC/POS commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

function createPrintData(text) {
    const buffers = [];
    
    // Initialize printer
    buffers.push(Buffer.from([ESC, 0x40]));
    
    // Set alignment center
    buffers.push(Buffer.from([ESC, 0x61, 0x01]));
    
    // Set bold on
    buffers.push(Buffer.from([ESC, 0x45, 0x01]));
    
    // Add text
    buffers.push(Buffer.from(text, 'utf-8'));
    
    // Line feeds
    buffers.push(Buffer.from([LF, LF, LF]));
    
    // Cut paper
    buffers.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
    
    return Buffer.concat(buffers);
}

app.post('/print', (req, res) => {
    const { text, ip, port = 9100 } = req.body;
    
    const client = new net.Socket();
    const printData = createPrintData(text);
    
    client.connect(port, ip, () => {
        client.write(printData);
        client.end();
        res.json({ success: true, message: 'Printed successfully' });
    });
    
    client.on('error', (err) => {
        console.error('Print error:', err);
        res.status(500).json({ success: false, error: err.message });
    });
});

app.listen(3000, () => {
    console.log('Print server running on port 3000');
});
```

## 📱 Langkah 7: Build iOS App

```bash
# Sync Capacitor
npx cap sync ios

# Tambahkan permission ke Info.plist (otomatis atau manual)
# Buka ios/App/App/Info.plist dan tambahkan:
```

Tambahkan di `ios/App/App/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
<key>UISupportedExternalAccessoryProtocols</key>
<array>
    <string>com.yourcompany.thermalprinter</string>
</array>
```

```bash
# Build dan buka di Xcode
npx cap open ios

# Di Xcode:
# 1. Pilih target device (iPhone)
# 2. Klik Product > Archive
# 3. Distribute via TestFlight atau App Store
```

## 📋 Checklist untuk iOS

- [ ] Printer thermal Anda harus **Bluetooth (BLE)** atau **Bluetooth Classic**
- [ ] Pastikan printer bisa dipairing dengan iPhone via Settings > Bluetooth
- [ ] Beberapa printer murah mungkin tidak kompatibel dengan iOS karena chipset tertentu

## 🆘 Jika Tetap Tidak Bisa

**Pilihan Terakhir - Gunakan PWA + Safari "Add to Home Screen":**

```javascript
// Deteksi user agent iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (isIOS && !window.Capacitor) {
    alert(
        "⚠️ Untuk mencetak di iPhone/iPad:\n\n" +
        "1. Tap Share button (⎙)\n" +
        "2. Pilih 'Add to Home Screen'\n" +
        "3. Buka aplikasi dari Home Screen\n\n" +
        "Atau gunakan printer dengan koneksi Network (IP/Port)"
# 🚀 Solusi Spesifik untuk Printer Thermal Bluetooth BLE 4.0+ di iOS

Berdasarkan riset, ada **plugin Capacitor yang sudah terbukti bekerja** untuk printer thermal BLE di iOS dengan kecepatan tinggi. Berikut implementasi lengkapnya.

---

## 📦 Pilihan Plugin Terbaik untuk BLE 4.0+

### ✅ Rekomendasi Utama: `capacitor-thermal-printer`

Plugin ini **sudah menggunakan RTPrinter SDK resmi dari Rongta Technology** dan diklaim memiliki kecepatan **Swift-level di iOS** untuk BLE .

```bash
# Instalasi di project web Anda
npm install capacitor-thermal-printer --save
npx cap sync
```

### 📱 Setup iOS Tambahan (WAJIB)

Plugin ini memerlukan file resource tambahan. Buka project iOS di Xcode:

```bash
npx cap open ios
```

**Langkah di Xcode:**
1. Di sidebar kiri, pilih project "App"
2. Pilih target utama "App"
3. Buka tab **"Build Phases"**
4. Cari **"Copy Bundle Resources"**
5. Klik **"+"** → **"Add Other..."**
6. Navigasi ke `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/ble_serial.plist`
7. Pilih file tersebut 

---

## 💻 Kode Lengkap Frontend (HTML/JS)

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer BLE iOS</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; 
            padding: 20px; 
            background: #f5f5f5;
            margin: 0;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        button { 
            background: #007AFF; 
            color: white; 
            border: none; 
            padding: 14px 24px; 
            border-radius: 12px; 
            margin: 5px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
        }
        button:active { opacity: 0.8; }
        button:disabled { background: #ccc; opacity: 0.6; }
        .btn-secondary { background: #5856D6; }
        .btn-danger { background: #FF3B30; }
        .btn-success { background: #34C759; }
        .device-list { margin-top: 16px; }
        .device-item { 
            padding: 14px; 
            background: #f8f9fa; 
            margin: 8px 0; 
            border-radius: 12px; 
            cursor: pointer;
            border: 1px solid #e5e5e5;
            transition: 0.2s;
        }
        .device-item:active { background: #e9ecef; }
        .device-name { font-weight: 600; font-size: 16px; }
        .device-address { font-size: 12px; color: #666; margin-top: 4px; }
        .status { 
            padding: 12px; 
            margin: 12px 0; 
            border-radius: 12px; 
            font-weight: 500;
        }
        .status-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .status-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
        .status-info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8; }
        .status-warning { background: #fff3cd; color: #856404; border-left: 4px solid #ffc107; }
        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 12px;
            font-family: monospace;
            font-size: 14px;
            margin-top: 12px;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #e9ecef;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1>🖨️ Printer Thermal BLE</h1>
        <p><span class="badge" id="platformBadge">Mendeteksi platform...</span></p>
    </div>

    <div class="card">
        <div id="status" class="status status-info">⚡ Status: Siap</div>
        
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0;">
            <button id="scanBtn">🔍 Scan Printer BLE</button>
            <button id="printTestBtn" disabled>📄 Test Print</button>
            <button id="disconnectBtn" disabled>🔌 Disconnect</button>
        </div>
        
        <div id="deviceList" class="device-list">
            <p style="color: #666; text-align: center;">Klik "Scan Printer BLE" untuk mencari printer...</p>
        </div>
    </div>

    <div class="card">
        <label style="font-weight: 600;">📝 Konten Cetak:</label>
        <textarea id="printText" rows="6">
============================
      THERMAL PRINTER
============================
Tanggal: 2026-04-23
Waktu: 14:30 WIB
--------------------------
Item 1: Kopi          15.000
Item 2: Roti Bakar    12.000
Item 3: Air Mineral    5.000
--------------------------
Subtotal:             32.000
Pajak 10%:             3.200
--------------------------
TOTAL:              Rp 35.200
--------------------------
Terima kasih!
Kunjungi kami lagi

[QR: https://example.com]
        </textarea>
        
        <div style="margin-top: 12px;">
            <button id="printCustomBtn" disabled class="btn-success">🖨️ Cetak Konten di Atas</button>
        </div>
    </div>
    
    <div class="card">
        <p style="margin: 0; font-size: 12px; color: #666;">
            💡 <strong>Tips untuk iOS BLE:</strong><br>
            • Pastikan printer dalam mode pairing (biasanya lampu biru berkedip)<br>
            • Izinkan akses Bluetooth saat diminta<br>
            • Untuk printer BLE, scan akan menemukan semua perangkat Bluetooth terdekat<br>
            • Koneksi BLE lebih hemat baterai dibanding Bluetooth klasik
        </p>
    </div>
</div>

<script>
    let connectedDevice = null;
    let isCapacitor = false;
    let ThermalPrinter = null;

    // Deteksi platform
    function detectPlatform() {
        const badge = document.getElementById('platformBadge');
        if (window.Capacitor) {
            const platform = Capacitor.getPlatform();
            isCapacitor = true;
            if (platform === 'ios') {
                badge.textContent = '📱 iOS Native - BLE Supported';
                badge.style.background = '#34C759';
                badge.style.color = 'white';
                updateStatus('Mode iOS: Bluetooth BLE siap digunakan', 'success');
                // Load plugin
                ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
            } else if (platform === 'android') {
                badge.textContent = '🤖 Android - BLE Supported';
                badge.style.background = '#3DDC84';
                badge.style.color = 'black';
                updateStatus('Mode Android: Bluetooth BLE siap digunakan', 'success');
                ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
            }
        } else {
            badge.textContent = '🌐 Web Browser - Gunakan Network Printing';
            badge.style.background = '#FF9500';
            badge.style.color = 'white';
            updateStatus('Mode Web: Gunakan koneksi Network (IP/Port) untuk mencetak', 'warning');
        }
    }

    function updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = `⚡ Status: ${message}`;
        statusDiv.className = `status status-${type || 'info'}`;
    }

    // ========== SCAN PRINTER BLE ==========
    async function scanPrinters() {
        if (!isCapacitor || !ThermalPrinter) {
            updateStatus('Fitur scan hanya tersedia di aplikasi native (Capacitor)', 'error');
            return;
        }

        updateStatus('Mencari printer Bluetooth BLE... (15 detik)', 'info');
        
        const deviceListDiv = document.getElementById('deviceList');
        deviceListDiv.innerHTML = '<p style="color: #666; text-align: center;">🔍 Scanning... Mohon tunggu</p>';
        
        try {
            // Start scan - di iOS akan mendeteksi semua device BLE di sekitar 
            await ThermalPrinter.startScan();
            
            // Listener untuk device yang ditemukan
            ThermalPrinter.addListener('discoverDevices', (devices) => {
                console.log('Devices found:', devices);
                
                if (!devices || devices.length === 0) {
                    deviceListDiv.innerHTML = `
                        <p style="color: #666; text-align: center;">
                        ❌ Tidak ada printer ditemukan.<br>
                        <small>Pastikan printer Bluetooth BLE menyala dan dalam mode pairing.</small>
                        </p>`;
                    updateStatus('Tidak ada printer BLE ditemukan', 'warning');
                    return;
                }
                
                // Filter untuk menampilkan semua device (di iOS semua BLE device akan muncul) 
                deviceListDiv.innerHTML = '<h3 style="margin-bottom: 12px;">📱 Printer BLE Ditemukan:</h3>';
                
                devices.forEach(device => {
                    const deviceEl = document.createElement('div');
                    deviceEl.className = 'device-item';
                    deviceEl.innerHTML = `
                        <div class="device-name">${device.name || 'Unknown BLE Device'}</div>
                        <div class="device-address">Address: ${device.address || device.deviceId || 'N/A'}</div>
                    `;
                    deviceEl.onclick = () => connectToPrinter(device);
                    deviceListDiv.appendChild(deviceEl);
                });
                
                updateStatus(`Ditemukan ${devices.length} perangkat BLE. Klik untuk konek.`, 'success');
                
                // Stop scan setelah menemukan device
                // Catatan: beberapa plugin perlu stop scan manual
                if (ThermalPrinter.stopScan) {
                    setTimeout(() => ThermalPrinter.stopScan(), 5000);
                }
            });
            
        } catch (error) {
            console.error('Scan error:', error);
            updateStatus(`Error scan: ${error.message || error}`, 'error');
            deviceListDiv.innerHTML = `<p style="color: red;">❌ Gagal scan: ${error.message || error}</p>`;
        }
    }

    // ========== CONNECT KE PRINTER BLE ==========
    async function connectToPrinter(device) {
        if (!isCapacitor || !ThermalPrinter) return;
        
        const deviceAddress = device.address || device.deviceId;
        const deviceName = device.name || 'Printer';
        
        updateStatus(`Menghubungkan ke ${deviceName}...`, 'info');
        
        try {
            // Method connect dari capacitor-thermal-printer 
            const result = await ThermalPrinter.connect({ 
                address: deviceAddress 
            });
            
            if (result && result !== null) {
                connectedDevice = {
                    name: deviceName,
                    address: deviceAddress
                };
                updateStatus(`✅ Terhubung ke ${deviceName}`, 'success');
                
                // Enable buttons
                document.getElementById('printTestBtn').disabled = false;
                document.getElementById('printCustomBtn').disabled = false;
                document.getElementById('disconnectBtn').disabled = false;
                document.getElementById('scanBtn').disabled = true;
                
                // Optional: get printer info
                if (ThermalPrinter.getPrinterInfo) {
                    const info = await ThermalPrinter.getPrinterInfo();
                    console.log('Printer info:', info);
                }
            } else {
                updateStatus(`❌ Gagal konek ke ${deviceName}`, 'error');
            }
        } catch (error) {
            console.error('Connection error:', error);
            updateStatus(`Gagal konek: ${error.message || error}`, 'error');
        }
    }

    // ========== CETAK DENGAN FORMAT RICH (RECEIPT) ==========
    async function printRichReceipt() {
        if (!isCapacitor || !ThermalPrinter || !connectedDevice) {
            updateStatus('Printer tidak terhubung', 'error');
            return;
        }
        
        updateStatus('Mencetak receipt...', 'info');
        
        try {
            // Gunakan chain API dari capacitor-thermal-printer 
            await ThermalPrinter.begin()
                // Initialize printer
                .initialize()
                
                // Center alignment
                .align('center')
                
                // Optional: Add image/logo (gunakan URL gambar)
                // .image('https://example.com/logo.png')
                
                // Bold and underline text
                .bold()
                .underline()
                .text('TOKO ANDA\n')
                .clearFormatting()
                
                .text('Jl. Contoh No. 123\n')
                .text('Telp: (021) 1234567\n')
                
                .newline()
                
                // Double width for header
                .doubleWidth()
                .text('STRUK PEMBELIAN\n')
                .clearFormatting()
                
                .newline()
                
                // Left alignment for items
                .align('left')
                .text('Item               Qty   Harga\n')
                .text('--------------------------------\n')
                .text('Kopi               2   30,000\n')
                .text('Roti Bakar         1   12,000\n')
                .text('Air Mineral        1    5,000\n')
                .text('--------------------------------\n')
                
                // Right alignment for total
                .align('right')
                .doubleWidth()
                .text('TOTAL: Rp 47,000\n')
                .clearFormatting()
                
                .newline()
                
                // Center alignment for footer
                .align('center')
                .text('Terima kasih atas kunjungan Anda!\n')
                .text('Simpan struk ini sebagai bukti pembayaran\n')
                
                .newline()
                
                // Optional: QR Code
                .qr('https://example.com/invoice/12345')
                
                .newline()
                .newline()
                
                // Cut paper
                .cutPaper()
                
                // Execute print
                .write()
                .then(() => {
                    updateStatus('✅ Cetak receipt berhasil!', 'success');
                })
                .catch((e) => {
                    console.error('Print error:', e);
                    updateStatus(`❌ Gagal cetak: ${e.message || e}`, 'error');
                });
                
        } catch (error) {
            console.error('Print error:', error);
            updateStatus(`Gagal cetak: ${error.message || error}`, 'error');
        }
    }

    // ========== CETAK TEKS KUSTOM ==========
    async function printCustomText() {
        if (!isCapacitor || !ThermalPrinter || !connectedDevice) {
            updateStatus('Printer tidak terhubung', 'error');
            return;
        }
        
        const customText = document.getElementById('printText').value;
        updateStatus('Mencetak teks kustom...', 'info');
        
        try {
            await ThermalPrinter.begin()
                .initialize()
                .align('center')
                .text(customText)
                .newline()
                .newline()
                .cutPaper()
                .write()
                .then(() => {
                    updateStatus('✅ Cetak teks berhasil!', 'success');
                })
                .catch((e) => {
                    updateStatus(`❌ Gagal cetak: ${e.message || e}`, 'error');
                });
        } catch (error) {
            updateStatus(`Gagal cetak: ${error.message || error}`, 'error');
        }
    }

    // ========== DISCONNECT ==========
    async function disconnectPrinter() {
        if (!isCapacitor || !ThermalPrinter) return;
        
        updateStatus('Memutuskan koneksi...', 'info');
        
        try {
            // Beberapa implementasi perlu disconnect manual
            if (ThermalPrinter.disconnect) {
                await ThermalPrinter.disconnect();
            }
            
            connectedDevice = null;
            updateStatus('Koneksi terputus', 'info');
            
            document.getElementById('printTestBtn').disabled = true;
            document.getElementById('printCustomBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = true;
            document.getElementById('scanBtn').disabled = false;
            
        } catch (error) {
            console.error('Disconnect error:', error);
            updateStatus(`Gagal disconnect: ${error.message || error}`, 'error');
        }
    }

    // ========== NETWORK PRINTING FALLBACK (untuk Web Browser) ==========
    async function printViaNetwork() {
        const text = document.getElementById('printText').value;
        
        // Ganti dengan IP printer thermal Anda yang support network
        const PRINTER_IP = "192.168.1.100";
        const PRINTER_PORT = 9100;
        
        updateStatus('Mencetak via Network...', 'info');
        
        try {
            // Kirim ke backend Node.js
            const response = await fetch('http://localhost:3000/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text, 
                    ip: PRINTER_IP, 
                    port: PRINTER_PORT 
                })
            });
            
            if (response.ok) {
                updateStatus('✅ Cetak via Network berhasil!', 'success');
            } else {
                throw new Error('Gagal kirim ke printer');
            }
        } catch (error) {
            updateStatus(`❌ Network print error: ${error.message}`, 'error');
        }
    }

    // ========== EVENT LISTENERS ==========
    document.getElementById('scanBtn').addEventListener('click', scanPrinters);
    document.getElementById('printTestBtn').addEventListener('click', printRichReceipt);
    document.getElementById('printCustomBtn').addEventListener('click', () => {
        if (isCapacitor && connectedDevice) {
            printCustomText();
        } else {
            printViaNetwork();
        }
    });
    document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
    
    // Inisialisasi
    detectPlatform();
</script>

<!-- Capacitor Web Runtime -->
<script src="https://unpkg.com/@capacitor/core@5.0.0/dist/index.js"></script>
</body>
</html>
```

---

## 🔧 Alternatif Plugin Lain

Jika plugin utama tidak bekerja dengan printer spesifik Anda, coba pendekatan alternatif:

### Opsi 1: Manual BLE dengan `@capacitor-community/bluetooth-le`

Untuk kontrol lebih granular atas koneksi BLE:

```javascript
import { BleClient } from '@capacitor-community/bluetooth-le';

async function connectBLE() {
    await BleClient.initialize();
    
    // Scan untuk device BLE
    const devices = await BleClient.requestDevice({
        services: ['000018f0-0000-1000-8000-00805f9b34fb'] // Service printer umum
    });
    
    await BleClient.connect(devices.deviceId);
    
    // Cari characteristic untuk print
    const services = await BleClient.getServices(devices.deviceId);
    // ... kirim data ESC/POS ke characteristic yang sesuai
}
```

### Opsi 2: Swift Native Framework (Printer)

Untuk performa maksimal, Anda bisa menggunakan framework Swift `Printer` via CocoaPods :

```ruby
# Podfile
pod 'Printer'
```

---

## 📋 Perbandingan Metode

| Metode | Kecepatan iOS BLE | Kemudahan Implementasi | Support ESC/POS |
|--------|-------------------|------------------------|-----------------|
| `capacitor-thermal-printer` | ⚡ Sangat Cepat  | Mudah (Chain API) | ✅ Lengkap |
| `@capacitor-community/bluetooth-le` | 🐌 Lambat (manual encoding)  | Sulit | ❌ Perlu manual |
| Network Printing (IP/Port) | ⚡ Cepat | Mudah | ✅ via raw socket |

---

## ✅ Kesimpulan

**Gunakan `capacitor-thermal-printer`** karena:
1. Sudah menggunakan **RTPrinter SDK resmi** dari Rongta Technology 
2. Performa **Swift-level di iOS** untuk BLE
3. API **chain method** yang mirip dengan esc-pos encoder
4. Support **gambar, QR code, barcode, cut paper** lengkap

Jika printer BLE Anda tetap tidak terdeteksi, kemungkinan printer menggunakan **Bluetooth Classic** (bukan BLE). Dalam kasus ini, printer tidak akan bisa terhubung di iOS melalui Web Bluetooth atau Capacitor sekalipun, karena iOS hanya mengizinkan BLE untuk akses Bluetooth dari aplikasi . Solusinya adalah menggunakan **printer dengan dukungan AirPrint** atau **koneksi Network (WiFi/Ethernet)** .

Menggunakan pendekatan **'dual-mode'** yang cerdas: aplikasi akan mencoba koneksi BLE (Bluetooth Low Energy) secara otomatis. Jika gagal, pengguna akan langsung dialihkan ke opsi **AirPrint**, yang merupakan standar bawaan iOS dan pasti berfungsi untuk semua printer .

Berikut adalah kode utama yang bisa langsung coba.

### 📝 Kode Lengkap untuk HTML/JS (Frontend)

Buat atau ganti file utama aplikasi web (misalnya `index.html`) dengan kode di bawah. Kode ini sudah mencakup deteksi otomatis dan fallback ke AirPrint.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer - iOS</title>
    <style>
        /* --- Styling Minimalis --- */
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; 
            padding: 20px; 
            background: #f5f5f5;
            margin: 0;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        button { 
            background: #007AFF; 
            color: white; 
            border: none; 
            padding: 12px 20px; 
            border-radius: 12px; 
            margin: 5px 5px 5px 0;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        button:active { opacity: 0.8; }
        button:disabled { background: #ccc; opacity: 0.6; }
        .btn-airprint { background: #5856D6; }
        .btn-danger { background: #FF3B30; }
        .status { 
            padding: 12px; 
            margin: 12px 0; 
            border-radius: 12px; 
            font-weight: 500;
        }
        .status-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .status-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
        .status-info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b2; }
        .device-list { margin-top: 16px; }
        .device-item { 
            padding: 14px; 
            background: #f8f9fa; 
            margin: 8px 0; 
            border-radius: 12px; 
            cursor: pointer;
            border: 1px solid #e5e5e5;
        }
        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 12px;
            font-family: monospace;
            font-size: 14px;
            margin-top: 12px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #e9ecef;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1>🖨️ Printer Thermal</h1>
        <p><span class="badge" id="platformBadge">Memuat...</span></p>
    </div>

    <div class="card">
        <div id="status" class="status status-info">⚡ Status: Siap</div>
        
        <div style="margin: 16px 0;">
            <button id="scanBtn">🔍 1. Scan BLE</button>
            <button id="airprintBtn" class="btn-airprint">🍎 2. AirPrint (Universal)</button>
            <button id="disconnectBtn" disabled>🔌 Putus</button>
        </div>
        
        <div id="deviceList" class="device-list">
            <p style="color: #666; text-align: center;">Klik "Scan BLE" atau langsung gunakan AirPrint.</p>
        </div>
    </div>

    <div class="card">
        <label style="font-weight: 600;">📝 Konten Cetak:</label>
        <textarea id="printText" rows="6">
============================
      TOKO ANDA
============================
Tanggal: 2026-04-23
--------------------------
Item 1     2 x 10.000
Item 2     1 x 25.000
--------------------------
TOTAL: Rp 45.000
--------------------------
Terima kasih!
        </textarea>
        
        <button id="printBtn" disabled style="margin-top: 12px; width: 100%;">🖨️ Cetak Struk</button>
    </div>
</div>

<script>
    // ==================== INISIALISASI ====================
    let connectedDevice = null;
    let isCapacitor = false;
    let ThermalPrinter = null;

    function detectPlatform() {
        const badge = document.getElementById('platformBadge');
        // Cek apakah dijalankan di aplikasi Capacitor (iOS/Android native)
        if (window.Capacitor && Capacitor.getPlatform() === 'ios') {
            isCapacitor = true;
            badge.textContent = '📱 Mode Aplikasi iOS';
            badge.style.background = '#34C759';
            badge.style.color = 'white';
            updateStatus('Mode Aplikasi: Mencoba BLE, fallback ke AirPrint siap.', 'success');
            
            // Muat Plugin Thermal Printer
            ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
        } else if (window.Capacitor && Capacitor.getPlatform() === 'android') {
            badge.textContent = '🤖 Mode Aplikasi Android';
            badge.style.background = '#3DDC84';
            badge.style.color = 'black';
            updateStatus('Mode Android: Bluetooth siap digunakan.', 'success');
            ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
        } else {
            // Ini berjalan di Safari atau browser biasa, tidak bisa akses hardware native
            badge.textContent = '🌐 Browser Web';
            badge.style.background = '#FF9500';
            badge.style.color = 'white';
            updateStatus('Akses printer terbatas. Gunakan AirPrint atau buka melalui aplikasi iOS.', 'warning');
            document.getElementById('scanBtn').disabled = true;
            document.getElementById('airprintBtn').disabled = false; // AirPrint via share sheet masih bisa
        }
    }

    function updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = `⚡ Status: ${message}`;
        statusDiv.className = `status status-${type || 'info'}`;
    }

    // ==================== FUNGSI BLE (Untuk Printer yang Support) ====================
    async function scanPrinters() {
        if (!isCapacitor || !ThermalPrinter) {
            updateStatus('Fitur scan hanya tersedia di aplikasi native.', 'error');
            return;
        }

        updateStatus('Mencari printer BLE... (15 detik)', 'info');
        const deviceListDiv = document.getElementById('deviceList');
        deviceListDiv.innerHTML = '<p style="color: #666; text-align: center;">🔍 Scanning... Mohon tunggu</p>';
        
        try {
            // Mulai scan
            await ThermalPrinter.startScan();
            
            // Tangkap event device yang ditemukan
            ThermalPrinter.addListener('discoverDevices', (devices) => {
                console.log('Devices found:', devices);
                
                if (!devices || devices.length === 0) {
                    deviceListDiv.innerHTML = `<p style="color: #666; text-align: center;">❌ Tidak ada perangkat BLE ditemukan.<br><small>Pastikan printer menyala. Coba tombol AirPrint sebagai alternatif.</small></p>`;
                    updateStatus('Tidak ada perangkat BLE ditemukan. Gunakan AirPrint.', 'warning');
                    return;
                }
                
                deviceListDiv.innerHTML = '<h3 style="margin-bottom: 12px;">📱 Perangkat BLE Ditemukan:</h3>';
                devices.forEach(device => {
                    const deviceEl = document.createElement('div');
                    deviceEl.className = 'device-item';
                    deviceEl.innerHTML = `
                        <div style="font-weight: 600;">${device.name || 'Perangkat Tanpa Nama'}</div>
                        <div style="font-size: 12px; color: #666;">ID: ${device.address || device.deviceId || 'N/A'}</div>
                    `;
                    deviceEl.onclick = () => connectToPrinter(device);
                    deviceListDiv.appendChild(deviceEl);
                });
                
                updateStatus(`Ditemukan ${devices.length} perangkat. Klik untuk konek.`, 'success');
                
                // Hentikan scan setelah beberapa detik
                if (ThermalPrinter.stopScan) {
                    setTimeout(() => ThermalPrinter.stopScan(), 5000);
                }
            });
        } catch (error) {
            console.error(error);
            updateStatus(`Error scan: ${error.message || error}. Coba AirPrint.`, 'error');
            deviceListDiv.innerHTML = `<p style="color: red;">❌ Gagal scan: ${error.message || error}</p>`;
        }
    }

    async function connectToPrinter(device) {
        if (!isCapacitor || !ThermalPrinter) return;
        
        const deviceId = device.address || device.deviceId;
        const deviceName = device.name || 'Printer';
        
        updateStatus(`Menghubungkan ke ${deviceName}...`, 'info');
        
        try {
            // Method connect dari plugin capacitor-thermal-printer 
            const result = await ThermalPrinter.connect({ address: deviceId });
            
            if (result && result !== null) {
                connectedDevice = { name: deviceName, id: deviceId };
                updateStatus(`✅ Terhubung ke ${deviceName}`, 'success');
                
                // Aktifkan tombol cetak
                document.getElementById('printBtn').disabled = false;
                document.getElementById('disconnectBtn').disabled = false;
                document.getElementById('scanBtn').disabled = true;
            } else {
                updateStatus(`❌ Gagal konek ke ${deviceName}. Coba AirPrint.`, 'error');
            }
        } catch (error) {
            console.error(error);
            updateStatus(`Gagal konek: ${error.message || error}. Coba AirPrint.`, 'error');
        }
    }

    async function printViaBLE() {
        if (!connectedDevice || !ThermalPrinter) {
            updateStatus('Tidak ada printer BLE yang terhubung.', 'error');
            return false;
        }
        
        const text = document.getElementById('printText').value;
        updateStatus('Mencetak via BLE...', 'info');
        
        try {
            // Menggunakan chain API untuk format cetak yang lebih baik 
            await ThermalPrinter.begin()
                .initialize()
                .align('center')
                .text(text)
                .newline()
                .newline()
                .cutPaper()
                .write();
            
            updateStatus('✅ Cetak via BLE berhasil!', 'success');
            return true;
        } catch (error) {
            console.error('BLE Print error:', error);
            updateStatus(`❌ Gagal cetak BLE: ${error.message || error}`, 'error');
            return false;
        }
    }

    async function disconnectPrinter() {
        if (!isCapacitor || !ThermalPrinter) return;
        
        updateStatus('Memutuskan koneksi...', 'info');
        try {
            if (ThermalPrinter.disconnect) await ThermalPrinter.disconnect();
            connectedDevice = null;
            updateStatus('Koneksi terputus.', 'info');
            
            document.getElementById('printBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = true;
            document.getElementById('scanBtn').disabled = false;
        } catch (error) {
            console.error(error);
        }
    }

    // ==================== FUNGSI AIRPRINT (FALLBACK UNIVERSAL) ====================
    // Fungsi ini akan memunculkan dialog print native iOS, cocok untuk SEMUA printer 
    async function printViaAirPrint() {
        const text = document.getElementById('printText').value;
        
        // Siapkan konten HTML yang rapi untuk AirPrint
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        font-family: -apple-system, 'Courier New', monospace; 
                        padding: 20px; 
                        font-size: 12pt;
                        white-space: pre-wrap;
                    }
                    .receipt {
                        max-width: 80mm;
                        margin: 0 auto;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    ${text.replace(/\n/g, '<br>')}
                </div>
            </body>
            </html>
        `;
        
        updateStatus('Membuka dialog AirPrint...', 'info');
        
        // Buat iframe tersembunyi untuk memicu print dialog
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();
        
        // Trigger print setelah konten termuat
        iframe.contentWindow.onload = () => {
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
                updateStatus('✅ Dialog AirPrint telah dibuka. Pilih printer Anda.', 'success');
            }, 100);
        };
    }

    // ==================== LOGIKA CETAK OTOMATIS ====================
    async function handlePrint() {
        if (isCapacitor && connectedDevice) {
            // Prioritas 1: Jika sudah konek BLE, pakai BLE
            await printViaBLE();
        } else if (isCapacitor && !connectedDevice) {
            // Prioritas 2: Jika di aplikasi tapi belum konek BLE, tawarkan AirPrint
            const useAirPrint = confirm('Printer BLE tidak terhubung. Gunakan AirPrint?');
            if (useAirPrint) await printViaAirPrint();
        } else {
            // Prioritas 3: Jika di browser biasa, langsung AirPrint
            await printViaAirPrint();
        }
    }

    // ==================== EVENT LISTENERS ====================
    document.getElementById('scanBtn').addEventListener('click', scanPrinters);
    document.getElementById('airprintBtn').addEventListener('click', printViaAirPrint);
    document.getElementById('printBtn').addEventListener('click', handlePrint);
    document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
    
    // Jalankan deteksi platform
    detectPlatform();
</script>

<!-- Capacitor Web Runtime -->
<script src="https://unpkg.com/@capacitor/core@5.0.0/dist/index.js"></script>
</body>
</html>
```

### ⚙️ Langkah Persiapan (Untuk Build ke Aplikasi iOS)

Agar kode di atas bisa berjalan mulus di iPhone, ada beberapa persiapan teknis yang perlu lakukan di sisi proyek Capacitor.

1.  **Update Dependensi**
    Pastikan sudah menginstal plugin printer yang direkomendasikan, karena plugin inilah yang memungkinkan kode di atas berkomunikasi dengan printer BLE .
    ```bash
    npm install capacitor-thermal-printer --save
    npx cap sync
    ```

2.  **Konfigurasi Xcode (Wajib)**
    - Buka proyek iOS di Xcode: `npx cap open ios`
    - Di Xcode, pilih folder `App` di sisi kiri, lalu pilih target `App`.
    - Buka tab **`Build Phases`**.
    - Cari bagian **`Copy Bundle Resources`**.
    - Klik tombol **`+`** dan pilih **`Add Other...`**.
    - Navigasikan ke `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/ble_serial.plist` dan tambahkan file tersebut . **Langkah ini sangat penting untuk akses BLE di iOS.**

3.  **Tambahkan Izin di Info.plist**
    Buka file `ios/App/App/Info.plist` dan tambahkan baris berikut agar iOS mengizinkan aplikasi menggunakan Bluetooth .
    ```xml
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>Aplikasi ini perlu akses Bluetooth untuk terhubung ke printer thermal</string>
    <key>NSLocalNetworkUsageDescription</key>
    <string>Aplikasi perlu akses jaringan untuk menemukan printer di jaringan</string>
    <key>NSBonjourServices</key>
    <array>
        <string>_printer._tcp</string>
        <string>_ipp._tcp</string>
    </array>
    ```

### 💡 Mengatasi jika Masih Gagal

Karena kita tidak tahu tipe pastinya, ada satu skenario lagi yang mungkin terjadi: printer menggunakan **Bluetooth Classic** (bukan BLE) atau protokol khusus lain yang memerlukan driver dari pabrik.

Jika langkah di atas tetap tidak bisa mendeteksi printer sama sekali, punya dua opsi terakhir:
1.  **Gunakan Printer dengan AirPrint Bawaan**: Solusi paling mudah adalah menggunakan printer yang mendukung **AirPrint** dari awal. Printer seperti **Brother PJ-773** adalah contohnya . Dengan printer ini, cukup menggunakan tombol **AirPrint** di aplikasi dan semuanya akan berjalan lancar tanpa perlu ribet dengan driver.
2.  **Gunakan Jaringan (WiFi/Ethernet)**: Beberapa printer profesional bisa dihubungkan melalui kabel LAN atau WiFi. Kamu bisa mencari tahu apakah printer memiliki port RJ45 (LAN) atau bisa tersambung ke WiFi. Jika bisa, kita bisa atur agar aplikasi terhubung langsung melalui alamat IP printer .

Jadi, strateginya adalah:
- **Langkah 1:** Coba selesaikan setup Xcode dengan benar (poin 1-3 di atas). Ini adalah satu-satunya cara untuk membuat koneksi BLE berfungsi di iOS.
- **Langkah 2:** Jika semua setup sudah benar tapi tetap tidak ada printer yang muncul saat "Scan BLE", itu pertanda kuat bahwa printer tidak kompatibel dengan BLE. Dalam kasus ini, **tombol AirPrint akan menjadi penyelamat utama**.

Semoga panduan ini bisa menyelesaikan masalahmu. Kalau ada kendala saat setup atau error yang muncul, bisa langsung ditanyakan lagi ya.
# 📱 Masalah Printer Thermal di iOS

Berdasarkan foto yang Anda lampirkan, pesan error **"Tidak didukung di browser ini"** untuk koneksi USB dan Bluetooth di iOS adalah **kendala fundamental dari Safari/WebKit**, bukan bug pada aplikasi Anda.

## 🔍 Penyebab Utama

Apple dengan sengaja **tidak mendukung** WebUSB dan Web Bluetooth API di Safari karena alasan privasi dan keamanan. Ini berlaku untuk **semua browser di iOS** (Chrome, Firefox, dll.) karena Apple mewajibkan semua browser menggunakan mesin WebKit yang sama.

## ✅ Solusi yang Tersedia

### 1. **Native App Wrapper (Paling Direkomendasikan)**

Bungkus aplikasi web Anda dengan **Capacitor** (dari tim Ionic) untuk mengakses native Bluetooth iOS:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install capacitor-thermal-printer
npx cap sync
```

Gunakan plugin ini untuk deteksi printer thermal via Bluetooth di iOS:

```javascript
import { CapacitorThermalPrinter } from 'capacitor-thermal-printer';

// Scan printer
await CapacitorThermalPrinter.startScan();
CapacitorThermalPrinter.addListener('discoverDevices', (devices) => {
  console.log('Printer ditemukan:', devices);
});

// Konek ke printer
const device = await CapacitorThermalPrinter.connect({
  address: 'XX:XX:XX:XX:XX:XX',
});
```

**Setup tambahan untuk iOS** - tambahkan permission di `ios/App/App/Info.plist`:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
```

### 2. **Gunakan Printer dengan Aplikasi Pendamping**

Beberapa printer thermal (seperti LFPERT, TATTMUSE) menyediakan **aplikasi iOS native** sendiri yang bisa dipanggil dari web app Anda menggunakan **URL Scheme**:

```javascript
// Memanggil app printer dari web
window.location.href = "thermalprinter://print?data=your_text";
```

### 3. **Printer dengan MFi Certification**

Pilih printer yang sudah **Apple MFi Certified** seperti Star Micronics SM-T300i, yang memiliki SDK resmi untuk integrasi iOS.

### 4. **Network Printing (Jika Printer Support)**

Ganti koneksi ke **Network (IP/Port)** yang sudah muncul di pilihan Anda:

```javascript
const net = require('net');
const client = new net.Socket();
client.connect(9100, '192.168.1.100', () => {
  client.write(Buffer.from('Hello World\n\n\n'));
});
```

## 📊 Perbandingan Solusi

| Solusi | USB iOS | Bluetooth iOS | Biaya | Kompleksitas |
|--------|---------|---------------|-------|--------------|
| Capacitor Wrapper | ❌ | ✅ | Gratis | Sedang |
| Aplikasi Pendamping | ❌ | ✅ | Gratis | Rendah |
| Printer MFi | ❌ | ✅ | $$$ | Rendah |
| Network Printing | ❌ | ❌ | Gratis | Rendah |

## 🚀 Langkah Implementasi Terbaik

**Rekomendasi saya**: Gunakan **Capacitor + capacitor-thermal-printer** karena:
1. Tetap bisa menggunakan kode web yang sudah ada (Node.js backend tetap sama)
2. Mendukung Bluetooth di iOS dengan performa Swift yang cepat
3. Satu codebase untuk Android & iOS

# 🚀 Solusi Lengkap: Integrasi Printer Thermal di iOS dengan Capacitor

Saya akan bantu Anda membuat aplikasi hybrid yang bisa mendeteksi printer thermal via **Bluetooth** di iOS (karena USB tidak bisa di iOS, fokus ke Bluetooth).

## 📁 Struktur Proyek

```
thermal-printer-app/
├── backend/          # Node.js server (yang sudah ada)
├── mobile/           # Capacitor app baru
│   ├── src/
│   │   └── printer.js
│   ├── ios/
│   └── capacitor.config.json
```

## 🔧 Langkah 1: Setup Capacitor di Proyek Web Anda

```bash
# Di folder root aplikasi web Anda yang sudah ada
cd /path/to/your-web-app

# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/app

# Inisialisasi Capacitor (ganti com.example.app dengan ID unik Anda)
npx cap init "Thermal Printer App" "com.yourcompany.thermalprinter" --web-dir ./

# Install plugin printer thermal untuk Capacitor
npm install @capacitor-community/bluetooth-le
npm install capacitor-thermal-printer
# Atau alternatif:
npm install cordova-plugin-thermal-printer
```

## 📱 Langkah 2: Buat Custom Capacitor Plugin (Jika plugin di atas tidak work)

Buat file `src/printer-plugin.ts`:

```typescript
// src/printer-plugin.ts
import { registerPlugin } from '@capacitor/core';

export interface ThermalPrinterPlugin {
  connectBluetooth(options: { address: string }): Promise<{ success: boolean }>;
  disconnect(): Promise<{ success: boolean }>;
  printText(options: { text: string }): Promise<{ success: boolean }>;
  printImage(options: { base64: string }): Promise<{ success: boolean }>;
  scanDevices(): Promise<{ devices: BluetoothDevice[] }>;
}

export interface BluetoothDevice {
  name: string;
  address: string;
  rssi?: number;
}

const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');
export default ThermalPrinter;
```

## 🍎 Langkah 3: Implementasi iOS Native (Swift)

Buat file `ios/App/App/Plugins/ThermalPrinterPlugin.swift`:

```swift
import Capacitor
import CoreBluetooth

@objc(ThermalPrinterPlugin)
public class ThermalPrinterPlugin: CAPPlugin, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager!
    private var discoveredPeripherals: [CBPeripheral] = []
    private var connectedPeripheral: CBPeripheral?
    private var characteristic: CBCharacteristic?
    private var scanCallback: JSObject?
    
    // Printer thermal ESC/POS commands
    private let ESC: UInt8 = 0x1B
    private let GS: UInt8 = 0x1D
    private let LF: UInt8 = 0x0A
    
    override public func load() {
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    @objc func scanDevices(_ call: CAPPluginCall) {
        self.scanCallback = [
            "call": call,
            "devices": []
        ]
        
        if centralManager.state == .poweredOn {
            centralManager.scanForPeripherals(withServices: nil, options: nil)
            
            // Stop scan after 10 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                self?.centralManager.stopScan()
                call.resolve([
                    "devices": self?.discoveredPeripherals.map { [
                        "name": $0.name ?? "Unknown",
                        "address": $0.identifier.uuidString,
                        "rssi": 0
                    ] } ?? []
                ])
            }
        } else {
            call.reject("Bluetooth not available")
        }
    }
    
    @objc func connectBluetooth(_ call: CAPPluginCall) {
        guard let address = call.getString("address") else {
            call.reject("Address required")
            return
        }
        
        let uuid = UUID(uuidString: address)
        let peripheral = discoveredPeripherals.first { $0.identifier == uuid }
        
        if let peripheral = peripheral {
            centralManager.connect(peripheral, options: nil)
            call.resolve(["success": true])
        } else {
            call.reject("Printer not found")
        }
    }
    
    @objc func printText(_ call: CAPPluginCall) {
        guard let text = call.getString("text"),
              let peripheral = connectedPeripheral,
              let characteristic = characteristic else {
            call.reject("Printer not connected")
            return
        }
        
        // Convert text to ESC/POS format
        var commands = Data()
        
        // Initialize printer
        commands.append(contentsOf: [ESC, 0x40])
        
        // Set alignment center
        commands.append(contentsOf: [ESC, 0x61, 0x01])
        
        // Set bold on
        commands.append(contentsOf: [ESC, 0x45, 0x01])
        
        // Add text
        commands.append(contentsOf: text.data(using: .utf8)!)
        
        // Line feed
        commands.append(contentsOf: [LF, LF, LF])
        
        // Cut paper (if supported)
        commands.append(contentsOf: [GS, 0x56, 0x42, 0x00])
        
        peripheral.writeValue(commands, for: characteristic, type: .withResponse)
        call.resolve(["success": true])
    }
    
    @objc func disconnect(_ call: CAPPluginCall) {
        if let peripheral = connectedPeripheral {
            centralManager.cancelPeripheralConnection(peripheral)
            connectedPeripheral = nil
            characteristic = nil
        }
        call.resolve(["success": true])
    }
    
    // MARK: - CBCentralManagerDelegate
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("Bluetooth is powered on")
        case .poweredOff:
            print("Bluetooth is powered off")
        default:
            break
        }
    }
    
    public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        if !discoveredPeripherals.contains(where: { $0.identifier == peripheral.identifier }) {
            discoveredPeripherals.append(peripheral)
        }
    }
    
    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        connectedPeripheral = peripheral
        peripheral.delegate = self
        peripheral.discoverServices(nil)
    }
    
    public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("Failed to connect: \(error?.localizedDescription ?? "")")
    }
    
    // MARK: - CBPeripheralDelegate
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }
        
        // Find characteristic that supports write
        for char in characteristics {
            if char.properties.contains(.write) || char.properties.contains(.writeWithoutResponse) {
                characteristic = char
                break
            }
        }
    }
}
```

## 📄 Langkah 4: Register Plugin di Capacitor

Buat file `ios/App/App/Plugins/ThermalPrinterPlugin.m`:

```objective-c
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(ThermalPrinterPlugin, "ThermalPrinter",
    CAP_PLUGIN_METHOD(scanDevices, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(connectBluetooth, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(printText, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disconnect, CAPPluginReturnPromise);
)
```

## 🌐 Langkah 5: Frontend JavaScript untuk iOS

Update file HTML/JS Anda:

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer iOS</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont; padding: 20px; }
        button { 
            background: #007AFF; color: white; border: none; 
            padding: 12px 24px; border-radius: 10px; margin: 5px;
            font-size: 16px;
        }
        .device-list { margin-top: 20px; }
        .device-item { 
            padding: 12px; background: #f0f0f0; margin: 5px 0; 
            border-radius: 8px; cursor: pointer;
        }
        .status { padding: 10px; margin: 10px 0; border-radius: 8px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>🖨️ Printer Thermal</h1>
    
    <div id="status" class="status">Status: Siap</div>
    
    <button id="scanBtn">🔍 Scan Printer</button>
    <button id="printTestBtn" disabled>📄 Test Print</button>
    <button id="disconnectBtn" disabled>🔌 Disconnect</button>
    
    <div id="deviceList" class="device-list">
        <p>Klik Scan untuk mencari printer...</p>
    </div>
    
    <textarea id="printText" rows="5" placeholder="Masukkan teks untuk dicetak..." style="width:100%; margin-top:20px; padding:10px;">
============================
      THERMAL PRINTER
============================
Tanggal: 2026-04-23
Item 1: Rp 10.000
Item 2: Rp 25.000
--------------------------
Total: Rp 35.000
--------------------------
    Terima kasih!
    </textarea>

    <script>
        let connectedDevice = null;
        let isWebView = false;
        let ThermalPrinter = null;
        
        // Deteksi apakah di Capacitor atau browser biasa
        if (window.Capacitor) {
            isWebView = true;
            ThermalPrinter = Capacitor.Plugins.ThermalPrinter;
            updateStatus("Mode iOS Native - Bluetooth siap", "success");
        } else {
            updateStatus("Mode Web - Gunakan koneksi Network/Serial", "error");
            // Fallback ke Network printing
            setupNetworkPrinting();
        }
        
        function updateStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = `Status: ${message}`;
            statusDiv.className = `status ${type || ''}`;
        }
        
        // Scan printer via Bluetooth (iOS Native)
        async function scanPrinters() {
            if (!isWebView || !ThermalPrinter) {
                updateStatus("Fitur scan hanya tersedia di aplikasi iOS", "error");
                return;
            }
            
            updateStatus("Mencari printer... (10 detik)", "");
            
            try {
                const result = await ThermalPrinter.scanDevices();
                const devices = result.devices || [];
                
                const deviceListDiv = document.getElementById('deviceList');
                
                if (devices.length === 0) {
                    deviceListDiv.innerHTML = '<p>❌ Tidak ada printer ditemukan. Pastikan printer Bluetooth menyala.</p>';
                    updateStatus("Tidak ada printer ditemukan", "error");
                } else {
                    deviceListDiv.innerHTML = '<h3>📱 Printer ditemukan:</h3>';
                    devices.forEach(device => {
                        const deviceEl = document.createElement('div');
                        deviceEl.className = 'device-item';
                        deviceEl.innerHTML = `
                            <strong>${device.name || 'Unknown Printer'}</strong><br>
                            <small>Address: ${device.address}</small>
                        `;
                        deviceEl.onclick = () => connectToPrinter(device);
                        deviceListDiv.appendChild(deviceEl);
                    });
                    updateStatus(`Ditemukan ${devices.length} printer`, "success");
                }
            } catch (error) {
                updateStatus(`Error scan: ${error.message}`, "error");
                console.error(error);
            }
        }
        
        // Connect ke printer yang dipilih
        async function connectToPrinter(device) {
            if (!isWebView) return;
            
            updateStatus(`Menghubungkan ke ${device.name}...`, "");
            
            try {
                const result = await ThermalPrinter.connectBluetooth({ 
                    address: device.address 
                });
                
                if (result.success) {
                    connectedDevice = device;
                    updateStatus(`Terhubung ke ${device.name}`, "success");
                    
                    // Enable print button
                    document.getElementById('printTestBtn').disabled = false;
                    document.getElementById('disconnectBtn').disabled = false;
                    document.getElementById('scanBtn').disabled = true;
                }
            } catch (error) {
                updateStatus(`Gagal konek: ${error.message}`, "error");
            }
        }
        
        // Print teks
        async function printText() {
            if (!isWebView || !connectedDevice) {
                updateStatus("Printer tidak terhubung", "error");
                return;
            }
            
            const text = document.getElementById('printText').value;
            updateStatus("Mencetak...", "");
            
            try {
                const result = await ThermalPrinter.printText({ text: text });
                
                if (result.success) {
                    updateStatus("✅ Cetak berhasil!", "success");
                }
            } catch (error) {
                updateStatus(`❌ Gagal cetak: ${error.message}`, "error");
            }
        }
        
        // Disconnect printer
        async function disconnectPrinter() {
            if (!isWebView) return;
            
            try {
                await ThermalPrinter.disconnect();
                connectedDevice = null;
                updateStatus("Terputus dari printer", "");
                
                document.getElementById('printTestBtn').disabled = true;
                document.getElementById('disconnectBtn').disabled = true;
                document.getElementById('scanBtn').disabled = false;
            } catch (error) {
                updateStatus(`Gagal disconnect: ${error.message}`, "error");
            }
        }
        
        // Fallback: Network printing (untuk browser biasa dan Android WebView)
        function setupNetworkPrinting() {
            // Ganti dengan IP printer thermal Anda
            const PRINTER_IP = "192.168.1.100";
            const PRINTER_PORT = 9100;
            
            window.printViaNetwork = async function(text) {
                try {
                    // Kirim ke Node.js backend yang sudah ada
                    const response = await fetch('http://localhost:3000/print', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: text, ip: PRINTER_IP, port: PRINTER_PORT })
                    });
                    
                    if (response.ok) {
                        updateStatus("✅ Cetak via network berhasil!", "success");
                    }
                } catch (error) {
                    updateStatus(`Network print error: ${error.message}`, "error");
                }
            };
            
            // Override print function
            window.printText = window.printViaNetwork;
        }
        
        // Event listeners
        document.getElementById('scanBtn').addEventListener('click', scanPrinters);
        document.getElementById('printTestBtn').addEventListener('click', printText);
        document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
        
        // Informasi tambahan untuk pengguna iOS
        if (window.Capacitor && Capacitor.getPlatform() === 'ios') {
            const infoDiv = document.createElement('div');
            infoDiv.style.background = '#e7f3ff';
            infoDiv.style.padding = '12px';
            infoDiv.style.borderRadius = '8px';
            infoDiv.style.marginTop = '20px';
            infoDiv.innerHTML = `
                <strong>💡 Tips untuk iOS:</strong><br>
                1. Pastikan Bluetooth printer menyala<br>
                2. Izinkan akses Bluetooth saat diminta<br>
                3. Printer harus dalam mode pairing<br>
                4. Beberapa printer perlu dinyalakan ulang
            `;
            document.body.appendChild(infoDiv);
        }
    </script>
    
    <script src="https://unpkg.com/@capacitor/core@latest/dist/index.js"></script>
</body>
</html>
```

## 🛠️ Langkah 6: Backend Node.js (Network Printing Fallback)

Update backend Anda untuk support network printing:

```javascript
// backend/server.js
const express = require('express');
const net = require('net');
const app = express();
app.use(express.json());

// ESC/POS commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

function createPrintData(text) {
    const buffers = [];
    
    // Initialize printer
    buffers.push(Buffer.from([ESC, 0x40]));
    
    // Set alignment center
    buffers.push(Buffer.from([ESC, 0x61, 0x01]));
    
    // Set bold on
    buffers.push(Buffer.from([ESC, 0x45, 0x01]));
    
    // Add text
    buffers.push(Buffer.from(text, 'utf-8'));
    
    // Line feeds
    buffers.push(Buffer.from([LF, LF, LF]));
    
    // Cut paper
    buffers.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
    
    return Buffer.concat(buffers);
}

app.post('/print', (req, res) => {
    const { text, ip, port = 9100 } = req.body;
    
    const client = new net.Socket();
    const printData = createPrintData(text);
    
    client.connect(port, ip, () => {
        client.write(printData);
        client.end();
        res.json({ success: true, message: 'Printed successfully' });
    });
    
    client.on('error', (err) => {
        console.error('Print error:', err);
        res.status(500).json({ success: false, error: err.message });
    });
});

app.listen(3000, () => {
    console.log('Print server running on port 3000');
});
```

## 📱 Langkah 7: Build iOS App

```bash
# Sync Capacitor
npx cap sync ios

# Tambahkan permission ke Info.plist (otomatis atau manual)
# Buka ios/App/App/Info.plist dan tambahkan:
```

Tambahkan di `ios/App/App/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
<key>UISupportedExternalAccessoryProtocols</key>
<array>
    <string>com.yourcompany.thermalprinter</string>
</array>
```

```bash
# Build dan buka di Xcode
npx cap open ios

# Di Xcode:
# 1. Pilih target device (iPhone)
# 2. Klik Product > Archive
# 3. Distribute via TestFlight atau App Store
```

## 📋 Checklist untuk iOS

- [ ] Printer thermal Anda harus **Bluetooth (BLE)** atau **Bluetooth Classic**
- [ ] Pastikan printer bisa dipairing dengan iPhone via Settings > Bluetooth
- [ ] Beberapa printer murah mungkin tidak kompatibel dengan iOS karena chipset tertentu

## 🆘 Jika Tetap Tidak Bisa

**Pilihan Terakhir - Gunakan PWA + Safari "Add to Home Screen":**

```javascript
// Deteksi user agent iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (isIOS && !window.Capacitor) {
    alert(
        "⚠️ Untuk mencetak di iPhone/iPad:\n\n" +
        "1. Tap Share button (⎙)\n" +
        "2. Pilih 'Add to Home Screen'\n" +
        "3. Buka aplikasi dari Home Screen\n\n" +
        "Atau gunakan printer dengan koneksi Network (IP/Port)"
# 🚀 Solusi Spesifik untuk Printer Thermal Bluetooth BLE 4.0+ di iOS

Berdasarkan riset, ada **plugin Capacitor yang sudah terbukti bekerja** untuk printer thermal BLE di iOS dengan kecepatan tinggi. Berikut implementasi lengkapnya.

---

## 📦 Pilihan Plugin Terbaik untuk BLE 4.0+

### ✅ Rekomendasi Utama: `capacitor-thermal-printer`

Plugin ini **sudah menggunakan RTPrinter SDK resmi dari Rongta Technology** dan diklaim memiliki kecepatan **Swift-level di iOS** untuk BLE .

```bash
# Instalasi di project web Anda
npm install capacitor-thermal-printer --save
npx cap sync
```

### 📱 Setup iOS Tambahan (WAJIB)

Plugin ini memerlukan file resource tambahan. Buka project iOS di Xcode:

```bash
npx cap open ios
```

**Langkah di Xcode:**
1. Di sidebar kiri, pilih project "App"
2. Pilih target utama "App"
3. Buka tab **"Build Phases"**
4. Cari **"Copy Bundle Resources"**
5. Klik **"+"** → **"Add Other..."**
6. Navigasi ke `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/ble_serial.plist`
7. Pilih file tersebut 

---

## 💻 Kode Lengkap Frontend (HTML/JS)

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer BLE iOS</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; 
            padding: 20px; 
            background: #f5f5f5;
            margin: 0;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        button { 
            background: #007AFF; 
            color: white; 
            border: none; 
            padding: 14px 24px; 
            border-radius: 12px; 
            margin: 5px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
        }
        button:active { opacity: 0.8; }
        button:disabled { background: #ccc; opacity: 0.6; }
        .btn-secondary { background: #5856D6; }
        .btn-danger { background: #FF3B30; }
        .btn-success { background: #34C759; }
        .device-list { margin-top: 16px; }
        .device-item { 
            padding: 14px; 
            background: #f8f9fa; 
            margin: 8px 0; 
            border-radius: 12px; 
            cursor: pointer;
            border: 1px solid #e5e5e5;
            transition: 0.2s;
        }
        .device-item:active { background: #e9ecef; }
        .device-name { font-weight: 600; font-size: 16px; }
        .device-address { font-size: 12px; color: #666; margin-top: 4px; }
        .status { 
            padding: 12px; 
            margin: 12px 0; 
            border-radius: 12px; 
            font-weight: 500;
        }
        .status-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .status-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
        .status-info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8; }
        .status-warning { background: #fff3cd; color: #856404; border-left: 4px solid #ffc107; }
        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 12px;
            font-family: monospace;
            font-size: 14px;
            margin-top: 12px;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #e9ecef;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1>🖨️ Printer Thermal BLE</h1>
        <p><span class="badge" id="platformBadge">Mendeteksi platform...</span></p>
    </div>

    <div class="card">
        <div id="status" class="status status-info">⚡ Status: Siap</div>
        
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0;">
            <button id="scanBtn">🔍 Scan Printer BLE</button>
            <button id="printTestBtn" disabled>📄 Test Print</button>
            <button id="disconnectBtn" disabled>🔌 Disconnect</button>
        </div>
        
        <div id="deviceList" class="device-list">
            <p style="color: #666; text-align: center;">Klik "Scan Printer BLE" untuk mencari printer...</p>
        </div>
    </div>

    <div class="card">
        <label style="font-weight: 600;">📝 Konten Cetak:</label>
        <textarea id="printText" rows="6">
============================
      THERMAL PRINTER
============================
Tanggal: 2026-04-23
Waktu: 14:30 WIB
--------------------------
Item 1: Kopi          15.000
Item 2: Roti Bakar    12.000
Item 3: Air Mineral    5.000
--------------------------
Subtotal:             32.000
Pajak 10%:             3.200
--------------------------
TOTAL:              Rp 35.200
--------------------------
Terima kasih!
Kunjungi kami lagi

[QR: https://example.com]
        </textarea>
        
        <div style="margin-top: 12px;">
            <button id="printCustomBtn" disabled class="btn-success">🖨️ Cetak Konten di Atas</button>
        </div>
    </div>
    
    <div class="card">
        <p style="margin: 0; font-size: 12px; color: #666;">
            💡 <strong>Tips untuk iOS BLE:</strong><br>
            • Pastikan printer dalam mode pairing (biasanya lampu biru berkedip)<br>
            • Izinkan akses Bluetooth saat diminta<br>
            • Untuk printer BLE, scan akan menemukan semua perangkat Bluetooth terdekat<br>
            • Koneksi BLE lebih hemat baterai dibanding Bluetooth klasik
        </p>
    </div>
</div>

<script>
    let connectedDevice = null;
    let isCapacitor = false;
    let ThermalPrinter = null;

    // Deteksi platform
    function detectPlatform() {
        const badge = document.getElementById('platformBadge');
        if (window.Capacitor) {
            const platform = Capacitor.getPlatform();
            isCapacitor = true;
            if (platform === 'ios') {
                badge.textContent = '📱 iOS Native - BLE Supported';
                badge.style.background = '#34C759';
                badge.style.color = 'white';
                updateStatus('Mode iOS: Bluetooth BLE siap digunakan', 'success');
                // Load plugin
                ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
            } else if (platform === 'android') {
                badge.textContent = '🤖 Android - BLE Supported';
                badge.style.background = '#3DDC84';
                badge.style.color = 'black';
                updateStatus('Mode Android: Bluetooth BLE siap digunakan', 'success');
                ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
            }
        } else {
            badge.textContent = '🌐 Web Browser - Gunakan Network Printing';
            badge.style.background = '#FF9500';
            badge.style.color = 'white';
            updateStatus('Mode Web: Gunakan koneksi Network (IP/Port) untuk mencetak', 'warning');
        }
    }

    function updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = `⚡ Status: ${message}`;
        statusDiv.className = `status status-${type || 'info'}`;
    }

    // ========== SCAN PRINTER BLE ==========
    async function scanPrinters() {
        if (!isCapacitor || !ThermalPrinter) {
            updateStatus('Fitur scan hanya tersedia di aplikasi native (Capacitor)', 'error');
            return;
        }

        updateStatus('Mencari printer Bluetooth BLE... (15 detik)', 'info');
        
        const deviceListDiv = document.getElementById('deviceList');
        deviceListDiv.innerHTML = '<p style="color: #666; text-align: center;">🔍 Scanning... Mohon tunggu</p>';
        
        try {
            // Start scan - di iOS akan mendeteksi semua device BLE di sekitar 
            await ThermalPrinter.startScan();
            
            // Listener untuk device yang ditemukan
            ThermalPrinter.addListener('discoverDevices', (devices) => {
                console.log('Devices found:', devices);
                
                if (!devices || devices.length === 0) {
                    deviceListDiv.innerHTML = `
                        <p style="color: #666; text-align: center;">
                        ❌ Tidak ada printer ditemukan.<br>
                        <small>Pastikan printer Bluetooth BLE menyala dan dalam mode pairing.</small>
                        </p>`;
                    updateStatus('Tidak ada printer BLE ditemukan', 'warning');
                    return;
                }
                
                // Filter untuk menampilkan semua device (di iOS semua BLE device akan muncul) 
                deviceListDiv.innerHTML = '<h3 style="margin-bottom: 12px;">📱 Printer BLE Ditemukan:</h3>';
                
                devices.forEach(device => {
                    const deviceEl = document.createElement('div');
                    deviceEl.className = 'device-item';
                    deviceEl.innerHTML = `
                        <div class="device-name">${device.name || 'Unknown BLE Device'}</div>
                        <div class="device-address">Address: ${device.address || device.deviceId || 'N/A'}</div>
                    `;
                    deviceEl.onclick = () => connectToPrinter(device);
                    deviceListDiv.appendChild(deviceEl);
                });
                
                updateStatus(`Ditemukan ${devices.length} perangkat BLE. Klik untuk konek.`, 'success');
                
                // Stop scan setelah menemukan device
                // Catatan: beberapa plugin perlu stop scan manual
                if (ThermalPrinter.stopScan) {
                    setTimeout(() => ThermalPrinter.stopScan(), 5000);
                }
            });
            
        } catch (error) {
            console.error('Scan error:', error);
            updateStatus(`Error scan: ${error.message || error}`, 'error');
            deviceListDiv.innerHTML = `<p style="color: red;">❌ Gagal scan: ${error.message || error}</p>`;
        }
    }

    // ========== CONNECT KE PRINTER BLE ==========
    async function connectToPrinter(device) {
        if (!isCapacitor || !ThermalPrinter) return;
        
        const deviceAddress = device.address || device.deviceId;
        const deviceName = device.name || 'Printer';
        
        updateStatus(`Menghubungkan ke ${deviceName}...`, 'info');
        
        try {
            // Method connect dari capacitor-thermal-printer 
            const result = await ThermalPrinter.connect({ 
                address: deviceAddress 
            });
            
            if (result && result !== null) {
                connectedDevice = {
                    name: deviceName,
                    address: deviceAddress
                };
                updateStatus(`✅ Terhubung ke ${deviceName}`, 'success');
                
                // Enable buttons
                document.getElementById('printTestBtn').disabled = false;
                document.getElementById('printCustomBtn').disabled = false;
                document.getElementById('disconnectBtn').disabled = false;
                document.getElementById('scanBtn').disabled = true;
                
                // Optional: get printer info
                if (ThermalPrinter.getPrinterInfo) {
                    const info = await ThermalPrinter.getPrinterInfo();
                    console.log('Printer info:', info);
                }
            } else {
                updateStatus(`❌ Gagal konek ke ${deviceName}`, 'error');
            }
        } catch (error) {
            console.error('Connection error:', error);
            updateStatus(`Gagal konek: ${error.message || error}`, 'error');
        }
    }

    // ========== CETAK DENGAN FORMAT RICH (RECEIPT) ==========
    async function printRichReceipt() {
        if (!isCapacitor || !ThermalPrinter || !connectedDevice) {
            updateStatus('Printer tidak terhubung', 'error');
            return;
        }
        
        updateStatus('Mencetak receipt...', 'info');
        
        try {
            // Gunakan chain API dari capacitor-thermal-printer 
            await ThermalPrinter.begin()
                // Initialize printer
                .initialize()
                
                // Center alignment
                .align('center')
                
                // Optional: Add image/logo (gunakan URL gambar)
                // .image('https://example.com/logo.png')
                
                // Bold and underline text
                .bold()
                .underline()
                .text('TOKO ANDA\n')
                .clearFormatting()
                
                .text('Jl. Contoh No. 123\n')
                .text('Telp: (021) 1234567\n')
                
                .newline()
                
                // Double width for header
                .doubleWidth()
                .text('STRUK PEMBELIAN\n')
                .clearFormatting()
                
                .newline()
                
                // Left alignment for items
                .align('left')
                .text('Item               Qty   Harga\n')
                .text('--------------------------------\n')
                .text('Kopi               2   30,000\n')
                .text('Roti Bakar         1   12,000\n')
                .text('Air Mineral        1    5,000\n')
                .text('--------------------------------\n')
                
                // Right alignment for total
                .align('right')
                .doubleWidth()
                .text('TOTAL: Rp 47,000\n')
                .clearFormatting()
                
                .newline()
                
                // Center alignment for footer
                .align('center')
                .text('Terima kasih atas kunjungan Anda!\n')
                .text('Simpan struk ini sebagai bukti pembayaran\n')
                
                .newline()
                
                // Optional: QR Code
                .qr('https://example.com/invoice/12345')
                
                .newline()
                .newline()
                
                // Cut paper
                .cutPaper()
                
                // Execute print
                .write()
                .then(() => {
                    updateStatus('✅ Cetak receipt berhasil!', 'success');
                })
                .catch((e) => {
                    console.error('Print error:', e);
                    updateStatus(`❌ Gagal cetak: ${e.message || e}`, 'error');
                });
                
        } catch (error) {
            console.error('Print error:', error);
            updateStatus(`Gagal cetak: ${error.message || error}`, 'error');
        }
    }

    // ========== CETAK TEKS KUSTOM ==========
    async function printCustomText() {
        if (!isCapacitor || !ThermalPrinter || !connectedDevice) {
            updateStatus('Printer tidak terhubung', 'error');
            return;
        }
        
        const customText = document.getElementById('printText').value;
        updateStatus('Mencetak teks kustom...', 'info');
        
        try {
            await ThermalPrinter.begin()
                .initialize()
                .align('center')
                .text(customText)
                .newline()
                .newline()
                .cutPaper()
                .write()
                .then(() => {
                    updateStatus('✅ Cetak teks berhasil!', 'success');
                })
                .catch((e) => {
                    updateStatus(`❌ Gagal cetak: ${e.message || e}`, 'error');
                });
        } catch (error) {
            updateStatus(`Gagal cetak: ${error.message || error}`, 'error');
        }
    }

    // ========== DISCONNECT ==========
    async function disconnectPrinter() {
        if (!isCapacitor || !ThermalPrinter) return;
        
        updateStatus('Memutuskan koneksi...', 'info');
        
        try {
            // Beberapa implementasi perlu disconnect manual
            if (ThermalPrinter.disconnect) {
                await ThermalPrinter.disconnect();
            }
            
            connectedDevice = null;
            updateStatus('Koneksi terputus', 'info');
            
            document.getElementById('printTestBtn').disabled = true;
            document.getElementById('printCustomBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = true;
            document.getElementById('scanBtn').disabled = false;
            
        } catch (error) {
            console.error('Disconnect error:', error);
            updateStatus(`Gagal disconnect: ${error.message || error}`, 'error');
        }
    }

    // ========== NETWORK PRINTING FALLBACK (untuk Web Browser) ==========
    async function printViaNetwork() {
        const text = document.getElementById('printText').value;
        
        // Ganti dengan IP printer thermal Anda yang support network
        const PRINTER_IP = "192.168.1.100";
        const PRINTER_PORT = 9100;
        
        updateStatus('Mencetak via Network...', 'info');
        
        try {
            // Kirim ke backend Node.js
            const response = await fetch('http://localhost:3000/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text, 
                    ip: PRINTER_IP, 
                    port: PRINTER_PORT 
                })
            });
            
            if (response.ok) {
                updateStatus('✅ Cetak via Network berhasil!', 'success');
            } else {
                throw new Error('Gagal kirim ke printer');
            }
        } catch (error) {
            updateStatus(`❌ Network print error: ${error.message}`, 'error');
        }
    }

    // ========== EVENT LISTENERS ==========
    document.getElementById('scanBtn').addEventListener('click', scanPrinters);
    document.getElementById('printTestBtn').addEventListener('click', printRichReceipt);
    document.getElementById('printCustomBtn').addEventListener('click', () => {
        if (isCapacitor && connectedDevice) {
            printCustomText();
        } else {
            printViaNetwork();
        }
    });
    document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
    
    // Inisialisasi
    detectPlatform();
</script>

<!-- Capacitor Web Runtime -->
<script src="https://unpkg.com/@capacitor/core@5.0.0/dist/index.js"></script>
</body>
</html>
```

---

## 🔧 Alternatif Plugin Lain

Jika plugin utama tidak bekerja dengan printer spesifik Anda, coba pendekatan alternatif:

### Opsi 1: Manual BLE dengan `@capacitor-community/bluetooth-le`

Untuk kontrol lebih granular atas koneksi BLE:

```javascript
import { BleClient } from '@capacitor-community/bluetooth-le';

async function connectBLE() {
    await BleClient.initialize();
    
    // Scan untuk device BLE
    const devices = await BleClient.requestDevice({
        services: ['000018f0-0000-1000-8000-00805f9b34fb'] // Service printer umum
    });
    
    await BleClient.connect(devices.deviceId);
    
    // Cari characteristic untuk print
    const services = await BleClient.getServices(devices.deviceId);
    // ... kirim data ESC/POS ke characteristic yang sesuai
}
```

### Opsi 2: Swift Native Framework (Printer)

Untuk performa maksimal, Anda bisa menggunakan framework Swift `Printer` via CocoaPods :

```ruby
# Podfile
pod 'Printer'
```

---

## 📋 Perbandingan Metode

| Metode | Kecepatan iOS BLE | Kemudahan Implementasi | Support ESC/POS |
|--------|-------------------|------------------------|-----------------|
| `capacitor-thermal-printer` | ⚡ Sangat Cepat  | Mudah (Chain API) | ✅ Lengkap |
| `@capacitor-community/bluetooth-le` | 🐌 Lambat (manual encoding)  | Sulit | ❌ Perlu manual |
| Network Printing (IP/Port) | ⚡ Cepat | Mudah | ✅ via raw socket |

---

## ✅ Kesimpulan

**Gunakan `capacitor-thermal-printer`** karena:
1. Sudah menggunakan **RTPrinter SDK resmi** dari Rongta Technology 
2. Performa **Swift-level di iOS** untuk BLE
3. API **chain method** yang mirip dengan esc-pos encoder
4. Support **gambar, QR code, barcode, cut paper** lengkap

Jika printer BLE Anda tetap tidak terdeteksi, kemungkinan printer menggunakan **Bluetooth Classic** (bukan BLE). Dalam kasus ini, printer tidak akan bisa terhubung di iOS melalui Web Bluetooth atau Capacitor sekalipun, karena iOS hanya mengizinkan BLE untuk akses Bluetooth dari aplikasi . Solusinya adalah menggunakan **printer dengan dukungan AirPrint** atau **koneksi Network (WiFi/Ethernet)** .

Menggunakan pendekatan **'dual-mode'** yang cerdas: aplikasi akan mencoba koneksi BLE (Bluetooth Low Energy) secara otomatis. Jika gagal, pengguna akan langsung dialihkan ke opsi **AirPrint**, yang merupakan standar bawaan iOS dan pasti berfungsi untuk semua printer .

Berikut adalah kode utama yang bisa langsung coba.

### 📝 Kode Lengkap untuk HTML/JS (Frontend)

Buat atau ganti file utama aplikasi web (misalnya `index.html`) dengan kode di bawah. Kode ini sudah mencakup deteksi otomatis dan fallback ke AirPrint.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer - iOS</title>
    <style>
        /* --- Styling Minimalis --- */
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; 
            padding: 20px; 
            background: #f5f5f5;
            margin: 0;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        button { 
            background: #007AFF; 
            color: white; 
            border: none; 
            padding: 12px 20px; 
            border-radius: 12px; 
            margin: 5px 5px 5px 0;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        button:active { opacity: 0.8; }
        button:disabled { background: #ccc; opacity: 0.6; }
        .btn-airprint { background: #5856D6; }
        .btn-danger { background: #FF3B30; }
        .status { 
            padding: 12px; 
            margin: 12px 0; 
            border-radius: 12px; 
            font-weight: 500;
        }
        .status-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .status-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
        .status-info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b2; }
        .device-list { margin-top: 16px; }
        .device-item { 
            padding: 14px; 
            background: #f8f9fa; 
            margin: 8px 0; 
            border-radius: 12px; 
            cursor: pointer;
            border: 1px solid #e5e5e5;
        }
        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 12px;
            font-family: monospace;
            font-size: 14px;
            margin-top: 12px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #e9ecef;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1>🖨️ Printer Thermal</h1>
        <p><span class="badge" id="platformBadge">Memuat...</span></p>
    </div>

    <div class="card">
        <div id="status" class="status status-info">⚡ Status: Siap</div>
        
        <div style="margin: 16px 0;">
            <button id="scanBtn">🔍 1. Scan BLE</button>
            <button id="airprintBtn" class="btn-airprint">🍎 2. AirPrint (Universal)</button>
            <button id="disconnectBtn" disabled>🔌 Putus</button>
        </div>
        
        <div id="deviceList" class="device-list">
            <p style="color: #666; text-align: center;">Klik "Scan BLE" atau langsung gunakan AirPrint.</p>
        </div>
    </div>

    <div class="card">
        <label style="font-weight: 600;">📝 Konten Cetak:</label>
        <textarea id="printText" rows="6">
============================
      TOKO ANDA
============================
Tanggal: 2026-04-23
--------------------------
Item 1     2 x 10.000
Item 2     1 x 25.000
--------------------------
TOTAL: Rp 45.000
--------------------------
Terima kasih!
        </textarea>
        
        <button id="printBtn" disabled style="margin-top: 12px; width: 100%;">🖨️ Cetak Struk</button>
    </div>
</div>

<script>
    // ==================== INISIALISASI ====================
    let connectedDevice = null;
    let isCapacitor = false;
    let ThermalPrinter = null;

    function detectPlatform() {
        const badge = document.getElementById('platformBadge');
        // Cek apakah dijalankan di aplikasi Capacitor (iOS/Android native)
        if (window.Capacitor && Capacitor.getPlatform() === 'ios') {
            isCapacitor = true;
            badge.textContent = '📱 Mode Aplikasi iOS';
            badge.style.background = '#34C759';
            badge.style.color = 'white';
            updateStatus('Mode Aplikasi: Mencoba BLE, fallback ke AirPrint siap.', 'success');
            
            // Muat Plugin Thermal Printer
            ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
        } else if (window.Capacitor && Capacitor.getPlatform() === 'android') {
            badge.textContent = '🤖 Mode Aplikasi Android';
            badge.style.background = '#3DDC84';
            badge.style.color = 'black';
            updateStatus('Mode Android: Bluetooth siap digunakan.', 'success');
            ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
        } else {
            // Ini berjalan di Safari atau browser biasa, tidak bisa akses hardware native
            badge.textContent = '🌐 Browser Web';
            badge.style.background = '#FF9500';
            badge.style.color = 'white';
            updateStatus('Akses printer terbatas. Gunakan AirPrint atau buka melalui aplikasi iOS.', 'warning');
            document.getElementById('scanBtn').disabled = true;
            document.getElementById('airprintBtn').disabled = false; // AirPrint via share sheet masih bisa
        }
    }

    function updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = `⚡ Status: ${message}`;
        statusDiv.className = `status status-${type || 'info'}`;
    }

    // ==================== FUNGSI BLE (Untuk Printer yang Support) ====================
    async function scanPrinters() {
        if (!isCapacitor || !ThermalPrinter) {
            updateStatus('Fitur scan hanya tersedia di aplikasi native.', 'error');
            return;
        }

        updateStatus('Mencari printer BLE... (15 detik)', 'info');
        const deviceListDiv = document.getElementById('deviceList');
        deviceListDiv.innerHTML = '<p style="color: #666; text-align: center;">🔍 Scanning... Mohon tunggu</p>';
        
        try {
            // Mulai scan
            await ThermalPrinter.startScan();
            
            // Tangkap event device yang ditemukan
            ThermalPrinter.addListener('discoverDevices', (devices) => {
                console.log('Devices found:', devices);
                
                if (!devices || devices.length === 0) {
                    deviceListDiv.innerHTML = `<p style="color: #666; text-align: center;">❌ Tidak ada perangkat BLE ditemukan.<br><small>Pastikan printer menyala. Coba tombol AirPrint sebagai alternatif.</small></p>`;
                    updateStatus('Tidak ada perangkat BLE ditemukan. Gunakan AirPrint.', 'warning');
                    return;
                }
                
                deviceListDiv.innerHTML = '<h3 style="margin-bottom: 12px;">📱 Perangkat BLE Ditemukan:</h3>';
                devices.forEach(device => {
                    const deviceEl = document.createElement('div');
                    deviceEl.className = 'device-item';
                    deviceEl.innerHTML = `
                        <div style="font-weight: 600;">${device.name || 'Perangkat Tanpa Nama'}</div>
                        <div style="font-size: 12px; color: #666;">ID: ${device.address || device.deviceId || 'N/A'}</div>
                    `;
                    deviceEl.onclick = () => connectToPrinter(device);
                    deviceListDiv.appendChild(deviceEl);
                });
                
                updateStatus(`Ditemukan ${devices.length} perangkat. Klik untuk konek.`, 'success');
                
                // Hentikan scan setelah beberapa detik
                if (ThermalPrinter.stopScan) {
                    setTimeout(() => ThermalPrinter.stopScan(), 5000);
                }
            });
        } catch (error) {
            console.error(error);
            updateStatus(`Error scan: ${error.message || error}. Coba AirPrint.`, 'error');
            deviceListDiv.innerHTML = `<p style="color: red;">❌ Gagal scan: ${error.message || error}</p>`;
        }
    }

    async function connectToPrinter(device) {
        if (!isCapacitor || !ThermalPrinter) return;
        
        const deviceId = device.address || device.deviceId;
        const deviceName = device.name || 'Printer';
        
        updateStatus(`Menghubungkan ke ${deviceName}...`, 'info');
        
        try {
            // Method connect dari plugin capacitor-thermal-printer 
            const result = await ThermalPrinter.connect({ address: deviceId });
            
            if (result && result !== null) {
                connectedDevice = { name: deviceName, id: deviceId };
                updateStatus(`✅ Terhubung ke ${deviceName}`, 'success');
                
                // Aktifkan tombol cetak
                document.getElementById('printBtn').disabled = false;
                document.getElementById('disconnectBtn').disabled = false;
                document.getElementById('scanBtn').disabled = true;
            } else {
                updateStatus(`❌ Gagal konek ke ${deviceName}. Coba AirPrint.`, 'error');
            }
        } catch (error) {
            console.error(error);
            updateStatus(`Gagal konek: ${error.message || error}. Coba AirPrint.`, 'error');
        }
    }

    async function printViaBLE() {
        if (!connectedDevice || !ThermalPrinter) {
            updateStatus('Tidak ada printer BLE yang terhubung.', 'error');
            return false;
        }
        
        const text = document.getElementById('printText').value;
        updateStatus('Mencetak via BLE...', 'info');
        
        try {
            // Menggunakan chain API untuk format cetak yang lebih baik 
            await ThermalPrinter.begin()
                .initialize()
                .align('center')
                .text(text)
                .newline()
                .newline()
                .cutPaper()
                .write();
            
            updateStatus('✅ Cetak via BLE berhasil!', 'success');
            return true;
        } catch (error) {
            console.error('BLE Print error:', error);
            updateStatus(`❌ Gagal cetak BLE: ${error.message || error}`, 'error');
            return false;
        }
    }

    async function disconnectPrinter() {
        if (!isCapacitor || !ThermalPrinter) return;
        
        updateStatus('Memutuskan koneksi...', 'info');
        try {
            if (ThermalPrinter.disconnect) await ThermalPrinter.disconnect();
            connectedDevice = null;
            updateStatus('Koneksi terputus.', 'info');
            
            document.getElementById('printBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = true;
            document.getElementById('scanBtn').disabled = false;
        } catch (error) {
            console.error(error);
        }
    }

    // ==================== FUNGSI AIRPRINT (FALLBACK UNIVERSAL) ====================
    // Fungsi ini akan memunculkan dialog print native iOS, cocok untuk SEMUA printer 
    async function printViaAirPrint() {
        const text = document.getElementById('printText').value;
        
        // Siapkan konten HTML yang rapi untuk AirPrint
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        font-family: -apple-system, 'Courier New', monospace; 
                        padding: 20px; 
                        font-size: 12pt;
                        white-space: pre-wrap;
                    }
                    .receipt {
                        max-width: 80mm;
                        margin: 0 auto;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    ${text.replace(/\n/g, '<br>')}
                </div>
            </body>
            </html>
        `;
        
        updateStatus('Membuka dialog AirPrint...', 'info');
        
        // Buat iframe tersembunyi untuk memicu print dialog
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();
        
        // Trigger print setelah konten termuat
        iframe.contentWindow.onload = () => {
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
                updateStatus('✅ Dialog AirPrint telah dibuka. Pilih printer Anda.', 'success');
            }, 100);
        };
    }

    // ==================== LOGIKA CETAK OTOMATIS ====================
    async function handlePrint() {
        if (isCapacitor && connectedDevice) {
            // Prioritas 1: Jika sudah konek BLE, pakai BLE
            await printViaBLE();
        } else if (isCapacitor && !connectedDevice) {
            // Prioritas 2: Jika di aplikasi tapi belum konek BLE, tawarkan AirPrint
            const useAirPrint = confirm('Printer BLE tidak terhubung. Gunakan AirPrint?');
            if (useAirPrint) await printViaAirPrint();
        } else {
            // Prioritas 3: Jika di browser biasa, langsung AirPrint
            await printViaAirPrint();
        }
    }

    // ==================== EVENT LISTENERS ====================
    document.getElementById('scanBtn').addEventListener('click', scanPrinters);
    document.getElementById('airprintBtn').addEventListener('click', printViaAirPrint);
    document.getElementById('printBtn').addEventListener('click', handlePrint);
    document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
    
    // Jalankan deteksi platform
    detectPlatform();
</script>

<!-- Capacitor Web Runtime -->
<script src="https://unpkg.com/@capacitor/core@5.0.0/dist/index.js"></script>
</body>
</html>
```

### ⚙️ Langkah Persiapan (Untuk Build ke Aplikasi iOS)

Agar kode di atas bisa berjalan mulus di iPhone, ada beberapa persiapan teknis yang perlu lakukan di sisi proyek Capacitor.

1.  **Update Dependensi**
    Pastikan sudah menginstal plugin printer yang direkomendasikan, karena plugin inilah yang memungkinkan kode di atas berkomunikasi dengan printer BLE .
    ```bash
    npm install capacitor-thermal-printer --save
    npx cap sync
    ```

2.  **Konfigurasi Xcode (Wajib)**
    - Buka proyek iOS di Xcode: `npx cap open ios`
    - Di Xcode, pilih folder `App` di sisi kiri, lalu pilih target `App`.
    - Buka tab **`Build Phases`**.
    - Cari bagian **`Copy Bundle Resources`**.
    - Klik tombol **`+`** dan pilih **`Add Other...`**.
    - Navigasikan ke `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/ble_serial.plist` dan tambahkan file tersebut . **Langkah ini sangat penting untuk akses BLE di iOS.**

3.  **Tambahkan Izin di Info.plist**
    Buka file `ios/App/App/Info.plist` dan tambahkan baris berikut agar iOS mengizinkan aplikasi menggunakan Bluetooth .
    ```xml
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>Aplikasi ini perlu akses Bluetooth untuk terhubung ke printer thermal</string>
    <key>NSLocalNetworkUsageDescription</key>
    <string>Aplikasi perlu akses jaringan untuk menemukan printer di jaringan</string>
    <key>NSBonjourServices</key>
    <array>
        <string>_printer._tcp</string>
        <string>_ipp._tcp</string>
    </array>
    ```

### 💡 Mengatasi jika Masih Gagal

Karena kita tidak tahu tipe pastinya, ada satu skenario lagi yang mungkin terjadi: printer menggunakan **Bluetooth Classic** (bukan BLE) atau protokol khusus lain yang memerlukan driver dari pabrik.

Jika langkah di atas tetap tidak bisa mendeteksi printer sama sekali, punya dua opsi terakhir:
1.  **Gunakan Printer dengan AirPrint Bawaan**: Solusi paling mudah adalah menggunakan printer yang mendukung **AirPrint** dari awal. Printer seperti **Brother PJ-773** adalah contohnya . Dengan printer ini, cukup menggunakan tombol **AirPrint** di aplikasi dan semuanya akan berjalan lancar tanpa perlu ribet dengan driver.
2.  **Gunakan Jaringan (WiFi/Ethernet)**: Beberapa printer profesional bisa dihubungkan melalui kabel LAN atau WiFi. Kamu bisa mencari tahu apakah printer memiliki port RJ45 (LAN) atau bisa tersambung ke WiFi. Jika bisa, kita bisa atur agar aplikasi terhubung langsung melalui alamat IP printer .

Jadi, strateginya adalah:
- **Langkah 1:** Coba selesaikan setup Xcode dengan benar (poin 1-3 di atas). Ini adalah satu-satunya cara untuk membuat koneksi BLE berfungsi di iOS.
- **Langkah 2:** Jika semua setup sudah benar tapi tetap tidak ada printer yang muncul saat "Scan BLE", itu pertanda kuat bahwa printer tidak kompatibel dengan BLE. Dalam kasus ini, **tombol AirPrint akan menjadi penyelamat utama**.

Semoga panduan ini bisa menyelesaikan masalahmu. Kalau ada kendala saat setup atau error yang muncul, bisa langsung ditanyakan lagi ya.
# 📱 Masalah Printer Thermal di iOS

Berdasarkan foto yang Anda lampirkan, pesan error **"Tidak didukung di browser ini"** untuk koneksi USB dan Bluetooth di iOS adalah **kendala fundamental dari Safari/WebKit**, bukan bug pada aplikasi Anda.

## 🔍 Penyebab Utama

Apple dengan sengaja **tidak mendukung** WebUSB dan Web Bluetooth API di Safari karena alasan privasi dan keamanan. Ini berlaku untuk **semua browser di iOS** (Chrome, Firefox, dll.) karena Apple mewajibkan semua browser menggunakan mesin WebKit yang sama.

## ✅ Solusi yang Tersedia

### 1. **Native App Wrapper (Paling Direkomendasikan)**

Bungkus aplikasi web Anda dengan **Capacitor** (dari tim Ionic) untuk mengakses native Bluetooth iOS:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install capacitor-thermal-printer
npx cap sync
```

Gunakan plugin ini untuk deteksi printer thermal via Bluetooth di iOS:

```javascript
import { CapacitorThermalPrinter } from 'capacitor-thermal-printer';

// Scan printer
await CapacitorThermalPrinter.startScan();
CapacitorThermalPrinter.addListener('discoverDevices', (devices) => {
  console.log('Printer ditemukan:', devices);
});

// Konek ke printer
const device = await CapacitorThermalPrinter.connect({
  address: 'XX:XX:XX:XX:XX:XX',
});
```

**Setup tambahan untuk iOS** - tambahkan permission di `ios/App/App/Info.plist`:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
```

### 2. **Gunakan Printer dengan Aplikasi Pendamping**

Beberapa printer thermal (seperti LFPERT, TATTMUSE) menyediakan **aplikasi iOS native** sendiri yang bisa dipanggil dari web app Anda menggunakan **URL Scheme**:

```javascript
// Memanggil app printer dari web
window.location.href = "thermalprinter://print?data=your_text";
```

### 3. **Printer dengan MFi Certification**

Pilih printer yang sudah **Apple MFi Certified** seperti Star Micronics SM-T300i, yang memiliki SDK resmi untuk integrasi iOS.

### 4. **Network Printing (Jika Printer Support)**

Ganti koneksi ke **Network (IP/Port)** yang sudah muncul di pilihan Anda:

```javascript
const net = require('net');
const client = new net.Socket();
client.connect(9100, '192.168.1.100', () => {
  client.write(Buffer.from('Hello World\n\n\n'));
});
```

## 📊 Perbandingan Solusi

| Solusi | USB iOS | Bluetooth iOS | Biaya | Kompleksitas |
|--------|---------|---------------|-------|--------------|
| Capacitor Wrapper | ❌ | ✅ | Gratis | Sedang |
| Aplikasi Pendamping | ❌ | ✅ | Gratis | Rendah |
| Printer MFi | ❌ | ✅ | $$$ | Rendah |
| Network Printing | ❌ | ❌ | Gratis | Rendah |

## 🚀 Langkah Implementasi Terbaik

**Rekomendasi saya**: Gunakan **Capacitor + capacitor-thermal-printer** karena:
1. Tetap bisa menggunakan kode web yang sudah ada (Node.js backend tetap sama)
2. Mendukung Bluetooth di iOS dengan performa Swift yang cepat
3. Satu codebase untuk Android & iOS

# 🚀 Solusi Lengkap: Integrasi Printer Thermal di iOS dengan Capacitor

Saya akan bantu Anda membuat aplikasi hybrid yang bisa mendeteksi printer thermal via **Bluetooth** di iOS (karena USB tidak bisa di iOS, fokus ke Bluetooth).

## 📁 Struktur Proyek

```
thermal-printer-app/
├── backend/          # Node.js server (yang sudah ada)
├── mobile/           # Capacitor app baru
│   ├── src/
│   │   └── printer.js
│   ├── ios/
│   └── capacitor.config.json
```

## 🔧 Langkah 1: Setup Capacitor di Proyek Web Anda

```bash
# Di folder root aplikasi web Anda yang sudah ada
cd /path/to/your-web-app

# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/app

# Inisialisasi Capacitor (ganti com.example.app dengan ID unik Anda)
npx cap init "Thermal Printer App" "com.yourcompany.thermalprinter" --web-dir ./

# Install plugin printer thermal untuk Capacitor
npm install @capacitor-community/bluetooth-le
npm install capacitor-thermal-printer
# Atau alternatif:
npm install cordova-plugin-thermal-printer
```

## 📱 Langkah 2: Buat Custom Capacitor Plugin (Jika plugin di atas tidak work)

Buat file `src/printer-plugin.ts`:

```typescript
// src/printer-plugin.ts
import { registerPlugin } from '@capacitor/core';

export interface ThermalPrinterPlugin {
  connectBluetooth(options: { address: string }): Promise<{ success: boolean }>;
  disconnect(): Promise<{ success: boolean }>;
  printText(options: { text: string }): Promise<{ success: boolean }>;
  printImage(options: { base64: string }): Promise<{ success: boolean }>;
  scanDevices(): Promise<{ devices: BluetoothDevice[] }>;
}

export interface BluetoothDevice {
  name: string;
  address: string;
  rssi?: number;
}

const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');
export default ThermalPrinter;
```

## 🍎 Langkah 3: Implementasi iOS Native (Swift)

Buat file `ios/App/App/Plugins/ThermalPrinterPlugin.swift`:

```swift
import Capacitor
import CoreBluetooth

@objc(ThermalPrinterPlugin)
public class ThermalPrinterPlugin: CAPPlugin, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager!
    private var discoveredPeripherals: [CBPeripheral] = []
    private var connectedPeripheral: CBPeripheral?
    private var characteristic: CBCharacteristic?
    private var scanCallback: JSObject?
    
    // Printer thermal ESC/POS commands
    private let ESC: UInt8 = 0x1B
    private let GS: UInt8 = 0x1D
    private let LF: UInt8 = 0x0A
    
    override public func load() {
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    @objc func scanDevices(_ call: CAPPluginCall) {
        self.scanCallback = [
            "call": call,
            "devices": []
        ]
        
        if centralManager.state == .poweredOn {
            centralManager.scanForPeripherals(withServices: nil, options: nil)
            
            // Stop scan after 10 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                self?.centralManager.stopScan()
                call.resolve([
                    "devices": self?.discoveredPeripherals.map { [
                        "name": $0.name ?? "Unknown",
                        "address": $0.identifier.uuidString,
                        "rssi": 0
                    ] } ?? []
                ])
            }
        } else {
            call.reject("Bluetooth not available")
        }
    }
    
    @objc func connectBluetooth(_ call: CAPPluginCall) {
        guard let address = call.getString("address") else {
            call.reject("Address required")
            return
        }
        
        let uuid = UUID(uuidString: address)
        let peripheral = discoveredPeripherals.first { $0.identifier == uuid }
        
        if let peripheral = peripheral {
            centralManager.connect(peripheral, options: nil)
            call.resolve(["success": true])
        } else {
            call.reject("Printer not found")
        }
    }
    
    @objc func printText(_ call: CAPPluginCall) {
        guard let text = call.getString("text"),
              let peripheral = connectedPeripheral,
              let characteristic = characteristic else {
            call.reject("Printer not connected")
            return
        }
        
        // Convert text to ESC/POS format
        var commands = Data()
        
        // Initialize printer
        commands.append(contentsOf: [ESC, 0x40])
        
        // Set alignment center
        commands.append(contentsOf: [ESC, 0x61, 0x01])
        
        // Set bold on
        commands.append(contentsOf: [ESC, 0x45, 0x01])
        
        // Add text
        commands.append(contentsOf: text.data(using: .utf8)!)
        
        // Line feed
        commands.append(contentsOf: [LF, LF, LF])
        
        // Cut paper (if supported)
        commands.append(contentsOf: [GS, 0x56, 0x42, 0x00])
        
        peripheral.writeValue(commands, for: characteristic, type: .withResponse)
        call.resolve(["success": true])
    }
    
    @objc func disconnect(_ call: CAPPluginCall) {
        if let peripheral = connectedPeripheral {
            centralManager.cancelPeripheralConnection(peripheral)
            connectedPeripheral = nil
            characteristic = nil
        }
        call.resolve(["success": true])
    }
    
    // MARK: - CBCentralManagerDelegate
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("Bluetooth is powered on")
        case .poweredOff:
            print("Bluetooth is powered off")
        default:
            break
        }
    }
    
    public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        if !discoveredPeripherals.contains(where: { $0.identifier == peripheral.identifier }) {
            discoveredPeripherals.append(peripheral)
        }
    }
    
    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        connectedPeripheral = peripheral
        peripheral.delegate = self
        peripheral.discoverServices(nil)
    }
    
    public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("Failed to connect: \(error?.localizedDescription ?? "")")
    }
    
    // MARK: - CBPeripheralDelegate
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }
        
        // Find characteristic that supports write
        for char in characteristics {
            if char.properties.contains(.write) || char.properties.contains(.writeWithoutResponse) {
                characteristic = char
                break
            }
        }
    }
}
```

## 📄 Langkah 4: Register Plugin di Capacitor

Buat file `ios/App/App/Plugins/ThermalPrinterPlugin.m`:

```objective-c
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(ThermalPrinterPlugin, "ThermalPrinter",
    CAP_PLUGIN_METHOD(scanDevices, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(connectBluetooth, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(printText, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disconnect, CAPPluginReturnPromise);
)
```

## 🌐 Langkah 5: Frontend JavaScript untuk iOS

Update file HTML/JS Anda:

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer iOS</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont; padding: 20px; }
        button { 
            background: #007AFF; color: white; border: none; 
            padding: 12px 24px; border-radius: 10px; margin: 5px;
            font-size: 16px;
        }
        .device-list { margin-top: 20px; }
        .device-item { 
            padding: 12px; background: #f0f0f0; margin: 5px 0; 
            border-radius: 8px; cursor: pointer;
        }
        .status { padding: 10px; margin: 10px 0; border-radius: 8px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>🖨️ Printer Thermal</h1>
    
    <div id="status" class="status">Status: Siap</div>
    
    <button id="scanBtn">🔍 Scan Printer</button>
    <button id="printTestBtn" disabled>📄 Test Print</button>
    <button id="disconnectBtn" disabled>🔌 Disconnect</button>
    
    <div id="deviceList" class="device-list">
        <p>Klik Scan untuk mencari printer...</p>
    </div>
    
    <textarea id="printText" rows="5" placeholder="Masukkan teks untuk dicetak..." style="width:100%; margin-top:20px; padding:10px;">
============================
      THERMAL PRINTER
============================
Tanggal: 2026-04-23
Item 1: Rp 10.000
Item 2: Rp 25.000
--------------------------
Total: Rp 35.000
--------------------------
    Terima kasih!
    </textarea>

    <script>
        let connectedDevice = null;
        let isWebView = false;
        let ThermalPrinter = null;
        
        // Deteksi apakah di Capacitor atau browser biasa
        if (window.Capacitor) {
            isWebView = true;
            ThermalPrinter = Capacitor.Plugins.ThermalPrinter;
            updateStatus("Mode iOS Native - Bluetooth siap", "success");
        } else {
            updateStatus("Mode Web - Gunakan koneksi Network/Serial", "error");
            // Fallback ke Network printing
            setupNetworkPrinting();
        }
        
        function updateStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = `Status: ${message}`;
            statusDiv.className = `status ${type || ''}`;
        }
        
        // Scan printer via Bluetooth (iOS Native)
        async function scanPrinters() {
            if (!isWebView || !ThermalPrinter) {
                updateStatus("Fitur scan hanya tersedia di aplikasi iOS", "error");
                return;
            }
            
            updateStatus("Mencari printer... (10 detik)", "");
            
            try {
                const result = await ThermalPrinter.scanDevices();
                const devices = result.devices || [];
                
                const deviceListDiv = document.getElementById('deviceList');
                
                if (devices.length === 0) {
                    deviceListDiv.innerHTML = '<p>❌ Tidak ada printer ditemukan. Pastikan printer Bluetooth menyala.</p>';
                    updateStatus("Tidak ada printer ditemukan", "error");
                } else {
                    deviceListDiv.innerHTML = '<h3>📱 Printer ditemukan:</h3>';
                    devices.forEach(device => {
                        const deviceEl = document.createElement('div');
                        deviceEl.className = 'device-item';
                        deviceEl.innerHTML = `
                            <strong>${device.name || 'Unknown Printer'}</strong><br>
                            <small>Address: ${device.address}</small>
                        `;
                        deviceEl.onclick = () => connectToPrinter(device);
                        deviceListDiv.appendChild(deviceEl);
                    });
                    updateStatus(`Ditemukan ${devices.length} printer`, "success");
                }
            } catch (error) {
                updateStatus(`Error scan: ${error.message}`, "error");
                console.error(error);
            }
        }
        
        // Connect ke printer yang dipilih
        async function connectToPrinter(device) {
            if (!isWebView) return;
            
            updateStatus(`Menghubungkan ke ${device.name}...`, "");
            
            try {
                const result = await ThermalPrinter.connectBluetooth({ 
                    address: device.address 
                });
                
                if (result.success) {
                    connectedDevice = device;
                    updateStatus(`Terhubung ke ${device.name}`, "success");
                    
                    // Enable print button
                    document.getElementById('printTestBtn').disabled = false;
                    document.getElementById('disconnectBtn').disabled = false;
                    document.getElementById('scanBtn').disabled = true;
                }
            } catch (error) {
                updateStatus(`Gagal konek: ${error.message}`, "error");
            }
        }
        
        // Print teks
        async function printText() {
            if (!isWebView || !connectedDevice) {
                updateStatus("Printer tidak terhubung", "error");
                return;
            }
            
            const text = document.getElementById('printText').value;
            updateStatus("Mencetak...", "");
            
            try {
                const result = await ThermalPrinter.printText({ text: text });
                
                if (result.success) {
                    updateStatus("✅ Cetak berhasil!", "success");
                }
            } catch (error) {
                updateStatus(`❌ Gagal cetak: ${error.message}`, "error");
            }
        }
        
        // Disconnect printer
        async function disconnectPrinter() {
            if (!isWebView) return;
            
            try {
                await ThermalPrinter.disconnect();
                connectedDevice = null;
                updateStatus("Terputus dari printer", "");
                
                document.getElementById('printTestBtn').disabled = true;
                document.getElementById('disconnectBtn').disabled = true;
                document.getElementById('scanBtn').disabled = false;
            } catch (error) {
                updateStatus(`Gagal disconnect: ${error.message}`, "error");
            }
        }
        
        // Fallback: Network printing (untuk browser biasa dan Android WebView)
        function setupNetworkPrinting() {
            // Ganti dengan IP printer thermal Anda
            const PRINTER_IP = "192.168.1.100";
            const PRINTER_PORT = 9100;
            
            window.printViaNetwork = async function(text) {
                try {
                    // Kirim ke Node.js backend yang sudah ada
                    const response = await fetch('http://localhost:3000/print', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: text, ip: PRINTER_IP, port: PRINTER_PORT })
                    });
                    
                    if (response.ok) {
                        updateStatus("✅ Cetak via network berhasil!", "success");
                    }
                } catch (error) {
                    updateStatus(`Network print error: ${error.message}`, "error");
                }
            };
            
            // Override print function
            window.printText = window.printViaNetwork;
        }
        
        // Event listeners
        document.getElementById('scanBtn').addEventListener('click', scanPrinters);
        document.getElementById('printTestBtn').addEventListener('click', printText);
        document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
        
        // Informasi tambahan untuk pengguna iOS
        if (window.Capacitor && Capacitor.getPlatform() === 'ios') {
            const infoDiv = document.createElement('div');
            infoDiv.style.background = '#e7f3ff';
            infoDiv.style.padding = '12px';
            infoDiv.style.borderRadius = '8px';
            infoDiv.style.marginTop = '20px';
            infoDiv.innerHTML = `
                <strong>💡 Tips untuk iOS:</strong><br>
                1. Pastikan Bluetooth printer menyala<br>
                2. Izinkan akses Bluetooth saat diminta<br>
                3. Printer harus dalam mode pairing<br>
                4. Beberapa printer perlu dinyalakan ulang
            `;
            document.body.appendChild(infoDiv);
        }
    </script>
    
    <script src="https://unpkg.com/@capacitor/core@latest/dist/index.js"></script>
</body>
</html>
```

## 🛠️ Langkah 6: Backend Node.js (Network Printing Fallback)

Update backend Anda untuk support network printing:

```javascript
// backend/server.js
const express = require('express');
const net = require('net');
const app = express();
app.use(express.json());

// ESC/POS commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

function createPrintData(text) {
    const buffers = [];
    
    // Initialize printer
    buffers.push(Buffer.from([ESC, 0x40]));
    
    // Set alignment center
    buffers.push(Buffer.from([ESC, 0x61, 0x01]));
    
    // Set bold on
    buffers.push(Buffer.from([ESC, 0x45, 0x01]));
    
    // Add text
    buffers.push(Buffer.from(text, 'utf-8'));
    
    // Line feeds
    buffers.push(Buffer.from([LF, LF, LF]));
    
    // Cut paper
    buffers.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
    
    return Buffer.concat(buffers);
}

app.post('/print', (req, res) => {
    const { text, ip, port = 9100 } = req.body;
    
    const client = new net.Socket();
    const printData = createPrintData(text);
    
    client.connect(port, ip, () => {
        client.write(printData);
        client.end();
        res.json({ success: true, message: 'Printed successfully' });
    });
    
    client.on('error', (err) => {
        console.error('Print error:', err);
        res.status(500).json({ success: false, error: err.message });
    });
});

app.listen(3000, () => {
    console.log('Print server running on port 3000');
});
```

## 📱 Langkah 7: Build iOS App

```bash
# Sync Capacitor
npx cap sync ios

# Tambahkan permission ke Info.plist (otomatis atau manual)
# Buka ios/App/App/Info.plist dan tambahkan:
```

Tambahkan di `ios/App/App/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Aplikasi perlu akses Bluetooth untuk terhubung ke printer thermal</string>
<key>UISupportedExternalAccessoryProtocols</key>
<array>
    <string>com.yourcompany.thermalprinter</string>
</array>
```

```bash
# Build dan buka di Xcode
npx cap open ios

# Di Xcode:
# 1. Pilih target device (iPhone)
# 2. Klik Product > Archive
# 3. Distribute via TestFlight atau App Store
```

## 📋 Checklist untuk iOS

- [ ] Printer thermal Anda harus **Bluetooth (BLE)** atau **Bluetooth Classic**
- [ ] Pastikan printer bisa dipairing dengan iPhone via Settings > Bluetooth
- [ ] Beberapa printer murah mungkin tidak kompatibel dengan iOS karena chipset tertentu

## 🆘 Jika Tetap Tidak Bisa

**Pilihan Terakhir - Gunakan PWA + Safari "Add to Home Screen":**

```javascript
// Deteksi user agent iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (isIOS && !window.Capacitor) {
    alert(
        "⚠️ Untuk mencetak di iPhone/iPad:\n\n" +
        "1. Tap Share button (⎙)\n" +
        "2. Pilih 'Add to Home Screen'\n" +
        "3. Buka aplikasi dari Home Screen\n\n" +
        "Atau gunakan printer dengan koneksi Network (IP/Port)"
# 🚀 Solusi Spesifik untuk Printer Thermal Bluetooth BLE 4.0+ di iOS

Berdasarkan riset, ada **plugin Capacitor yang sudah terbukti bekerja** untuk printer thermal BLE di iOS dengan kecepatan tinggi. Berikut implementasi lengkapnya.

---

## 📦 Pilihan Plugin Terbaik untuk BLE 4.0+

### ✅ Rekomendasi Utama: `capacitor-thermal-printer`

Plugin ini **sudah menggunakan RTPrinter SDK resmi dari Rongta Technology** dan diklaim memiliki kecepatan **Swift-level di iOS** untuk BLE .

```bash
# Instalasi di project web Anda
npm install capacitor-thermal-printer --save
npx cap sync
```

### 📱 Setup iOS Tambahan (WAJIB)

Plugin ini memerlukan file resource tambahan. Buka project iOS di Xcode:

```bash
npx cap open ios
```

**Langkah di Xcode:**
1. Di sidebar kiri, pilih project "App"
2. Pilih target utama "App"
3. Buka tab **"Build Phases"**
4. Cari **"Copy Bundle Resources"**
5. Klik **"+"** → **"Add Other..."**
6. Navigasi ke `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/ble_serial.plist`
7. Pilih file tersebut 

---

## 💻 Kode Lengkap Frontend (HTML/JS)

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer BLE iOS</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; 
            padding: 20px; 
            background: #f5f5f5;
            margin: 0;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        button { 
            background: #007AFF; 
            color: white; 
            border: none; 
            padding: 14px 24px; 
            border-radius: 12px; 
            margin: 5px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
        }
        button:active { opacity: 0.8; }
        button:disabled { background: #ccc; opacity: 0.6; }
        .btn-secondary { background: #5856D6; }
        .btn-danger { background: #FF3B30; }
        .btn-success { background: #34C759; }
        .device-list { margin-top: 16px; }
        .device-item { 
            padding: 14px; 
            background: #f8f9fa; 
            margin: 8px 0; 
            border-radius: 12px; 
            cursor: pointer;
            border: 1px solid #e5e5e5;
            transition: 0.2s;
        }
        .device-item:active { background: #e9ecef; }
        .device-name { font-weight: 600; font-size: 16px; }
        .device-address { font-size: 12px; color: #666; margin-top: 4px; }
        .status { 
            padding: 12px; 
            margin: 12px 0; 
            border-radius: 12px; 
            font-weight: 500;
        }
        .status-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .status-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
        .status-info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8; }
        .status-warning { background: #fff3cd; color: #856404; border-left: 4px solid #ffc107; }
        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 12px;
            font-family: monospace;
            font-size: 14px;
            margin-top: 12px;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #e9ecef;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1>🖨️ Printer Thermal BLE</h1>
        <p><span class="badge" id="platformBadge">Mendeteksi platform...</span></p>
    </div>

    <div class="card">
        <div id="status" class="status status-info">⚡ Status: Siap</div>
        
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0;">
            <button id="scanBtn">🔍 Scan Printer BLE</button>
            <button id="printTestBtn" disabled>📄 Test Print</button>
            <button id="disconnectBtn" disabled>🔌 Disconnect</button>
        </div>
        
        <div id="deviceList" class="device-list">
            <p style="color: #666; text-align: center;">Klik "Scan Printer BLE" untuk mencari printer...</p>
        </div>
    </div>

    <div class="card">
        <label style="font-weight: 600;">📝 Konten Cetak:</label>
        <textarea id="printText" rows="6">
============================
      THERMAL PRINTER
============================
Tanggal: 2026-04-23
Waktu: 14:30 WIB
--------------------------
Item 1: Kopi          15.000
Item 2: Roti Bakar    12.000
Item 3: Air Mineral    5.000
--------------------------
Subtotal:             32.000
Pajak 10%:             3.200
--------------------------
TOTAL:              Rp 35.200
--------------------------
Terima kasih!
Kunjungi kami lagi

[QR: https://example.com]
        </textarea>
        
        <div style="margin-top: 12px;">
            <button id="printCustomBtn" disabled class="btn-success">🖨️ Cetak Konten di Atas</button>
        </div>
    </div>
    
    <div class="card">
        <p style="margin: 0; font-size: 12px; color: #666;">
            💡 <strong>Tips untuk iOS BLE:</strong><br>
            • Pastikan printer dalam mode pairing (biasanya lampu biru berkedip)<br>
            • Izinkan akses Bluetooth saat diminta<br>
            • Untuk printer BLE, scan akan menemukan semua perangkat Bluetooth terdekat<br>
            • Koneksi BLE lebih hemat baterai dibanding Bluetooth klasik
        </p>
    </div>
</div>

<script>
    let connectedDevice = null;
    let isCapacitor = false;
    let ThermalPrinter = null;

    // Deteksi platform
    function detectPlatform() {
        const badge = document.getElementById('platformBadge');
        if (window.Capacitor) {
            const platform = Capacitor.getPlatform();
            isCapacitor = true;
            if (platform === 'ios') {
                badge.textContent = '📱 iOS Native - BLE Supported';
                badge.style.background = '#34C759';
                badge.style.color = 'white';
                updateStatus('Mode iOS: Bluetooth BLE siap digunakan', 'success');
                // Load plugin
                ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
            } else if (platform === 'android') {
                badge.textContent = '🤖 Android - BLE Supported';
                badge.style.background = '#3DDC84';
                badge.style.color = 'black';
                updateStatus('Mode Android: Bluetooth BLE siap digunakan', 'success');
                ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
            }
        } else {
            badge.textContent = '🌐 Web Browser - Gunakan Network Printing';
            badge.style.background = '#FF9500';
            badge.style.color = 'white';
            updateStatus('Mode Web: Gunakan koneksi Network (IP/Port) untuk mencetak', 'warning');
        }
    }

    function updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = `⚡ Status: ${message}`;
        statusDiv.className = `status status-${type || 'info'}`;
    }

    // ========== SCAN PRINTER BLE ==========
    async function scanPrinters() {
        if (!isCapacitor || !ThermalPrinter) {
            updateStatus('Fitur scan hanya tersedia di aplikasi native (Capacitor)', 'error');
            return;
        }

        updateStatus('Mencari printer Bluetooth BLE... (15 detik)', 'info');
        
        const deviceListDiv = document.getElementById('deviceList');
        deviceListDiv.innerHTML = '<p style="color: #666; text-align: center;">🔍 Scanning... Mohon tunggu</p>';
        
        try {
            // Start scan - di iOS akan mendeteksi semua device BLE di sekitar 
            await ThermalPrinter.startScan();
            
            // Listener untuk device yang ditemukan
            ThermalPrinter.addListener('discoverDevices', (devices) => {
                console.log('Devices found:', devices);
                
                if (!devices || devices.length === 0) {
                    deviceListDiv.innerHTML = `
                        <p style="color: #666; text-align: center;">
                        ❌ Tidak ada printer ditemukan.<br>
                        <small>Pastikan printer Bluetooth BLE menyala dan dalam mode pairing.</small>
                        </p>`;
                    updateStatus('Tidak ada printer BLE ditemukan', 'warning');
                    return;
                }
                
                // Filter untuk menampilkan semua device (di iOS semua BLE device akan muncul) 
                deviceListDiv.innerHTML = '<h3 style="margin-bottom: 12px;">📱 Printer BLE Ditemukan:</h3>';
                
                devices.forEach(device => {
                    const deviceEl = document.createElement('div');
                    deviceEl.className = 'device-item';
                    deviceEl.innerHTML = `
                        <div class="device-name">${device.name || 'Unknown BLE Device'}</div>
                        <div class="device-address">Address: ${device.address || device.deviceId || 'N/A'}</div>
                    `;
                    deviceEl.onclick = () => connectToPrinter(device);
                    deviceListDiv.appendChild(deviceEl);
                });
                
                updateStatus(`Ditemukan ${devices.length} perangkat BLE. Klik untuk konek.`, 'success');
                
                // Stop scan setelah menemukan device
                // Catatan: beberapa plugin perlu stop scan manual
                if (ThermalPrinter.stopScan) {
                    setTimeout(() => ThermalPrinter.stopScan(), 5000);
                }
            });
            
        } catch (error) {
            console.error('Scan error:', error);
            updateStatus(`Error scan: ${error.message || error}`, 'error');
            deviceListDiv.innerHTML = `<p style="color: red;">❌ Gagal scan: ${error.message || error}</p>`;
        }
    }

    // ========== CONNECT KE PRINTER BLE ==========
    async function connectToPrinter(device) {
        if (!isCapacitor || !ThermalPrinter) return;
        
        const deviceAddress = device.address || device.deviceId;
        const deviceName = device.name || 'Printer';
        
        updateStatus(`Menghubungkan ke ${deviceName}...`, 'info');
        
        try {
            // Method connect dari capacitor-thermal-printer 
            const result = await ThermalPrinter.connect({ 
                address: deviceAddress 
            });
            
            if (result && result !== null) {
                connectedDevice = {
                    name: deviceName,
                    address: deviceAddress
                };
                updateStatus(`✅ Terhubung ke ${deviceName}`, 'success');
                
                // Enable buttons
                document.getElementById('printTestBtn').disabled = false;
                document.getElementById('printCustomBtn').disabled = false;
                document.getElementById('disconnectBtn').disabled = false;
                document.getElementById('scanBtn').disabled = true;
                
                // Optional: get printer info
                if (ThermalPrinter.getPrinterInfo) {
                    const info = await ThermalPrinter.getPrinterInfo();
                    console.log('Printer info:', info);
                }
            } else {
                updateStatus(`❌ Gagal konek ke ${deviceName}`, 'error');
            }
        } catch (error) {
            console.error('Connection error:', error);
            updateStatus(`Gagal konek: ${error.message || error}`, 'error');
        }
    }

    // ========== CETAK DENGAN FORMAT RICH (RECEIPT) ==========
    async function printRichReceipt() {
        if (!isCapacitor || !ThermalPrinter || !connectedDevice) {
            updateStatus('Printer tidak terhubung', 'error');
            return;
        }
        
        updateStatus('Mencetak receipt...', 'info');
        
        try {
            // Gunakan chain API dari capacitor-thermal-printer 
            await ThermalPrinter.begin()
                // Initialize printer
                .initialize()
                
                // Center alignment
                .align('center')
                
                // Optional: Add image/logo (gunakan URL gambar)
                // .image('https://example.com/logo.png')
                
                // Bold and underline text
                .bold()
                .underline()
                .text('TOKO ANDA\n')
                .clearFormatting()
                
                .text('Jl. Contoh No. 123\n')
                .text('Telp: (021) 1234567\n')
                
                .newline()
                
                // Double width for header
                .doubleWidth()
                .text('STRUK PEMBELIAN\n')
                .clearFormatting()
                
                .newline()
                
                // Left alignment for items
                .align('left')
                .text('Item               Qty   Harga\n')
                .text('--------------------------------\n')
                .text('Kopi               2   30,000\n')
                .text('Roti Bakar         1   12,000\n')
                .text('Air Mineral        1    5,000\n')
                .text('--------------------------------\n')
                
                // Right alignment for total
                .align('right')
                .doubleWidth()
                .text('TOTAL: Rp 47,000\n')
                .clearFormatting()
                
                .newline()
                
                // Center alignment for footer
                .align('center')
                .text('Terima kasih atas kunjungan Anda!\n')
                .text('Simpan struk ini sebagai bukti pembayaran\n')
                
                .newline()
                
                // Optional: QR Code
                .qr('https://example.com/invoice/12345')
                
                .newline()
                .newline()
                
                // Cut paper
                .cutPaper()
                
                // Execute print
                .write()
                .then(() => {
                    updateStatus('✅ Cetak receipt berhasil!', 'success');
                })
                .catch((e) => {
                    console.error('Print error:', e);
                    updateStatus(`❌ Gagal cetak: ${e.message || e}`, 'error');
                });
                
        } catch (error) {
            console.error('Print error:', error);
            updateStatus(`Gagal cetak: ${error.message || error}`, 'error');
        }
    }

    // ========== CETAK TEKS KUSTOM ==========
    async function printCustomText() {
        if (!isCapacitor || !ThermalPrinter || !connectedDevice) {
            updateStatus('Printer tidak terhubung', 'error');
            return;
        }
        
        const customText = document.getElementById('printText').value;
        updateStatus('Mencetak teks kustom...', 'info');
        
        try {
            await ThermalPrinter.begin()
                .initialize()
                .align('center')
                .text(customText)
                .newline()
                .newline()
                .cutPaper()
                .write()
                .then(() => {
                    updateStatus('✅ Cetak teks berhasil!', 'success');
                })
                .catch((e) => {
                    updateStatus(`❌ Gagal cetak: ${e.message || e}`, 'error');
                });
        } catch (error) {
            updateStatus(`Gagal cetak: ${error.message || error}`, 'error');
        }
    }

    // ========== DISCONNECT ==========
    async function disconnectPrinter() {
        if (!isCapacitor || !ThermalPrinter) return;
        
        updateStatus('Memutuskan koneksi...', 'info');
        
        try {
            // Beberapa implementasi perlu disconnect manual
            if (ThermalPrinter.disconnect) {
                await ThermalPrinter.disconnect();
            }
            
            connectedDevice = null;
            updateStatus('Koneksi terputus', 'info');
            
            document.getElementById('printTestBtn').disabled = true;
            document.getElementById('printCustomBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = true;
            document.getElementById('scanBtn').disabled = false;
            
        } catch (error) {
            console.error('Disconnect error:', error);
            updateStatus(`Gagal disconnect: ${error.message || error}`, 'error');
        }
    }

    // ========== NETWORK PRINTING FALLBACK (untuk Web Browser) ==========
    async function printViaNetwork() {
        const text = document.getElementById('printText').value;
        
        // Ganti dengan IP printer thermal Anda yang support network
        const PRINTER_IP = "192.168.1.100";
        const PRINTER_PORT = 9100;
        
        updateStatus('Mencetak via Network...', 'info');
        
        try {
            // Kirim ke backend Node.js
            const response = await fetch('http://localhost:3000/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text, 
                    ip: PRINTER_IP, 
                    port: PRINTER_PORT 
                })
            });
            
            if (response.ok) {
                updateStatus('✅ Cetak via Network berhasil!', 'success');
            } else {
                throw new Error('Gagal kirim ke printer');
            }
        } catch (error) {
            updateStatus(`❌ Network print error: ${error.message}`, 'error');
        }
    }

    // ========== EVENT LISTENERS ==========
    document.getElementById('scanBtn').addEventListener('click', scanPrinters);
    document.getElementById('printTestBtn').addEventListener('click', printRichReceipt);
    document.getElementById('printCustomBtn').addEventListener('click', () => {
        if (isCapacitor && connectedDevice) {
            printCustomText();
        } else {
            printViaNetwork();
        }
    });
    document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
    
    // Inisialisasi
    detectPlatform();
</script>

<!-- Capacitor Web Runtime -->
<script src="https://unpkg.com/@capacitor/core@5.0.0/dist/index.js"></script>
</body>
</html>
```

---

## 🔧 Alternatif Plugin Lain

Jika plugin utama tidak bekerja dengan printer spesifik Anda, coba pendekatan alternatif:

### Opsi 1: Manual BLE dengan `@capacitor-community/bluetooth-le`

Untuk kontrol lebih granular atas koneksi BLE:

```javascript
import { BleClient } from '@capacitor-community/bluetooth-le';

async function connectBLE() {
    await BleClient.initialize();
    
    // Scan untuk device BLE
    const devices = await BleClient.requestDevice({
        services: ['000018f0-0000-1000-8000-00805f9b34fb'] // Service printer umum
    });
    
    await BleClient.connect(devices.deviceId);
    
    // Cari characteristic untuk print
    const services = await BleClient.getServices(devices.deviceId);
    // ... kirim data ESC/POS ke characteristic yang sesuai
}
```

### Opsi 2: Swift Native Framework (Printer)

Untuk performa maksimal, Anda bisa menggunakan framework Swift `Printer` via CocoaPods :

```ruby
# Podfile
pod 'Printer'
```

---

## 📋 Perbandingan Metode

| Metode | Kecepatan iOS BLE | Kemudahan Implementasi | Support ESC/POS |
|--------|-------------------|------------------------|-----------------|
| `capacitor-thermal-printer` | ⚡ Sangat Cepat  | Mudah (Chain API) | ✅ Lengkap |
| `@capacitor-community/bluetooth-le` | 🐌 Lambat (manual encoding)  | Sulit | ❌ Perlu manual |
| Network Printing (IP/Port) | ⚡ Cepat | Mudah | ✅ via raw socket |

---

## ✅ Kesimpulan

**Gunakan `capacitor-thermal-printer`** karena:
1. Sudah menggunakan **RTPrinter SDK resmi** dari Rongta Technology 
2. Performa **Swift-level di iOS** untuk BLE
3. API **chain method** yang mirip dengan esc-pos encoder
4. Support **gambar, QR code, barcode, cut paper** lengkap

Jika printer BLE Anda tetap tidak terdeteksi, kemungkinan printer menggunakan **Bluetooth Classic** (bukan BLE). Dalam kasus ini, printer tidak akan bisa terhubung di iOS melalui Web Bluetooth atau Capacitor sekalipun, karena iOS hanya mengizinkan BLE untuk akses Bluetooth dari aplikasi . Solusinya adalah menggunakan **printer dengan dukungan AirPrint** atau **koneksi Network (WiFi/Ethernet)** .

Menggunakan pendekatan **'dual-mode'** yang cerdas: aplikasi akan mencoba koneksi BLE (Bluetooth Low Energy) secara otomatis. Jika gagal, pengguna akan langsung dialihkan ke opsi **AirPrint**, yang merupakan standar bawaan iOS dan pasti berfungsi untuk semua printer .

Berikut adalah kode utama yang bisa langsung coba.

### 📝 Kode Lengkap untuk HTML/JS (Frontend)

Buat atau ganti file utama aplikasi web (misalnya `index.html`) dengan kode di bawah. Kode ini sudah mencakup deteksi otomatis dan fallback ke AirPrint.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Thermal Printer - iOS</title>
    <style>
        /* --- Styling Minimalis --- */
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; 
            padding: 20px; 
            background: #f5f5f5;
            margin: 0;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        button { 
            background: #007AFF; 
            color: white; 
            border: none; 
            padding: 12px 20px; 
            border-radius: 12px; 
            margin: 5px 5px 5px 0;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        button:active { opacity: 0.8; }
        button:disabled { background: #ccc; opacity: 0.6; }
        .btn-airprint { background: #5856D6; }
        .btn-danger { background: #FF3B30; }
        .status { 
            padding: 12px; 
            margin: 12px 0; 
            border-radius: 12px; 
            font-weight: 500;
        }
        .status-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .status-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
        .status-info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b2; }
        .device-list { margin-top: 16px; }
        .device-item { 
            padding: 14px; 
            background: #f8f9fa; 
            margin: 8px 0; 
            border-radius: 12px; 
            cursor: pointer;
            border: 1px solid #e5e5e5;
        }
        textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 12px;
            font-family: monospace;
            font-size: 14px;
            margin-top: 12px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #e9ecef;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1>🖨️ Printer Thermal</h1>
        <p><span class="badge" id="platformBadge">Memuat...</span></p>
    </div>

    <div class="card">
        <div id="status" class="status status-info">⚡ Status: Siap</div>
        
        <div style="margin: 16px 0;">
            <button id="scanBtn">🔍 1. Scan BLE</button>
            <button id="airprintBtn" class="btn-airprint">🍎 2. AirPrint (Universal)</button>
            <button id="disconnectBtn" disabled>🔌 Putus</button>
        </div>
        
        <div id="deviceList" class="device-list">
            <p style="color: #666; text-align: center;">Klik "Scan BLE" atau langsung gunakan AirPrint.</p>
        </div>
    </div>

    <div class="card">
        <label style="font-weight: 600;">📝 Konten Cetak:</label>
        <textarea id="printText" rows="6">
============================
      TOKO ANDA
============================
Tanggal: 2026-04-23
--------------------------
Item 1     2 x 10.000
Item 2     1 x 25.000
--------------------------
TOTAL: Rp 45.000
--------------------------
Terima kasih!
        </textarea>
        
        <button id="printBtn" disabled style="margin-top: 12px; width: 100%;">🖨️ Cetak Struk</button>
    </div>
</div>

<script>
    // ==================== INISIALISASI ====================
    let connectedDevice = null;
    let isCapacitor = false;
    let ThermalPrinter = null;

    function detectPlatform() {
        const badge = document.getElementById('platformBadge');
        // Cek apakah dijalankan di aplikasi Capacitor (iOS/Android native)
        if (window.Capacitor && Capacitor.getPlatform() === 'ios') {
            isCapacitor = true;
            badge.textContent = '📱 Mode Aplikasi iOS';
            badge.style.background = '#34C759';
            badge.style.color = 'white';
            updateStatus('Mode Aplikasi: Mencoba BLE, fallback ke AirPrint siap.', 'success');
            
            // Muat Plugin Thermal Printer
            ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
        } else if (window.Capacitor && Capacitor.getPlatform() === 'android') {
            badge.textContent = '🤖 Mode Aplikasi Android';
            badge.style.background = '#3DDC84';
            badge.style.color = 'black';
            updateStatus('Mode Android: Bluetooth siap digunakan.', 'success');
            ThermalPrinter = Capacitor.Plugins.CapacitorThermalPrinter;
        } else {
            // Ini berjalan di Safari atau browser biasa, tidak bisa akses hardware native
            badge.textContent = '🌐 Browser Web';
            badge.style.background = '#FF9500';
            badge.style.color = 'white';
            updateStatus('Akses printer terbatas. Gunakan AirPrint atau buka melalui aplikasi iOS.', 'warning');
            document.getElementById('scanBtn').disabled = true;
            document.getElementById('airprintBtn').disabled = false; // AirPrint via share sheet masih bisa
        }
    }

    function updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = `⚡ Status: ${message}`;
        statusDiv.className = `status status-${type || 'info'}`;
    }

    // ==================== FUNGSI BLE (Untuk Printer yang Support) ====================
    async function scanPrinters() {
        if (!isCapacitor || !ThermalPrinter) {
            updateStatus('Fitur scan hanya tersedia di aplikasi native.', 'error');
            return;
        }

        updateStatus('Mencari printer BLE... (15 detik)', 'info');
        const deviceListDiv = document.getElementById('deviceList');
        deviceListDiv.innerHTML = '<p style="color: #666; text-align: center;">🔍 Scanning... Mohon tunggu</p>';
        
        try {
            // Mulai scan
            await ThermalPrinter.startScan();
            
            // Tangkap event device yang ditemukan
            ThermalPrinter.addListener('discoverDevices', (devices) => {
                console.log('Devices found:', devices);
                
                if (!devices || devices.length === 0) {
                    deviceListDiv.innerHTML = `<p style="color: #666; text-align: center;">❌ Tidak ada perangkat BLE ditemukan.<br><small>Pastikan printer menyala. Coba tombol AirPrint sebagai alternatif.</small></p>`;
                    updateStatus('Tidak ada perangkat BLE ditemukan. Gunakan AirPrint.', 'warning');
                    return;
                }
                
                deviceListDiv.innerHTML = '<h3 style="margin-bottom: 12px;">📱 Perangkat BLE Ditemukan:</h3>';
                devices.forEach(device => {
                    const deviceEl = document.createElement('div');
                    deviceEl.className = 'device-item';
                    deviceEl.innerHTML = `
                        <div style="font-weight: 600;">${device.name || 'Perangkat Tanpa Nama'}</div>
                        <div style="font-size: 12px; color: #666;">ID: ${device.address || device.deviceId || 'N/A'}</div>
                    `;
                    deviceEl.onclick = () => connectToPrinter(device);
                    deviceListDiv.appendChild(deviceEl);
                });
                
                updateStatus(`Ditemukan ${devices.length} perangkat. Klik untuk konek.`, 'success');
                
                // Hentikan scan setelah beberapa detik
                if (ThermalPrinter.stopScan) {
                    setTimeout(() => ThermalPrinter.stopScan(), 5000);
                }
            });
        } catch (error) {
            console.error(error);
            updateStatus(`Error scan: ${error.message || error}. Coba AirPrint.`, 'error');
            deviceListDiv.innerHTML = `<p style="color: red;">❌ Gagal scan: ${error.message || error}</p>`;
        }
    }

    async function connectToPrinter(device) {
        if (!isCapacitor || !ThermalPrinter) return;
        
        const deviceId = device.address || device.deviceId;
        const deviceName = device.name || 'Printer';
        
        updateStatus(`Menghubungkan ke ${deviceName}...`, 'info');
        
        try {
            // Method connect dari plugin capacitor-thermal-printer 
            const result = await ThermalPrinter.connect({ address: deviceId });
            
            if (result && result !== null) {
                connectedDevice = { name: deviceName, id: deviceId };
                updateStatus(`✅ Terhubung ke ${deviceName}`, 'success');
                
                // Aktifkan tombol cetak
                document.getElementById('printBtn').disabled = false;
                document.getElementById('disconnectBtn').disabled = false;
                document.getElementById('scanBtn').disabled = true;
            } else {
                updateStatus(`❌ Gagal konek ke ${deviceName}. Coba AirPrint.`, 'error');
            }
        } catch (error) {
            console.error(error);
            updateStatus(`Gagal konek: ${error.message || error}. Coba AirPrint.`, 'error');
        }
    }

    async function printViaBLE() {
        if (!connectedDevice || !ThermalPrinter) {
            updateStatus('Tidak ada printer BLE yang terhubung.', 'error');
            return false;
        }
        
        const text = document.getElementById('printText').value;
        updateStatus('Mencetak via BLE...', 'info');
        
        try {
            // Menggunakan chain API untuk format cetak yang lebih baik 
            await ThermalPrinter.begin()
                .initialize()
                .align('center')
                .text(text)
                .newline()
                .newline()
                .cutPaper()
                .write();
            
            updateStatus('✅ Cetak via BLE berhasil!', 'success');
            return true;
        } catch (error) {
            console.error('BLE Print error:', error);
            updateStatus(`❌ Gagal cetak BLE: ${error.message || error}`, 'error');
            return false;
        }
    }

    async function disconnectPrinter() {
        if (!isCapacitor || !ThermalPrinter) return;
        
        updateStatus('Memutuskan koneksi...', 'info');
        try {
            if (ThermalPrinter.disconnect) await ThermalPrinter.disconnect();
            connectedDevice = null;
            updateStatus('Koneksi terputus.', 'info');
            
            document.getElementById('printBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = true;
            document.getElementById('scanBtn').disabled = false;
        } catch (error) {
            console.error(error);
        }
    }

    // ==================== FUNGSI AIRPRINT (FALLBACK UNIVERSAL) ====================
    // Fungsi ini akan memunculkan dialog print native iOS, cocok untuk SEMUA printer 
    async function printViaAirPrint() {
        const text = document.getElementById('printText').value;
        
        // Siapkan konten HTML yang rapi untuk AirPrint
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        font-family: -apple-system, 'Courier New', monospace; 
                        padding: 20px; 
                        font-size: 12pt;
                        white-space: pre-wrap;
                    }
                    .receipt {
                        max-width: 80mm;
                        margin: 0 auto;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    ${text.replace(/\n/g, '<br>')}
                </div>
            </body>
            </html>
        `;
        
        updateStatus('Membuka dialog AirPrint...', 'info');
        
        // Buat iframe tersembunyi untuk memicu print dialog
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();
        
        // Trigger print setelah konten termuat
        iframe.contentWindow.onload = () => {
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
                updateStatus('✅ Dialog AirPrint telah dibuka. Pilih printer Anda.', 'success');
            }, 100);
        };
    }

    // ==================== LOGIKA CETAK OTOMATIS ====================
    async function handlePrint() {
        if (isCapacitor && connectedDevice) {
            // Prioritas 1: Jika sudah konek BLE, pakai BLE
            await printViaBLE();
        } else if (isCapacitor && !connectedDevice) {
            // Prioritas 2: Jika di aplikasi tapi belum konek BLE, tawarkan AirPrint
            const useAirPrint = confirm('Printer BLE tidak terhubung. Gunakan AirPrint?');
            if (useAirPrint) await printViaAirPrint();
        } else {
            // Prioritas 3: Jika di browser biasa, langsung AirPrint
            await printViaAirPrint();
        }
    }

    // ==================== EVENT LISTENERS ====================
    document.getElementById('scanBtn').addEventListener('click', scanPrinters);
    document.getElementById('airprintBtn').addEventListener('click', printViaAirPrint);
    document.getElementById('printBtn').addEventListener('click', handlePrint);
    document.getElementById('disconnectBtn').addEventListener('click', disconnectPrinter);
    
    // Jalankan deteksi platform
    detectPlatform();
</script>

<!-- Capacitor Web Runtime -->
<script src="https://unpkg.com/@capacitor/core@5.0.0/dist/index.js"></script>
</body>
</html>
```

### ⚙️ Langkah Persiapan (Untuk Build ke Aplikasi iOS)

Agar kode di atas bisa berjalan mulus di iPhone, ada beberapa persiapan teknis yang perlu lakukan di sisi proyek Capacitor.

1.  **Update Dependensi**
    Pastikan sudah menginstal plugin printer yang direkomendasikan, karena plugin inilah yang memungkinkan kode di atas berkomunikasi dengan printer BLE .
    ```bash
    npm install capacitor-thermal-printer --save
    npx cap sync
    ```

2.  **Konfigurasi Xcode (Wajib)**
    - Buka proyek iOS di Xcode: `npx cap open ios`
    - Di Xcode, pilih folder `App` di sisi kiri, lalu pilih target `App`.
    - Buka tab **`Build Phases`**.
    - Cari bagian **`Copy Bundle Resources`**.
    - Klik tombol **`+`** dan pilih **`Add Other...`**.
    - Navigasikan ke `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/ble_serial.plist` dan tambahkan file tersebut . **Langkah ini sangat penting untuk akses BLE di iOS.**

3.  **Tambahkan Izin di Info.plist**
    Buka file `ios/App/App/Info.plist` dan tambahkan baris berikut agar iOS mengizinkan aplikasi menggunakan Bluetooth .
    ```xml
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>Aplikasi ini perlu akses Bluetooth untuk terhubung ke printer thermal</string>
    <key>NSLocalNetworkUsageDescription</key>
    <string>Aplikasi perlu akses jaringan untuk menemukan printer di jaringan</string>
    <key>NSBonjourServices</key>
    <array>
        <string>_printer._tcp</string>
        <string>_ipp._tcp</string>
    </array>
    ```

### 💡 Mengatasi jika Masih Gagal

Karena kita tidak tahu tipe pastinya, ada satu skenario lagi yang mungkin terjadi: printer menggunakan **Bluetooth Classic** (bukan BLE) atau protokol khusus lain yang memerlukan driver dari pabrik.

Jika langkah di atas tetap tidak bisa mendeteksi printer sama sekali, punya dua opsi terakhir:
1.  **Gunakan Printer dengan AirPrint Bawaan**: Solusi paling mudah adalah menggunakan printer yang mendukung **AirPrint** dari awal. Printer seperti **Brother PJ-773** adalah contohnya . Dengan printer ini, cukup menggunakan tombol **AirPrint** di aplikasi dan semuanya akan berjalan lancar tanpa perlu ribet dengan driver.
2.  **Gunakan Jaringan (WiFi/Ethernet)**: Beberapa printer profesional bisa dihubungkan melalui kabel LAN atau WiFi. Kamu bisa mencari tahu apakah printer memiliki port RJ45 (LAN) atau bisa tersambung ke WiFi. Jika bisa, kita bisa atur agar aplikasi terhubung langsung melalui alamat IP printer .

Jadi, strateginya adalah:
- **Langkah 1:** Coba selesaikan setup Xcode dengan benar (poin 1-3 di atas). Ini adalah satu-satunya cara untuk membuat koneksi BLE berfungsi di iOS.
- **Langkah 2:** Jika semua setup sudah benar tapi tetap tidak ada printer yang muncul saat "Scan BLE", itu pertanda kuat bahwa printer tidak kompatibel dengan BLE. Dalam kasus ini, **tombol AirPrint akan menjadi penyelamat utama**.

Kalau ada kendala saat setup atau error yang muncul, bisa langsung ditanyakan lagi ya.
