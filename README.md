# 🖨️ Thermal Printer iOS App

Aplikasi web-based untuk mencetak ke printer thermal dengan dukungan penuh untuk **iOS** (BLE + AirPrint) dan **Android** (USB/Bluetooth/Network). Solusi untuk mengatasi keterbatasan WebUSB dan Web Bluetooth di Safari iOS.

## 📋 Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Struktur Proyek](#struktur-proyek)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Penggunaan](#penggunaan)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## ✨ Fitur Utama

| Platform | USB | Bluetooth | Network | AirPrint |
|----------|-----|-----------|---------|----------|
| **iOS (Capacitor)** | ❌ | ✅ (BLE 4.0+) | ✅ | ✅ |
| **Android (WebView)** | ✅ | ✅ | ✅ | ❌ |
| **Web Browser** | ❌ | ❌ | ✅ | ✅ |

- ✅ Deteksi otomatis platform
- ✅ Scan printer BLE di iOS
- ✅ Fallback ke AirPrint untuk semua printer
- ✅ Dukungan ESC/POS commands
- ✅ Cetak teks, gambar, QR code, barcode
- ✅ Cut paper otomatis

---

## 📁 Struktur Proyek

```
thermal-printer-app/
│
├── 📂 backend/                          # Node.js backend server
│   ├── server.js                        # Main server file
│   ├── package.json                     # Backend dependencies
│   └── .env                             # Environment variables
│
├── 📂 public/                           # Frontend files (web root)
│   ├── index.html                       # Main UI (BLE + AirPrint)
│   ├── css/
│   │   └── style.css                    # Styling
│   ├── js/
│   │   ├── main.js                      # Main logic
│   │   ├── ble-printer.js               # BLE printer handler
│   │   └── network-print.js             # Network printing fallback
│   └── assets/
│       └── logo.png                     # App logo
│
├── 📂 mobile/                           # Capacitor mobile wrapper
│   ├── capacitor.config.json            # Capacitor configuration
│   ├── package.json                     # Mobile dependencies
│   │
│   ├── 📂 src/
│   │   └── 📂 plugins/
│   │       └── 📂 thermal-printer/      # Custom plugin (optional)
│   │           ├── definitions.ts       # TypeScript definitions
│   │           ├── web.ts               # Web implementation
│   │           └── index.ts             # Plugin export
│   │
│   ├── 📂 ios/                          # iOS native code (generated)
│   │   ├── App/
│   │   │   ├── App/
│   │   │   │   ├── Info.plist           # iOS permissions
│   │   │   │   └── Plugins/
│   │   │   │       └── ThermalPrinterPlugin.swift
│   │   │   └── Podfile                  # CocoaPods dependencies
│   │   └── Pods/                        # Installed pods
│   │
│   └── 📂 android/                      # Android native code (generated)
│       └── app/
│           └── src/main/AndroidManifest.xml
│
├── 📂 node_modules/                     # Dependencies (auto-generated)
│
├── .gitignore                           # Git ignore file
├── README.md                            # This file
├── package.json                         # Root package.json
└── install.sh                           # One-click install script
```

---

## 📦 File & Plugin Detail

### Plugin yang Digunakan

| Plugin | Versi | Fungsi | Platform |
|--------|-------|--------|----------|
| `@capacitor/core` | ^5.0.0 | Capacitor core | iOS, Android |
| `@capacitor/cli` | ^5.0.0 | Capacitor CLI tools | iOS, Android |
| `capacitor-thermal-printer` | ^1.0.0 | Printer thermal BLE | iOS, Android |
| `@capacitor-community/bluetooth-le` | ^4.0.0 | BLE fallback | iOS, Android |
| `express` | ^4.18.0 | Web server | Backend |
| `cors` | ^2.8.5 | CORS middleware | Backend |
| `dotenv` | ^16.0.0 | Environment variables | Backend |

### File Konfigurasi Penting

#### 1. `capacitor.config.json`
```json
{
  "appId": "com.yourcompany.thermalprinter",
  "appName": "Thermal Printer",
  "webDir": "public",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https",
    "iosScheme": "capacitor"
  },
  "plugins": {
    "CapacitorThermalPrinter": {
      "autoConnect": false,
      "scanTimeout": 15000
    }
  }
}
```

#### 2. `backend/server.js`
```javascript
const express = require('express');
const cors = require('cors');
const net = require('net');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

function createPrintData(text) {
    const buffers = [];
    buffers.push(Buffer.from([ESC, 0x40]));        // Initialize
    buffers.push(Buffer.from([ESC, 0x61, 0x01])); // Center align
    buffers.push(Buffer.from([ESC, 0x45, 0x01])); // Bold on
    buffers.push(Buffer.from(text, 'utf-8'));
    buffers.push(Buffer.from([LF, LF, LF]));      // Line feeds
    buffers.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // Cut paper
    return Buffer.concat(buffers);
}

app.post('/api/print', async (req, res) => {
    const { text, ip, port = 9100 } = req.body;
    
    const client = new net.Socket();
    const printData = createPrintData(text);
    
    client.connect(port, ip, () => {
        client.write(printData);
        client.end();
        res.json({ success: true, message: 'Printed successfully' });
    });
    
    client.on('error', (err) => {
        res.status(500).json({ success: false, error: err.message });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

#### 3. `public/js/ble-printer.js`
```javascript
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
```

#### 4. `public/js/network-print.js`
```javascript
// Network Printing (Fallback untuk semua platform)
async function printViaNetwork(text, ip, port = 9100) {
    const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ip, port })
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return true;
}

// AirPrint untuk iOS
function printViaAirPrint(text) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: monospace; padding: 20px; }
                .receipt { max-width: 80mm; margin: 0 auto; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <pre>${text}</pre>
            </div>
            <script>window.print(); setTimeout(() => window.close(), 500);<\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
```

---

## 💻 Persyaratan Sistem

### Development
- Node.js 18+ 
- npm 9+ atau yarn 1.22+
- Xcode 14+ (untuk build iOS)
- CocoaPods 1.12+
- Android Studio (opsional)

### Hardware
- Printer thermal dengan **Bluetooth BLE 4.0+** (untuk koneksi langsung)
- **ATAU** Printer dengan **AirPrint** (universal)
- **ATAU** Printer dengan **koneksi Network (WiFi/Ethernet)**

### Printer yang Telah Diuji

| Merek | Model | Koneksi | Status |
|-------|-------|---------|--------|
| Rongta | RP80-III | BLE, USB | ✅ Working |
| Star Micronics | SM-T300i | BLE, AirPrint | ✅ Working |
| Brother | PJ-773 | AirPrint | ✅ Working |
| Epson | TM-m30 | AirPrint, Network | ✅ Working |
| Generic | ESC/POS | Network (Port 9100) | ✅ Working |

---

## 🚀 Instalasi

### One-Click Install (Linux/Mac)

```bash
# Clone atau download project
cd thermal-printer-app

# Jalankan installer otomatis
chmod +x install.sh
./install.sh
```

### Manual Install

#### 1. Clone & Setup Backend

```bash
# Buat folder project
mkdir thermal-printer-app && cd thermal-printer-app

# Install backend dependencies
npm init -y
npm install express cors dotenv net

# Buat folder public
mkdir public
mkdir public/css public/js public/assets
```

#### 2. Setup Capacitor

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/app

# Install printer plugins
npm install capacitor-thermal-printer --save
npm install @capacitor-community/bluetooth-le --save

# Inisialisasi Capacitor
npx cap init "Thermal Printer" "com.yourcompany.thermalprinter" --web-dir ./public

# Add iOS platform
npx cap add ios

# Sync files
npx cap sync
```

#### 3. Setup iOS Native

```bash
# Install CocoaPods dependencies
cd ios/App
pod install
cd ../..

# Buka di Xcode
npx cap open ios
```

**Langkah Manual di Xcode:**

1. Buka `ios/App/App.xcworkspace`
2. Pilih project "App" → target "App"
3. Buka tab **Build Phases** → **Copy Bundle Resources**
4. Klik **+** → **Add Other...**
5. Pilih `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/ble_serial.plist`
6. Buka `Info.plist` dan tambahkan permissions (lihat konfigurasi)

#### 4. File `.env` untuk Backend

```env
PORT=3000
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

---

## ⚙️ Konfigurasi

### iOS Info.plist (Wajib)

Buka `ios/App/App/Info.plist` dan tambahkan:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Bluetooth Permission -->
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>Aplikasi membutuhkan akses Bluetooth untuk terhubung ke printer thermal</string>
    
    <key>NSBluetoothPeripheralUsageDescription</key>
    <string>Aplikasi membutuhkan akses Bluetooth untuk terhubung ke printer thermal</string>
    
    <!-- Local Network Permission (untuk AirPrint) -->
    <key>NSLocalNetworkUsageDescription</key>
    <string>Aplikasi perlu mengakses jaringan untuk menemukan printer</string>
    
    <key>NSBonjourServices</key>
    <array>
        <string>_printer._tcp</string>
        <string>_ipp._tcp</string>
        <string>_pdl-datastream._tcp</string>
    </array>
    
    <!-- Allow HTTP (development only) -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
```

### Android AndroidManifest.xml

Buka `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Permissions -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />
    
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
    
    <application>
        <!-- ... -->
    </application>
</manifest>
```

---

## 🎮 Penggunaan

### Running Development Server

```bash
# Terminal 1: Jalankan backend
npm run start

# Terminal 2: Jalankan Capacitor (opsional)
npx cap sync
npx cap open ios  # untuk build ke iPhone simulator/device
```

### Testing di Browser

Buka `http://localhost:3000` di browser:
- Gunakan **AirPrint** untuk mencetak
- Gunakan **Network** jika printer support IP

### Testing di iOS Device

```bash
# 1. Build ke device
npx cap copy
npx cap open ios

# 2. Di Xcode:
# - Pilih target device (iPhone)
# - Klik Play button (⌘R)
```

---

## 🔧 Troubleshooting

### 1. "Tidak ada printer terdeteksi" di iOS

**Solusi:**
```bash
# Pastikan file ble_serial.plist sudah ditambahkan
# Cek di Xcode: Build Phases → Copy Bundle Resources

# Restart Bluetooth iPhone
Settings → Bluetooth → Off → On

# Restart printer (coba pairing manual dulu)
Settings → Bluetooth → Cari printer → Pair
```

### 2. Error "Capacitor plugin not found"

**Solusi:**
```bash
# Re-sync Capacitor
npx cap sync
npx cap copy

# Re-build iOS
cd ios/App
pod install
cd ../..
npx cap open ios
```

### 3. AirPrint tidak muncul

**Solusi:**
```bash
# Pastikan printer dan iPhone di WiFi yang sama
# Printer harus support AirPrint
# Cek di Settings → General → AirPrint & Handoff
```

### 4. USB tidak terdeteksi di iOS

**Catatan:** iOS **TIDAK** support WebUSB. Gunakan:
- Bluetooth BLE (jika printer support)
- AirPrint (universal)
- Network printing

---

## ❓ FAQ

### Q: Apakah aplikasi ini bisa jalan di iPad?
**A:** Ya, support penuh untuk iPadOS (sama seperti iOS).

### Q: Printer thermal saya tidak support BLE, bagaimana?
**A:** Gunakan tombol **AirPrint** - ini support untuk SEMUA printer yang terhubung ke iPhone via Bluetooth/WiFi.

### Q: Apakah perlu Apple Developer Account?
**A:** Untuk testing di device sendiri (sideload), cukup dengan Apple ID gratis. Untuk distribusi ke App Store, perlu paid developer account ($99/tahun).

### Q: Biaya pembuatan aplikasi ini?
**A:** 
- Capacitor: Gratis (Open Source)
- Plugin printer: Gratis
- Xcode: Gratis
- Apple Developer (opsional): $99/tahun

### Q: Apakah support Windows?
**A:** Web app bisa jalan di Windows via Chrome/Edge dengan koneksi Network printing. Untuk USB, perlu Electron wrapper.

---

## 📝 Scripts

```json
{
  "scripts": {
    "start": "node backend/server.js",
    "dev": "nodemon backend/server.js",
    "build": "npx cap copy",
    "sync": "npx cap sync",
    "open:ios": "npx cap open ios",
    "open:android": "npx cap open android",
    "build:ios": "npx cap copy && npx cap open ios"
  }
}
```

---

## 📄 Lisensi

MIT License - Bebas digunakan dan dimodifikasi.

---

## 🤝 Kontribusi

Pull requests dipersilakan. Untuk major changes, buka issue dulu ya.

---

## 📞 Support

- **Issues**: [GitHub Issues]
- **Email**: support@thermalprinter.com
- **Dokumentasi**: [Wiki Pages]

---

**Dibuat dengan ❤️ untuk solusi printer thermal di iOS**