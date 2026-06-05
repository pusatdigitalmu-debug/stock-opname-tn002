# Stock Opname App - Google Apps Script

Aplikasi Stock Opname berbasis Google Apps Script untuk input stok fisik secara real-time dengan multi-user support.

## Fitur

- **Dashboard**: Progress tracking per lokasi dan staff
- **Input Stok**: Form input qty fisik dengan search & filter
- **Assignment**: Admin bisa assign item ke staff
- **Laporan**: Reconciliasi stok system vs fisik
- **Multi-user**: 4 user bisa input bersamaan
- **Export**: Download laporan dalam format CSV

## Cara Deploy

### 1. Buat Google Sheet Baru

1. Buka [Google Sheets](https://sheets.google.com)
2. Buat spreadsheet baru
3. Beri nama "Stock Opname"

### 2. Buka Apps Script Editor

1. Di Google Sheets, klik **Extensions** > **Apps Script**
2. Hapus semua code default di `Code.gs`

### 3. Copy File ke Apps Script

Copy semua file dari folder `stock-opname-app` ke Apps Script Editor:

**File yang perlu dibuat:**

| Nama File | Cara Buat |
|-----------|-----------|
| `Code.gs` | Paste ke file `Code.gs` yang sudah ada |
| `appsscript.json` | Klik ⚙️ (Project Settings) > Show "appsscript.json" file |
| `index.html` | File > New > HTML > beri nama "index" |
| `stylesheet.html` | File > New > HTML > beri nama "stylesheet" |
| `javascript.html` | File > New > HTML > beri nama "javascript" |

### 4. Deploy sebagai Web App

1. Klik **Deploy** > **New deployment**
2. Klik ⚙️ (gear icon) > pilih **Web app**
3. Isi konfigurasi:
   - **Description**: Stock Opname App
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Klik **Deploy**
5. Salin URL web app yang diberikan

### 5. Setup Awal

1. Buka web app melalui URL yang sudah disalin
2. Klik menu **Import CSV** (hanya admin)
3. Klik tombol **Initialize Sheets** untuk membuat semua sheet
4. Paste data CSV ke sheet **Import**
5. Klik tombol **Parse CSV** untuk memproses data

## Penggunaan

### Admin

1. **Import Data**: Paste CSV ke sheet Import, lalu parse
2. **Tambah User**: Menu Users > tambah email staff
3. **Assign Item**: Menu Assignment > pilih staff dan filter
4. **Monitor Progress**: Lihat dashboard
5. **Export Laporan**: Menu Laporan > Export CSV

### Staff

1. **Login**: Buka web app (auto-login dengan Google)
2. **Lihat Item**: Menu Input Stok > lihat item yang di-assign
3. **Input Fisik**: Klik item > masukkan qty fisik > Simpan
4. **Cek Progress**: Dashboard menampilkan progress

## Struktur Sheet

| Sheet | Fungsi |
|-------|--------|
| Data | Data master produk & hasil hitung |
| Users | Daftar user & role |
| Assignment | Penugasan item ke staff |
| Log | History perubahan |
| Import | Tempat paste CSV |

## Format CSV

```
Location,Product Name,Internal Ref,Category,Brand,Lot/Serial,Qty System,Qty Fisik,,Keterangan
TN002/Stock,Nama Produk,SKU-001,Kategori,Brand,,10,,
```

## Role & Permission

| Role | Akses |
|------|-------|
| Admin | Import data, manage user, assign item, monitor semua, export laporan |
| Staff | Input qty fisik untuk item yang di-assign, lihat progress sendiri |

## Troubleshooting

### Error: "Authorization required"
- Klik "Review Permissions" > Pilih akun Google > "Allow"

### Data tidak muncul
- Pastikan sudah klik "Initialize Sheets"
- Pastikan data CSV sudah di-parse

### User tidak bisa akses
- Pastikan email user sudah ditambahkan di sheet Users
- Pastikan status user "Active"

## Tips

1. **Backup**: Selalu backup Google Sheet sebelum reset data
2. **Filter**: Gunakan filter untuk mempermudah pencarian
3. **Real-time**: Semua perubahan langsung ter-sync ke semua user
4. **Mobile**: Aplikasi bisa diakses dari HP (responsive)
