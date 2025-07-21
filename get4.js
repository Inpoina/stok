const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const inquirer = require('inquirer');  // For interactive user input

// Get the store code from command-line arguments
let NAMA_TOKO_YANG_DICARI = process.argv[2];

if (!NAMA_TOKO_YANG_DICARI) {
  // If no argument is provided, prompt the user for input
  console.log('❌ Nama toko tidak diberikan.');
  inquirer.prompt([
    {
      type: 'input',
      name: 'storeName',
      message: '🏬 Masukkan nama toko yang dicari:'
    }
  ]).then((answers) => {
    NAMA_TOKO_YANG_DICARI = answers.storeName;  // Set the store name from user input
    console.log(`🔍 Mencari token untuk toko: ${NAMA_TOKO_YANG_DICARI}`);
    runGetRefreshToken(NAMA_TOKO_YANG_DICARI);
  });
} else {
  // If the argument is provided, directly run the function
  runGetRefreshToken(NAMA_TOKO_YANG_DICARI);
}

// Function to fetch the refresh token from HTML page
async function runGetRefreshToken(storeName) {
  try {
    const response = await axios.get('https://domarx.my.id/token'); // Replace with the actual URL
    const $ = cheerio.load(response.data);

    let found = false;
    let token = '';

    $('table tr').each((i, el) => {
      // Skip header row
      if (i === 0) return;

      const kolom = $(el).find('td');
      const toko = kolom.eq(1).text().trim();  // Store name is in the second column
      token = kolom.eq(2).text().trim(); // The token is in the third column

      if (toko === storeName) {
        found = true;
        return false; // Break out of the loop if store is found
      }
    });

    if (!found) throw new Error(`❌ Token untuk toko "${storeName}" tidak ditemukan`);

    // If found, save the token to file
    fs.writeFileSync('freshtoken.txt', token, 'utf8');
    console.log('✅ Refresh Token berhasil disimpan.');
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}
