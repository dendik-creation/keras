import axios from "axios";
import https from "https";
const agent = new https.Agent({ rejectUnauthorized: false });
const axiosScrapClient = axios.create({
  httpsAgent: agent,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/json,text/javascript,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
  },
  validateStatus: (status) => status >= 200 && status < 400,
  maxRedirects: 0,
  withCredentials: true,
});

export { axiosScrapClient };
