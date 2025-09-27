
# Lokasi rootfs Alpine
ALPINE_ROOT="/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/alpine"                                                  ALPINE_FILE="$ALPINE_ROOT/root/stok/stok.html"

# Lokasi tujuan di Android internal storage
TARGET_DIR="/data/data/com.termux/files/home"
TARGET_FILE="$TARGET_DIR/index.html"

# Pastikan folder target ada
mkdir -p "$TARGET_DIR"

# Jalankan nn.js di Alpine dengan kode toko (param $1)
proot-distro login alpine -- bash -c "cd /root/stok && node new5.js $1"

# Tunggu sebentar agar file selesai dibuat
sleep 2

# Copy hasil stok.html ke /storage/emulated/0/kampret/
if [ -f "$ALPINE_FILE" ]; then
    cp "$ALPINE_FILE" "$TARGET_FILE"

proot-distro login alpine -- bash -c "cd /root/stok && bash mv.sh "

    # Buka otomatis di browser Android
    php -S localhost:8080 & am start -a android.intent.action.VIEW -d "http://localhost:8080/"



else
    echo "❌ stok.html tidak ditemukan di Alpine"
fi
