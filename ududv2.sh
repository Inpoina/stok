#!/data/data/com.termux/files/usr/bin/bash
# Jalankan nn.js di Alpine, copy stok.html ke penyimpanan internal Android

# Lokasi rootfs Alpine
ALPINE_ROOT="/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/alpine"
ALPINE_FILE="$ALPINE_ROOT/root/stok/stok.html"

# Lokasi tujuan di Android internal storage
TARGET_DIR="/storage/emulated/0/kampret"
TARGET_FILE="$TARGET_DIR/stok.html"
# Pastikan folder target ada
mkdir -p "$TARGET_DIR"

# Jalankan nn.js di Alpine dengan kode toko (param $1)
proot-distro login alpine -- bash -c "cd /root/stok && node roko.js $1"

# Tunggu sebentar agar file selesai dibuat
sleep 2

# Copy hasil stok.html ke /storage/emulated/0/kampret/
if [ -f "$ALPINE_FILE" ]; then
    cp "$ALPINE_FILE" "$TARGET_FILE"
    echo "✅ stok.html dipindahkan ke $TARGET_FILE"

    # Buka otomatis di browser Android
    am start -a android.intent.action.VIEW \
-n com.android.chrome/com.google.android.apps.chrome.Main \
-d "content://com.speedsoftware.explorer.fileprovider/root/storage/emulated/0/Kampret/stok.html"

else
    echo "❌ stok.html tidak ditemukan di Alpine"
fi
