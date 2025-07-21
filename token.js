const puppeteer = require("puppeteer-core");
const fs = require("fs");

const refreshToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJjdXN0LTIyNjk5NDhAa2xpa2luZG9tYXJldC5jb20iLCJpc0VtcGxveWVlIjoiZmFsc2UiLCJleHRlcm5hbEN1c3RvbWVySWQiOiI5YjcyMjVkMy1iZGE2LTRlNGYtYWYwNC01ZWQyNWFjNGFjYmUiLCJuYmYiOjE3NTMwOTE4MzQsInNjb3BlIjoibW9iaWxlIiwiaXNEcmFmdCI6ImZhbHNlIiwiY3VzdG9tZXJJZCI6IjIyNjk5NDgiLCJleHAiOjE3NTU2ODM4MzQsInNpZCI6IjM1YjVhNDY1LTY3NjYtNDNmNS1iZmI3LTU0YmNhOGI2OTJjMCIsInVzZXJuYW1lIjoiY3VzdC0yMjY5OTQ4QGtsaWtpbmRvbWFyZXQuY29tIn0.jtRMWO0oJuBSWGjxfdcrmbr8JBjEanhV_BW5icOFTQQwoc4_9d5G8i53I3UPb0oP0v6WP9ckom4vXeNQd02HCZ9g-pHIpdZBjpX5oepHpKABy88u2KmAks_0qYHiJVPv3cmhWj-0n5x4lkmj3N2GcUYNlTQkLYJJHi56RCiEKFMGAJemIR120GkXdYp46CPO_0MwsDoPcyyGdt5XcTS7dZeNXL7hFYPNqnvS7PaRJmAakj3ZNTtmmYcRi1Q8y7T75ouz72xNYwwa02g9gmg_jHiASAQtgm2e6bL9rG7T0b21GZkFEzhWNfvVooe1uywDYnGGDEFHOHXx_at02ereajKjqm989_kDlkEV1wd1Pzk3CJa_EdDUiElmxyi7cDG2qMFnCUDIlI8ZcHFPwMrI9dNHEZk2Am5NlaBnlCN4L3cYGFkxGKH4UFoHofbynxW00ZMqnBQmEWiQmN7iUJevCb0KC57EqaznGl6H4T9IIDlkkfX8oUPdholsWta7Tv6TMNjVGUt2EuPE_bGA3VVXi9FJebEEpK8REM6zIaXGKXl4PccErmHi9hWVKCdbila5JsQFxrd2bL0sXgWgcdUM-oK8Fa_2w4IeA1gJ9pfgvKov6cX2VMqd8MZm110hoyabmRGiYhkmagkai_M1rz9GjROTtP7xhu9s0-4lkeB2yk0"; // Ganti dengan token kamu

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // Menjaga Puppeteer berjalan di background
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
    fs.writeFileSync("token.txt", accessToken);
    console.log(accessToken); // Tampilkan accessToken murni di stdout
  }

  await browser.close();
})();
