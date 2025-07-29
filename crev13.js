const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');
const inquirer = require('inquirer');
const { execSync } = require('child_process');

const tokenPath = path.join(__dirname, 'token.txt');
const districtId = '141100100';
const latitude = -6.961055555555555;
const longitude = 107.55672222222222;
const mode = 'PICKUP';
const outputXLSX = path.join(__dirname, 'stok.xlsx');

console.clear();
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
        console.log("❌ token.txt tidak ditemukan. Menjalankan get4.js dan token.js...");
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
        }
    });

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'pluList',
            message: '🛒 Masukkan daftar PLU (pisahkan koma atau baris baru):',
            filter: input => input.split(/[\s,]+/).map(x => x.trim()).filter(Boolean)
        }
    ]);

    const { pluList } = answers;
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

    tampilkanTabel(addedProducts, storeCode);
    simpanKeExcel(addedProducts);
})();

// ==== Fungsi Tambahan ====
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

function tampilkanTabel(addedProducts, storeCode) {
    const maxNo = String(addedProducts.length).length;
    const maxPlu = Math.max(...addedProducts.map(p => p.plu.length));
    const maxName = Math.max(...addedProducts.map(p => p.name.length));
    const maxStock = Math.max(...addedProducts.map(p => String(p.stock).length));

    const top = "╔" + "═".repeat(maxNo + 2) + "╦" + "═".repeat(maxPlu + 2) + "╦" + "═".repeat(maxName + 2) + "╦" + "═".repeat(maxStock + 2) + "═╗";
    const mid = "╠" + "═".repeat(maxNo + 2) + "╬" + "═".repeat(maxPlu + 2) + "╬" + "═".repeat(maxName + 2) + "╬" + "═".repeat(maxStock + 2) + "═╣";
    const bot = "╚" + "═".repeat(maxNo + 2) + "╩" + "═".repeat(maxPlu + 2) + "╩" + "═".repeat(maxName + 2) + "╩" + "═".repeat(maxStock + 2) + "═╝";
    console.clear();
    console.log(`\n✅ Data stok toko: ${storeCode}`);
    console.log(top);
    console.log(
        `║ No`.padEnd(maxNo + 3) +
        `║ PLU`.padEnd(maxPlu + 3) +
        `║ Nama Produk`.padEnd(maxName + 3) +
        `║Stok`.padEnd(maxStock + 3) +  // Added for stock column
        ` ║`
    );
    console.log(mid);

    addedProducts.forEach((p, i) => {
        console.log(
            `║ ${String(i + 1).padStart(maxNo)} ║ ${p.plu.padEnd(maxPlu)} ║ ${p.name.padEnd(maxName)} ║ ${String(p.stock).padStart(maxStock)}  ║`
        );
        console.log(mid);
    });

    console.log(bot);
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
    console.log(`\n📦 Data disimpan ke file: ${outputXLSX}`);
}
