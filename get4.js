const axios = require('axios');
const cheerio = require('cheerio'); // Install dengan: npm install cheerio
const fs = require('fs');  // Modul untuk menulis ke file

// Mengambil nama toko dari argumen command line
const NAMA_TOKO_YANG_DICARI = process.argv[2]; // Argumen pertama setelah nama file

if (!NAMA_TOKO_YANG_DICARI) {
  console.log('❌ Silakan masukkan nama toko sebagai argumen.');
  process.exit(1); // Keluar jika nama toko tidak diberikan
}

// Fungsi untuk mengambil refresh token dari HTML
async function getRefreshTokenFromHTML() {
  try {
    const response = await axios.get('https://domarx.my.id/token'); // Ganti dengan URL yang sesuai
    const $ = cheerio.load(response.data);

    let found = false;
    let token = '';

    $('table tr').each((i, el) => {
      // Skip baris header
      if (i === 0) return;

      const kolom = $(el).find('td');
      const toko = kolom.eq(1).text().trim();  // Mengambil nama toko dari kolom kedua
      token = kolom.eq(2).text().trim(); // Mengambil token dari kolom ketiga

      //console.log(`🔍 Cek baris ${i}: toko="${toko}", token="${token.substring(0, 20)}..."`);

      if (toko === NAMA_TOKO_YANG_DICARI) {
        found = true;
        return false; // Keluar dari loop jika toko ditemukan
      }
    });

    if (!found) throw new Error(`❌ Token untuk toko "${NAMA_TOKO_YANG_DICARI}" tidak ditemukan`);

    return token; // Mengembalikan token yang ditemukan
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Menyimpan refreshToken ke dalam file
async function simpanRefreshToken() {
  const refreshToken = await getRefreshTokenFromHTML();
  if (refreshToken) {
    fs.writeFileSync('refreshToken.txt', refreshToken, 'utf8');
    console.log('✅ Refresh ');
  }
}

// Jalankan fungsi untuk menyimpan refresh token
simpanRefreshToken();
