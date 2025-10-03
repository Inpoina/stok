const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');
const inquirer = require('inquirer');
const { execSync, exec } = require('child_process');
const { HttpsProxyAgent } = require('https-proxy-agent');  // Use destructuring import for HttpsProxyAgent

const tokenPath = path.join(__dirname, 'token.txt');
const districtId = '141100100';
const latitude = -6.961055555555555;
const longitude = 107.55672222222222;
const mode = 'PICKUP';
const outputXLSX = path.join(__dirname, 'stok.xlsx');
const outputHTML = path.join(__dirname, 'stok.html');

console.clear();

// Proxy List (Add more proxies here)
const proxyList = [
    'http://fc9bd4903c8633111a86:4dae1a8f4a0b2301@177.54.154.87:823'
];

(async () => {
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

    // Jika token.txt belum ada, jalankan get4.js dan token.js
    if (!fs.existsSync(tokenPath)) {
        console.log("❌ token tidak ditemukan, ambil token...");
        try {
            execSync(`node get4.js "${storeCode}"`, { stdio: 'inherit' });
            execSync('node token.js', { stdio: 'inherit' });
        } catch (e) {
            console.error("❌ Gagal refresh token otomatis:", e.message);
            return;
        }

        if (!fs.existsSync(tokenPath)) {
            console.error("❌ Token masih belum tersedia setelah refresh.");
            return;
        }
    }

    const token = fs.readFileSync(tokenPath, 'utf8').trim();

    // Select random proxy from the list
    const randomProxy = proxyList[Math.floor(Math.random() * proxyList.length)];

    // Create a new Axios instance with the proxy configuration
    const apiContext = axios.create({
        baseURL: 'https://ap-mc.klikindomaret.com',
        headers: {
            'authorization': `Bearer ${token}`,
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
        },
        httpsAgent: new HttpsProxyAgent(randomProxy)  // Correct usage of HttpsProxyAgent
    });

    // ==== Input PLU from editor ====
    const answers = await inquirer.prompt([
        {
            type: 'editor',
            name: 'pluList',
            message: '🛒 Masukkan daftar PLU (pisahkan koma atau baris baru):',
            filter: input =>
                input
                    .split(/[\s,]+/)
                    .map(x => x.trim())
                    .filter(Boolean)
        }
    ]);

    const { pluList } = answers;
    if (pluList.length === 0) {
        console.error("❌ Tidak ada PLU yang dimasukkan.");
        return;
    }

    const addedProducts = [];
    const totalPlu = pluList.length;

    for (let currentPlu = 0; currentPlu < totalPlu; currentPlu++) {
        const plu = pluList[currentPlu];
        let progress = Math.floor(((currentPlu + 1) / totalPlu) * 100);
        process.stdout.clearLine();  // Clear current line
        process.stdout.cursorTo(0);  // Move cursor to the beginning of the line
        process.stdout.write(`🔎 Cek PLU: ${plu} - ${progress}%`);

        try {
            await tambahKeCart(apiContext, storeCode, plu, addedProducts);
        } catch (err) {
            const status = err?.response?.status;
            console.error(`❌ Gagal tambah PLU ${plu}: ${status || err.message}`);

            if (status === 401) {
                console.log("🔁 Token 401, refresh token sekarang...");
                try {
                    execSync(`node get4.js "${storeCode}"`, { stdio: 'inherit' });
                    execSync('node token.js', { stdio: 'inherit' });

                    const newToken = fs.readFileSync(tokenPath, 'utf8').trim();
                    apiContext.defaults.headers['authorization'] = `Bearer ${newToken}`;

                    console.log("🔁 Ulangi tambah PLU setelah refresh...");
                    await tambahKeCart(apiContext, storeCode, plu, addedProducts);
                } catch (e) {
                    console.error("❌ Gagal refresh token:", e.message);
                    addedProducts.push({ plu, name: 'Failed after refresh', stock: 'N/A' });
                }
            } else {
                addedProducts.push({ plu, name: 'Gagal ditambahkan', stock: 'N/A' });
            }
        }
    }

    if (addedProducts.length === 0) {
        console.log("❌ Tidak ada produk berhasil ditambahkan.");
        return;
    }

    // Simpan data ke HTML dan Excel
    simpanKeHTML(addedProducts, storeCode);
    simpanKeExcel(addedProducts);
})();

// ==== Additional Functions ====
async function tambahKeCart(apiContext, storeCode, plu, addedProducts) {
    const res = await apiContext.post(
        '/assets-klikidmcore/api/post/cart-xpress/api/webapp/cart/add-to-cart',
        {
            storeCode,
            districtId,
            latitude,
            longitude,
            mode,
            products: [{ plu, qty: 1 }]
        }
    );

    const products = res.data?.data?.products || [];
    if (products.length > 0) {
        const p = products[0];
        addedProducts.push({ plu: p.plu, name: p.productName, stock: p.stock });
    } else {
        addedProducts.push({ plu, name: 'tidak ditemukan / stok 0', stock: '0' });
    }

    await apiContext.post(
        '/assets-klikidmorder/api/post/cart-xpress/api/webapp/cart/update-cart',
        {
            storeCode,
            districtId,
            latitude,
            longitude,
            mode,
            products: []
        }
    );
}

function simpanKeHTML(addedProducts, storeCode) {
    const timestamp = new Date().toLocaleString("id-ID");
    let rows = addedProducts.map((p, i) => `
        <tr class="${p.stock == 0 ? 'stok-habis' : ''}">
            <td>${i + 1}</td>
            <td>${p.plu}</td>
            <td>${p.name}</td>
            <td>${p.stock}</td>
        </tr>`
    ).join("\n");

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Stok Toko ${storeCode}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      background: #f9fafb;
      color: #1f2937;
      padding: 8px;
      margin: 0;
    }
    h2, p {
      text-align: center;
      margin: .5rem 0;
    }
    .table-container {
      overflow-x: auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      margin-top: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 500px;
    }
    thead {
      background: #2563eb;
      color: #fff;
    }
    th, td {
      padding: 10px 12px;
      font-size: 14px;
      text-align: left;
    }
    tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    tbody tr:hover {
      background: #e0f2fe;
      transition: background .2s;
    }
    td:last-child {
      font-weight: bold;
      text-align: center;
    }
    .stok-habis td {
      background: #fee2e2 !important;
      color: #b91c1c;
    }
  </style>
</head>
<body>
  <h2>Data Stok Toko: ${storeCode}</h2>
  <p>📅 Dibuat pada: ${timestamp}</p>
  <div class="table-container">
    <table id="stokTable">
      <thead>
        <tr>
          <th>No</th>
          <th>PLU</th>
          <th>Deskripsi</th>
          <th>Stok</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    fs.writeFileSync(outputHTML, html, 'utf8');
    console.log(`🌐 Data juga disimpan ke file HTML: ${outputHTML}`);
}

function simpanKeExcel(addedProducts) {
    const excelData = addedProducts.map((p, i) => ({
        No: i + 1,
        PLU: p.plu,
        "Nama Produk": p.name,
        "Sisa Stok": p.stock
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(excelData);

    const colWidths = ['No', 'PLU', 'Nama Produk', 'Sisa Stok'];
    ws['!cols'] = colWidths.map(col => {
        const maxLen = Math.max(...excelData.map(row => String(row[col]).length), col.length);
        return { wch: maxLen + 2 };
    });

    xlsx.utils.book_append_sheet(wb, ws, "Cart");
    xlsx.writeFile(wb, outputXLSX);
    console.log(`📦 Data disimpan ke file: ${outputXLSX}`);
}
