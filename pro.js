const puppeteer = require("puppeteer");

const refreshToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJjdXN0LTIyNjk5NDhAa2xpa2luZG9tYXJldC5jb20iLCJpc0VtcGxveWVlIjoiZmFsc2UiLCJleHRlcm5hbEN1c3RvbWVySWQiOiI5YjcyMjVkMy1iZGE2LTRlNGYtYWYwNC01ZWQyNWFjNGFjYmUiLCJuYmYiOjE3NTMwMjY4MzMsInNjb3BlIjoibW9iaWxlIiwiaXNEcmFmdCI6ImZhbHNlIiwiY3VzdG9tZXJJZCI6IjIyNjk5NDgiLCJleHAiOjE3NTU2MTg4MzMsInNpZCI6ImExMGYwNjhhLTEwMzAtNGM5Mi1iMWU0LTU4MzdiYjU0YTQ3ZSIsInVzZXJuYW1lIjoiY3VzdC0yMjY5OTQ4QGtsaWtpbmRvbWFyZXQuY29tIn0.QACopSL9jp-VlBn21EENXiS0Ny7cZm9myegw5QyYa3sHQAfOQLbZ-sFdbJm0qR9ZU6ESQCwkCMoscJD9EyztLRyFP0ZTOxZQ71VbMFIAA3sDdrhOR-kellfHS9CW1QR4LDNHKfBo92JgamGAKeR5-E39uBP5vqMo5SFXv2OOirRuc-j3plMDXJTRST3fINNaaHOigX7Qhx3vx-G0l838aVudibqMR1Wb83WtFVwQ26TXBzD536voGZjcVNUPHkZiE6OdtE3gCnCMGbnrV3StvTkxI7SQ_W3fnB1JyLppYV6thiQ6OILRMOqMrevcGZi0hYDS8yc_bQ9tCV6olKfLnHlG0RWrA7NykZY6OttIkLXvXmjUeNTXZmeKs8KniwKlUBassSJLRc0Y6H3h5goCaSdTGa6k7yTg-v4-vz_0CNdwvflaaacebF5M8LuWdgbefjoJO2VE-lrokSA-xOZxWij_O8hth4gVyVKzBRKSV2ZFrpwHhzRAZX3XVwOJjzl6JdWTJam3ZZiyCPXQe2o1TzjTecdLitR69mFS7TGxB4pzaOeokq4v9fY_n14DZADtyPmAg_2688iFrYHrAujRWikuMd5TA3K1SIcs8ahsjimctfvn0IjBoaZKiJqTWWEpUpaKkBJc4invOh3vVYN-YoCx6K8khgTHFW6T1BjSzow";

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );

  // Bypass JS challenge Cloudflare otomatis
  await page.goto("https://ap-mc.klikindomaret.com", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  // Setelah cookies dan JS OK, kirim fetch langsung dari browser
  const result = await page.evaluate(async (refreshToken) => {
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
            device_id: "your-device-id-here",
            os_name: "Windows",
            os_version: "10"
          })
        },
        body: JSON.stringify({ refreshToken })
      }
    );

    return res.json();
  }, refreshToken);

  console.log("✅ AccessToken:", result.data?.accessToken);
  console.log("🔁 RefreshToken:", result.data?.refreshToken);
  await browser.close();
})();
