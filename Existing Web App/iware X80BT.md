## Printer **iware X80BT** menggunakan koneksi **Bluetooth** yang di iOS hanya bisa diakses lewat framework native (CoreBluetooth), karena WebUSB dan Web Bluetooth memang tidak didukung oleh browser iOS mana pun .

## Agar web app bisa mencetak ke X80BT di iPhone, tetap perlu membungkus aplikasi web yang sudah ada ke dalam aplikasi iOS native dengan **Capacitor**, lalu menambahkan plugin yang kompatibel dengan ESC/POS (protokol standar printer thermal) dan pastikan izin Bluetooth sudah ditambahkan di konfigurasi.
Untuk memastikan kompatibilitasnya, berikut langkah-langkah yang bisa coba:

### 1. Setup Capacitor dan Instalasi Plugin
Jalankan perintah berikut di terminal proyek web-mu untuk mengonversinya menjadi aplikasi iOS native:
```bash
# Install Capacitor Core dan CLI
npm install @capacitor/core @capacitor/cli

# Inisialisasi project (ganti dengan ID unik aplikasimu)
npx cap init "Aplikasi Thermal" "com.example.thermalprinter"

# Tambahkan platform iOS
npx cap add ios

# Install plugin printer thermal (rekomendasi: capacitor-thermal-printer)
npm install capacitor-thermal-printer
```

### 2. Konfigurasi Izin Bluetooth (Info.plist)
Buka folder `ios/App/App/Info.plist` di Xcode atau editor teks, lalu tambahkan kode berikut agar aplikasi meminta izin akses Bluetooth saat pertama kali dijalankan:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Aplikasi memerlukan akses Bluetooth untuk terhubung ke printer thermal iware X80BT</string>
```

### 3. Tambahkan Resource Tambahan di Xcode
**Langkah ini penting agar BLE bisa jalan di iOS.**
1. Buka project iOS: `npx cap open ios`
2. Di Xcode, klik folder `App` di sisi kiri, pilih target `App`.
3. Buka tab **Build Phases** > **Copy Bundle Resources**.
4. Klik ikon **+** > **Add Other...**.
5. Cari file `ble_serial.plist` di dalam folder `node_modules/capacitor-thermal-printer/ios/Plugin/Resources/`, lalu tambahkan.

### 4. Script Cetak untuk Frontend
Ganti mekanisme cetak di `index.html` atau file JavaScript utama dengan kode berikut untuk mengirim perintah ESC/POS ke printer iware X80BT:
```javascript
// Pastikan sudah load Capacitor dan plugin di HTML
const { CapacitorThermalPrinter } = Capacitor.Plugins;

async function cetakStruk() {
  // Cek apakah di environment iOS yang sudah dibungkus
  if (window.Capacitor?.getPlatform() !== 'ios') {
    alert("Fitur ini hanya tersedia di aplikasi iOS.");
    return;
  }

  try {
    // 1. Scan printer
    await CapacitorThermalPrinter.startScan();
    CapacitorThermalPrinter.addListener('discoverDevices', async (devices) => {
      // Cari device dengan nama "iware X80BT" atau address tertentu
      const targetPrinter = devices.find(d => d.name?.includes('iware') || d.name?.includes('X80'));
      
      if (targetPrinter) {
        // 2. Konek ke printer
        await CapacitorThermalPrinter.connect({ address: targetPrinter.address });
        
        // 3. Cetak teks dengan format struk
        await CapacitorThermalPrinter.begin()
          .initialize()
          .align('center')
          .text('TOKO ANDA\n')
          .text('Jl. Contoh No. 123\n')
          .text('========================\n')
          .align('left')
          .text('Item 1      Rp 10.000\n')
          .text('Item 2      Rp 25.000\n')
          .text('========================\n')
          .align('right')
          .text('TOTAL: Rp 35.000\n\n')
          .align('center')
          .text('Terima kasih!\n')
          .cutPaper()  // Potong kertas
          .write();
          
        alert("Cetak berhasil!");
      } else {
        alert("Printer iware X80BT tidak ditemukan. Pastikan Bluetooth menyala.");
      }
      
      // Berhenti scan setelah menemukan
      await CapacitorThermalPrinter.stopScan();
    });
  } catch (error) {
    console.error(error);
    alert("Gagal mencetak: " + error.message);
  }
}
```

### 5. Build ke File .ipa untuk Dipasang di iPhone
Setelah kode siap dan semua konfigurasi di Xcode sudah benar (termasuk memilih *Signing & Capabilities* dengan Apple ID), klik **Product > Archive** di Xcode untuk menghasilkan file `.ipa` yang bisa dipasang ke iPhone.

Jika setelah mengikuti langkah-langkah di atas printer X80BT tetap tidak terdeteksi, kemungkinan besar printer tersebut menggunakan chip Bluetooth **Classic** (bukan BLE). Di iOS, akses ke Bluetooth Classic sangat terbatas untuk aplikasi pihak ketiga. Sebagai solusi, bisa menggunakan **mode AirPrint** (jika printer mendukung) atau mengganti printer dengan model yang jelas-jelas mendukung **BLE** seperti Rongta atau Sunmi.
