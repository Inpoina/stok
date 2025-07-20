const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');
const inquirer = require('inquirer');

const tokenPath = path.join(__dirname, 'token.txt');
const outputXLSX = path.join(__dirname, 'stok.xlsx');
const districtId = '141100100';
const latitude = -6.961055555555555;
const longitude = 107.55672222222222;
const mode = 'PICKUP';

(async () => {
  // Token check
  if (!fs.existsSync(tokenPath)) {
    console.error("❌ Token belum tersedia. Jalankan script login terlebih dahulu.");
    return;
  }

  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  const bearerToken = `Bearer ${token}`;
  console.log("✅ Token ditemukan.");

  // Ambil beberapa storeCode
  const answersStore = await inquirer.prompt([
    {
      type: 'input',
      name: 'storeCodes',
      message: '🏬 Masukkan kode toko (pisahkan dengan koma):',
      filter: (input) => input.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
    }
  ]);

  const storeCodes = answersStore.storeCodes;

  const answersPLU = await inquirer.prompt([
    {
      type: 'input',
      name: 'pluList',
      message: '🛒 Masukkan daftar PLU (pisahkan koma atau baris baru):',
      filter: (input) => input.split(/[\s,]+/).map(p => p.trim()).filter(Boolean)
    }
  ]);

  const pluList = answersPLU.pluList;

  const apiContext = axios.create({
    baseURL: 'https://ap-mc.klikindomaret.com',
    headers: {
      'authorization': bearerToken,
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'origin': 'https://www.klikindomaret.com',
      'referer': 'https://www.klikindomaret.com/',
      'user-agent': 'Mozilla/5.0',
      'x-correlation-id': crypto.randomUUID(),
      'Request-Time': new Date().toISOString(),
      'apps': JSON.stringify({
        app_version: 'Mozilla/5.0',
        device_class: 'browser',
        device_family: 'none',
        device_id: 'auto-id',
        os_name: 'Linux',
        os_version: 'x86_64'
      })
    }
  });

  const results = [];

  for (const storeCode of storeCodes) {
    console.log(`📦 Memeriksa toko: ${storeCode}`);
    for (const plu of pluList) {
      try {
        const res = await apiContext.post(
          '/assets-klikidmcore/api/post/cart-xpress/api/webapp/cart/add-to-cart',
          {
            storeCode, districtId, latitude, longitude, mode,
            products: [{ plu, qty: 1 }]
          }
        );

        const products = res.data?.data?.products || [];
        const matched = products[0];

        results.push({
          Store: storeCode,
          PLU: plu,
          Nama: matched?.productName || 'Tidak ditemukan',
          Stock: matched?.stock ?? 0
        });

        // Kosongkan cart
        await apiContext.post(
          '/assets-klikidmorder/api/post/cart-xpress/api/webapp/cart/update-cart',
          {
            storeCode, districtId, latitude, longitude, mode,
            products: []
          }
        );
      } catch (err) {
        results.push({
          Store: storeCode,
          PLU: plu,
          Nama: 'Gagal',
          Stock: 'N/A'
        });
      }
    }
  }

  // Tampilkan dalam tabel
  console.log("\n📊 Hasil perbandingan stok:");
  console.table(results, ['Store', 'PLU', 'Nama', 'Stock']);

  // Simpan ke Excel
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(results);
  xlsx.utils.book_append_sheet(wb, ws, "Perbandingan");
  xlsx.writeFile(wb, outputXLSX);

  console.log(`📁 Disimpan ke: ${outputXLSX}`);
})();
