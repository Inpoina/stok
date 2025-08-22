const puppeteer = require("puppeteer-core");
const fs = require("fs");

const refreshTokenFile = "freshtoken.txt";

// Read the refreshToken from the freshtoken.txt file
let refreshToken;
try {
  refreshToken = fs.readFileSync(refreshTokenFile, "utf8").trim();
  if (!refreshToken) {
    throw new Error("Refresh token is empty.");
  }
} catch (error) {
  console.error(`Error reading ${refreshTokenFile}:`, error.message);
  process.exit(1); // Exit the script if the refresh token cannot be read
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true, 
    args: [
      "--no-sandbox",
      "--disable-gpu",
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1366, height: 768 });

  await page.goto("https://ap-mc.klikindomaret.com", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  const accessToken = await page.evaluate(async (refreshToken) => {
    try {
      const res = await fetch(
        "https://ap-mc.klikindomaret.com/assets-klikidmauth/api/post/customer/api/webapp/authentication/refresh-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apps: JSON.stringify({
              app_version: navigator.userAgent,
              device_class: "browser",
              device_family: "none",
              device_id: "random-id-" + Math.random().toString(36).slice(2),
              os_name: "Windows",
              os_version: "10"
            })
          },
          body: JSON.stringify({ refreshToken })
        }
      );

      const data = await res.json();
      return data.data?.accessToken || "";
    } catch (e) {
      return "";
    }
  }, refreshToken);

  if (accessToken) {
    // Check if token.txt exists or has the same content as the current token
    if (fs.existsSync("token.txt")) {
      const currentToken = fs.readFileSync("token.txt", "utf8");
      if (currentToken === accessToken) {
        console.log("Token has not changed.");
        await browser.close();
        return;
      }
    }

    // Write the new token to token.txt
    fs.writeFileSync("token.txt", accessToken);
    console.log("updated", ); 
  } else {
    console.error("Error: Token could not be generated or retrieved.");
  }

  await browser.close();
})();
