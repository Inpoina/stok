const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

puppeteer.use(StealthPlugin());

const refreshToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJjdXN0LTIyNjk5NDhAa2xpa2luZG9tYXJldC5jb20iLCJpc0VtcGxveWVlIjoiZmFsc2UiLCJleHRlcm5hbEN1c3RvbWVySWQiOiI5YjcyMjVkMy1iZGE2LTRlNGYtYWYwNC01ZWQyNWFjNGFjYmUiLCJuYmYiOjE3NTMwMjY4MzMsInNjb3BlIjoibW9iaWxlIiwiaXNEcmFmdCI6ImZhbHNlIiwiY3VzdG9tZXJJZCI6IjIyNjk5NDgiLCJleHAiOjE3NTU2MTg4MzMsInNpZCI6ImExMGYwNjhhLTEwMzAtNGM5Mi1iMWU0LTU4MzdiYjU0YTQ3ZSIsInVzZXJuYW1lIjoiY3VzdC0yMjY5OTQ4QGtsaWtpbmRvbWFyZXQuY29tIn0.QACopSL9jp-VlBn21EENXiS0Ny7cZm9myegw5QyYa3sHQAfOQLbZ-sFdbJm0qR9ZU6ESQCwkCMoscJD9EyztLRyFP0ZTOxZQ71VbMFIAA3sDdrhOR-kellfHS9CW1QR4LDNHKfBo92JgamGAKeR5-E39uBP5vqMo5SFXv2OOirRuc-j3plMDXJTRST3fINNaaHOigX7Qhx3vx-G0l838aVudibqMR1Wb83WtFVwQ26TXBzD536voGZjcVNUPHkZiE6OdtE3gCnCMGbnrV3StvTkxI7SQ_W3fnB1JyLppYV6thiQ6OILRMOqMrevcGZi0hYDS8yc_bQ9tCV6olKfLnHlG0RWrA7NykZY6OttIkLXvXmjUeNTXZmeKs8KniwKlUBassSJLRc0Y6H3h5goCaSdTGa6k7yTg-v4-vz_0CNdwvflaaacebF5M8LuWdgbefjoJO2VE-lrokSA-xOZxWij_O8hth4gVyVKzBRKSV2ZFrpwHhzRAZX3XVwOJjzl6JdWTJam3ZZiyCPXQe2o1TzjTecdLitR69mFS7TGxB4pzaOeokq4v9fY_n14DZADtyPmAg_2688iFrYHrAujRWikuMd5TA3K1SIcs8ahsjimctfvn0IjBoaZKiJqTWWEpUpaKkBJc4invOh3vVYN-YoCx6K8khgTHFW6T1BjSzow"; // Ganti dengan token kamu

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled"
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
    fs.writeFileSync("token.txt", accessToken);
    console.log(accessToken); // Tampilkan accessToken murni di stdout
  }

  await browser.close();
})();

