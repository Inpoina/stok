const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');
const inquirer = require('inquirer');  // Importing inquirer for interactive input
const { execSync } = require('child_process');  // Importing execSync for synchronous script execution

const tokenPath = path.join(__dirname, 'token.txt');
const districtId = '141100100';
const latitude = -6.961055555555555;
const longitude = 107.55672222222222;
const mode = 'PICKUP';
const outputXLSX = path.join(__dirname, 'stok.xlsx');

(async () => {
  // Check if token.txt exists, if not run get4.js and token.js to refresh the token
  if (!fs.existsSync(tokenPath)) {
    console.log("❌ Token belum tersedia, menjalankan get4.js dan token.js untuk mendapatkan token...");
    
    // Run get4.js synchronously to fetch the refresh token
    try {
      console.log("Menjalankan get4.js untuk mendapatkan refresh token...");
      execSync('node get4.js', { stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ Error menjalankan get4.js: ${error.message}`);
      return;
    }

    // Run token.js to obtain a new access token
    try {
      console.log("Menjalankan token.js untuk mendapatkan access token...");
      execSync('node token.js', { stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ Error menjalankan token.js: ${error.message}`);
      return;
    }

    // After refreshing the token, exit the function to prevent proceeding further without a valid token
    if (!fs.existsSync(tokenPath)) {
      console.error("❌ Token belum berhasil diperoleh.");
      return;
    }

    console.log("✅ Token berhasil diperoleh dan disimpan.");
  } else {
    console.log("✅ Token ditemukan.");
  }

  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  const bearerToken = `Bearer ${token}`;

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
        device_class: 'browser|browser',
        device_family: 'none',
        device_id: 'auto-id',
        os_name: 'Linux',
        os_version: 'x86_64'
      })
    }
  });

  let storeCode = process.argv[2];

  if (!storeCode) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'storeCode',
        message: '🏬 Masukkan kode toko:'
      }
    ]);
    storeCode = answers.storeCode;
  }

  console.log(`Store code yang dipilih: ${storeCode}`);

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'pluList',
      message: '🛒 Masukkan daftar PLU (pisahkan koma atau baris baru):',
      filter: (input) => input.split(/[\s,]+/).map(p => p.trim()).filter(Boolean)
    }
  ]);

  const { pluList } = answers;

  console.log(`Daftar PLU yang dipilih: ${pluList.join(", ")}`);

  const addedProducts = [];

  for (const plu of pluList) {
    console.log(`🔎 PLU: ${plu}...`);
    try {
      const res = await apiContext.post(
        '/assets-klikidmcore/api/post/cart-xpress/api/webapp/cart/add-to-cart',
        {
          storeCode: storeCode,
          districtId,
          latitude,
          longitude,
          mode,
          products: [{ plu, qty: 1 }]
        }
      );

      if (res.status === 401) {
        console.error("❌ Token expired, running get4.js and token.js to refresh.");

        // Run get4.js synchronously
        try {
          console.log("Running get4.js to fetch a new refresh token...");
          execSync('node get4.js', { stdio: 'inherit' });

          // After get4.js, run token.js synchronously to refresh the access token
          console.log("Running token.js to refresh access token...");
          execSync('node token.js', { stdio: 'inherit' });

          // Retry the original request after refreshing the token
          const newToken = fs.readFileSync(tokenPath, 'utf8').trim();
          const newBearerToken = `Bearer ${newToken}`;
          apiContext.defaults.headers['authorization'] = newBearerToken;

          // Retry the add-to-cart request after refreshing the token
          const retryRes = await apiContext.post(
            '/assets-klikidmcore/api/post/cart-xpress/api/webapp/cart/add-to-cart',
            {
              storeCode: storeCode,
              districtId,
              latitude,
              longitude,
              mode,
              products: [{ plu, qty: 1 }]
            }
          );

          // Continue with the normal logic after retry
          const products = retryRes.data?.data?.products || [];
          if (products.length > 0) {
            const matchedProduct = products[0];

            addedProducts.push({
              plu: matchedProduct.plu,
              name: matchedProduct.productName,
              stock: matchedProduct.stock
            });
          } else {
            addedProducts.push({
              plu: plu,
              name: 'tidak ditemukan / stok 0',
              stock: '0'
            });
          }

          await apiContext.post(
            '/assets-klikidmorder/api/post/cart-xpress/api/webapp/cart/update-cart',
            {
              storeCode: storeCode,
              districtId,
              latitude,
              longitude,
              mode,
              products: []
            }
          );

        } catch (error) {
          console.error(`❌ Error refreshing token: ${error.message}`);
          return;
        }
      } else {
        const products = res.data?.data?.products || [];
        if (products.length > 0) {
          const matchedProduct = products[0];

          addedProducts.push({
            plu: matchedProduct.plu,
            name: matchedProduct.productName,
            stock: matchedProduct.stock
          });
        } else {
          addedProducts.push({
            plu: plu,
            name: 'tidak ditemukan / stok 0',
            stock: '0'
          });
        }

        await apiContext.post(
          '/assets-klikidmorder/api/post/cart-xpress/api/webapp/cart/update-cart',
          {
            storeCode: storeCode,
            districtId,
            latitude,
            longitude,
            mode,
            products: []
          }
        );
      }
    } catch (err) {
      console.error(`❌ Gagal tambah PLU ${plu}: ${err.response?.status || err.message}`);
      addedProducts.push({
        plu: plu,
        name: 'Failed to add',
        stock: 'N/A'
      });
    }
  }

  if (addedProducts.length === 0) {
    console.log("❌ Tidak ada produk valid untuk ditambahkan.");
    return;
  }

  const maxNoLength = String(addedProducts.length).length;
  const maxPluLength = Math.max(...addedProducts.map(p => p.plu.length));
  const maxNameLength = Math.max(...addedProducts.map(p => p.name.length));
  const maxStockLength = Math.max(...addedProducts.map(p => String(p.stock).length));

  const colNoWidth = Math.max(maxNoLength, 2);
  const colPluWidth = Math.max(maxPluLength, 10);
  const colNameWidth = Math.max(maxNameLength, 20);
  const colStockWidth = Math.max(maxStockLength, 6);

  const borderTop = "╔" + "═".repeat(colNoWidth + 2) + "╦" + "═".repeat(colPluWidth + 2) + "╦" + "═".repeat(colNameWidth + 2) + "╦" + "═".repeat(colStockWidth + 2) + "╗";
  const borderMid = "╠" + "═".repeat(colNoWidth + 2) + "╬" + "═".repeat(colPluWidth + 2) + "╬" + "═".repeat(colNameWidth + 2) + "╬" + "═".repeat(colStockWidth + 2) + "╣";
  const borderBot = "╚" + "═".repeat(colNoWidth + 2) + "╩" + "═".repeat(colPluWidth + 2) + "╩" + "═".repeat(colNameWidth + 2) + "╩" + "═".repeat(colStockWidth + 2) + "╝";

  console.log(`✅ stok toko: ${storeCode}`);
  console.log(borderTop);
  console.log(`║ No`.padEnd(colNoWidth + 3) + `║ PLU`.padEnd(colPluWidth + 3) + `║ Nama Produk`.padEnd(colNameWidth + 3) + `║  Stok`.padEnd(colStockWidth + 2) + " ║");
  console.log(borderMid);

  addedProducts.forEach((p, i) => {
    const row = `║ ${String(i + 1).padStart(colNoWidth)} ║ ${String(p.plu).padEnd(colPluWidth)} ║ ${String(p.name).padEnd(colNameWidth)} ║ ${String(p.stock).padStart(colStockWidth)} ║`;
    console.log(row);
    console.log(borderMid);
  });

  console.log(borderBot);

  const excelData = addedProducts.map((p, i) => ({
    No: i + 1,
    PLU: p.plu,
    "Nama Produk": p.name,
    "Sisa Stok": p.stock
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(excelData);

  const colWidths = ['No', 'PLU', 'Nama Produk', 'Sisa Stok'];
  colWidths.forEach((col) => {
    const maxLength = Math.max(
      ...excelData.map((row) => String(row[col]).length),
      col.length
    );
    ws['!cols'] = ws['!cols'] || [];
    ws['!cols'].push({ wch: maxLength + 2 });
  });

  xlsx.utils.book_append_sheet(wb, ws, "Cart");
  xlsx.writeFile(wb, outputXLSX);
})();
