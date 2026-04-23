# 🖨️ Thermal Printer Integration for iOS Web App

> Solusi lengkap untuk mendeteksi dan mencetak ke printer thermal dari web app yang sudah ada, dengan dukungan penuh untuk **iOS (Bluetooth BLE + AirPrint)** dan **Android (USB/Bluetooth)**.

## 📋 Daftar Isi

- [Fitur](#-fitur)
- [Struktur Folder](#-struktur-folder)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Cara Penggunaan](#-cara-penggunaan)
- [Troubleshooting](#-troubleshooting)
- [API Reference](#-api-reference)
- [Lisensi](#-lisensi)

---

## ✨ Fitur

| Platform | USB | Bluetooth BLE | Bluetooth Classic | AirPrint | Network (IP) |
|----------|-----|---------------|-------------------|----------|--------------|
| **Android** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **iOS** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Web Browser** | ❌ | ❌ | ❌ | ✅ | ✅ |

### Kemampuan Cetak
- ✅ Teks biasa dan format ESC/POS
- ✅ Barcode (Code 128, EAN, QR Code)
- ✅ Gambar (logo, tanda tangan)
- ✅ Pemotongan kertas otomatis
- ✅ Format struk dengan alignment (kiri/tengah/kanan)

---

## 📁 Struktur Folder

```
your-web-app/
│
├── 📁 backend/                          # Node.js backend (opsional)
│   ├── server.js                        # Server untuk network printing
│   ├── package.json                     # Dependencies backend
│   └── 📁 node_modules/
│
├── 📁 public/                           # Frontend files
│   ├── index.html                       # Halaman utama printer
│   ├── printer.js                       # Logic printer terpisah
│   ├── printer.css                      # Styling khusus printer
│   └── 📁 assets/
│       ├── logo.png                     # Logo untuk struk
│       └── printer-icon.png
│
├── 📁 capacitor/                        # Capacitor native wrapper
│   ├── 📁 ios/                          # Project iOS (Xcode)
│   │   ├── App/
│   │   │   ├── App/
│   │   │   │   ├── Info.plist           # Konfigurasi izin iOS
│   │   │   │   └── 📁 Plugins/
│   │   │   │       ├── ThermalPrinterPlugin.swift   # Native Swift
│   │   │   │       └── ThermalPrinterPlugin.m       # Obj-C bridge
│   │   │   └── Podfile                  # CocoaPods dependencies
│   │   └── 📁 Resources/
│   │       └── ble_serial.plist         # Resource BLE (WAJIB)
│   │
│   ├── capacitor.config.json            # Konfigurasi Capacitor
│   └── package.json                     # Dependencies Capacitor
│
├── 📁 plugins/                          # Custom plugins
│   └── capacitor-thermal-printer/       # Plugin thermal printer
│       ├── src/
│       │   ├── android/                 # Android native code
│       │   ├── ios/                     # iOS native code
│       │   └── web/                     # Web fallback
│       ├── dist/
│       │   └── index.js                 # Plugin bundle
│       └── package.json
│
├── .gitignore
├── README.md                            # File ini
└── package.json                         # Dependencies utama
```

---

## 💻 Persyaratan Sistem

### Minimum Requirements
- **Node.js**: v16.x atau lebih baru
- **NPM**: v8.x atau lebih baru
- **Xcode**: v14.x (untuk build iOS)
- **iOS**: 14.0+ (iPhone/iPad)
- **Android**: 8.0+ (API Level 26)
- **Printer**: Mendukung ESC/POS atau BLE

### Prasyarat Hardware
| Tipe Printer | Contoh Merek | Koneksi |
|--------------|--------------|---------|
| BLE 4.0+ | Rongta, Sunmi, MUNBYN | Bluetooth |
| Network | Epson, Star Micronics | WiFi/Ethernet |
| AirPrint | Brother, HP, Canon | WiFi |

---

## 🚀 Instalasi

### Step 1: Clone/Masuk ke Project yang Sudah Ada

```bash
cd /path/to/your-existing-web-app
```

### Step 2: Install Dependencies

```bash
# Install Capacitor core
npm install @capacitor/core @capacitor/cli @capacitor/app

# Install plugin thermal printer
npm install capacitor-thermal-printer --save

# Install BLE helper (alternatif)
npm install @capacitor-community/bluetooth-le

# Untuk backend network printing (opsional)
npm install express net body-parser
```

### Step 3: Inisialisasi Capacitor

```bash
# Ganti 'com.yourapp.id' dengan ID unik aplikasi Anda
npx cap init "Nama Aplikasi Anda" "com.yourapp.thermalprinter"

# Tentukan folder web (misal: public, dist, atau .)
# Jika file HTML ada di root:
npx cap init --web-dir ./

# Jika di folder public:
npx cap init --web-dir ./public
```

### Step 4: Tambahkan Platform iOS

```bash
npx cap add ios
npx cap sync ios
```

### Step 5: Setup Native iOS (WAJIB untuk BLE)

```bash
# Buka project di Xcode
npx cap open ios
```

**Di Xcode, lakukan:**
1. Pilih folder `App` di sidebar kiri
2. Pilih target `App`
3. Buka tab **`Build Phases`**
4. Cari **`Copy Bundle Resources`**
5. Klik **`+`** → **`Add Other...`**
6. Navigasi ke `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/ble_serial.plist`
7. Tambahkan file tersebut

---

## ⚙️ Konfigurasi

### File 1: `capacitor.config.json`

```json
{
  "appId": "com.yourapp.thermalprinter",
  "appName": "Thermal Printer App",
  "webDir": ".",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https",
    "iosScheme": "capacitor"
  },
  "plugins": {
    "CapacitorThermalPrinter": {
      "usbVendorId": 0,
      "usbProductId": 0,
      "bluetoothAutoConnect": false
    }
  }
}
```

### File 2: `ios/App/App/Info.plist` (Tambahkan ini)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Izin Bluetooth untuk BLE -->
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>Aplikasi ini memerlukan akses Bluetooth untuk terhubung ke printer thermal</string>
    
    <key>NSBluetoothPeripheralUsageDescription</key>
    <string>Aplikasi ini memerlukan akses Bluetooth untuk terhubung ke printer thermal</string>
    
    <!-- Izin Local Network untuk menemukan printer di jaringan -->
    <key>NSLocalNetworkUsageDescription</key>
    <string>Aplikasi perlu akses jaringan untuk menemukan printer WiFi</string>
    
    <!-- Service Bonjour untuk printer -->
    <key>NSBonjourServices</key>
    <array>
        <string>_printer._tcp</string>
        <string>_ipp._tcp</string>
        <string>_pdl-datastream._tcp</string>
    </array>
    
    <!-- Supported external accessory protocols -->
    <key>UISupportedExternalAccessoryProtocols</key>
    <array>
        <string>com.rongta.thermalprinter</string>
        <string>com.epson.escpos</string>
    </array>
</dict>
</plist>
```

### File 3: `backend/server.js` (Opsional - untuk Network Printing)

```javascript
const express = require('express');
const net = require('net');
const app = express();

app.use(express.json());
app.use(express.static('../public'));

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

function createPrintData(text) {
    const buffers = [];
    buffers.push(Buffer.from([ESC, 0x40]));        // Initialize
    buffers.push(Buffer.from([ESC, 0x61, 0x01]));  // Center align
    buffers.push(Buffer.from([ESC, 0x45, 0x01]));  // Bold on
    buffers.push(Buffer.from(text, 'utf-8'));
    buffers.push(Buffer.from([LF, LF, LF]));       // Line feeds
    buffers.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // Cut paper
    return Buffer.concat(buffers);
}

app.post('/api/print', (req, res) => {
    const { text, ip, port = 9100 } = req.body;
    
    if (!ip) {
        return res.status(400).json({ error: 'IP printer required' });
    }
    
    const client = new net.Socket();
    const data = createPrintData(text);
    
    client.connect(port, ip, () => {
        client.write(data);
        client.end();
        res.json({ success: true, message: 'Printed via network' });
    });
    
    client.on('error', (err) => {
        res.status(500).json({ error: err.message });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Print server running on port ${PORT}`);
});
```

---

## 📱 Cara Penggunaan

### 1. Build Aplikasi iOS

```bash
# Sync semua perubahan
npx cap sync ios

# Buka di Xcode
npx cap open ios

# Di Xcode:
# - Pilih target device (iPhone)
# - Klik Product > Archive
# - Distribute via TestFlight atau App Store
```

### 2. Test di Browser (Mode Web)

```bash
# Jalankan server backend (jika pakai network printing)
cd backend
node server.js

# Buka file index.html langsung di browser
open public/index.html
# atau
python -m http.server 8080
```

### 3. Integrasi ke Web App Existing

Tambahkan script berikut di HTML utama Anda:

```html
<!-- Di bagian head -->
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0">

<!-- Di bagian body sebelum closing tag -->
<script src="https://unpkg.com/@capacitor/core@5.0.0/dist/index.js"></script>
<script src="./printer.js"></script>
```

---

## 📄 File `public/printer.js` (Core Logic)

```javascript
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
```

---

## 🐛 Troubleshooting

### Masalah 1: Printer Tidak Terdeteksi di iOS

| Penyebab | Solusi |
|----------|--------|
| Printer tidak support BLE | Gunakan tombol **AirPrint** |
| Izin Bluetooth belum diberikan | Cek Settings > Privacy > Bluetooth |
| Plugin belum ter-register di Xcode | Tambahkan `ble_serial.plist` ke Copy Bundle Resources |
| Printer belum dalam mode pairing | Nyalakan ulang printer, pastikan lampu biru berkedip |

### Masalah 2: Error "WebUSB not supported"

**Solusi:** Ini normal di iOS. Gunakan Bluetooth BLE atau AirPrint.

### Masalah 3: Koneksi Putus Saat Cetak

**Solusi:**
```javascript
// Tambahkan retry logic
async function printWithRetry(text, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await printerManager.print(text);
            return;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000));
            await printerManager.disconnect();
            await printerManager.scanDevices();
        }
    }
}
```

### Masalah 4: Xcode Build Failed

**Solusi:**
```bash
# Clean build folder
cd ios
xcodebuild clean

# Update pods
pod deintegrate
pod install

# Kembali ke root dan sync ulang
cd ..
npx cap sync ios
```

---

## 📚 API Reference

### ThermalPrinterManager Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `scanDevices()` | - | `Promise<Device[]>` | Scan printer BLE terdekat |
| `connect(device)` | `{address, name}` | `Promise<boolean>` | Konek ke printer |
| `print(text, options)` | `text, {align, cut}` | `Promise<Result>` | Cetak teks |
| `disconnect()` | - | `Promise<boolean>` | Putus koneksi |
| `getStatus()` | - | `StatusObject` | Dapatkan status saat ini |

### Events

```javascript
// Listen untuk printer ready
window.addEventListener('printer-ready', (e) => {
    console.log('Platform:', e.detail.platform);
});

// Custom events dari plugin
printerManager.plugin?.addListener('discoverDevices', (devices) => {
    console.log('Found:', devices);
});

printerManager.plugin?.addListener('connectionState', (state) => {
    console.log('State:', state);
});
```

---

## 📝 Contoh Penggunaan di Web App Existing

```html
<!-- Di HTML utama Anda -->
<button onclick="testPrint()">Test Print</button>

<script>
async function testPrint() {
    const receipt = `
============================
      TOKO ANDA
============================
Tanggal: ${new Date().toLocaleDateString()}
--------------------------
Total: Rp 50.000
--------------------------
Terima kasih!
    `;
    
    try {
        const result = await window.printerManager.print(receipt, {
            align: 'center',
            cut: true
        });
        
        alert(`✅ Cetak berhasil via ${result.method}`);
    } catch (error) {
        alert(`❌ Gagal: ${error.message}`);
    }
}

// Cek status printer
setInterval(() => {
    const status = window.printerManager.getStatus();
    document.getElementById('printer-status').textContent = 
        status.isConnected ? 'Terhubung' : 'Terputus';
}, 1000);
</script>
```

---

## 📞 Dukungan

Jika mengalami masalah:
1. Periksa [Troubleshooting](#-troubleshooting)
2. Cek console browser untuk error
3. Pastikan semua step instalasi sudah diikuti

---

## 📄 Lisensi

MIT License - Free for commercial and personal use

---

**Dibuat untuk:** Web App Existing yang membutuhkan dukungan printer thermal di iOS

**Versi:** 1.0.0

**Terakhir diperbarui:** 23 April 2026

---

## 🎯 Ringkasan File yang Perlu Dibuat

Berdasarkan struktur di atas, berikut daftar file yang perlu kamu buat/modifikasi di project web app yang sudah ada:

| No | Path File | Status | Keterangan |
|----|-----------|--------|-------------|
| 1 | `capacitor.config.json` | **Baru** | Konfigurasi Capacitor |
| 2 | `public/index.html` | **Modifikasi** | Tambahkan script dan meta tag |
| 3 | `public/printer.js` | **Baru** | Core logic printer |
| 4 | `backend/server.js` | **Opsional** | Untuk network printing |
| 5 | `ios/App/App/Info.plist` | **Modifikasi** | Tambahkan izin Bluetooth |
| 6 | `package.json` | **Modifikasi** | Tambahkan dependencies |

Semoga dokumentasi ini membantu! 🚀