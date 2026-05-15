import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const backendHost = process.env.BACKEND_HOST || "127.0.0.1";
const backendPort = Number(process.env.BACKEND_PORT || 4000);
const baseDir = process.cwd();
const publicDir = path.join(baseDir, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      const proxyRequest = http.request(
        {
          host: backendHost,
          port: backendPort,
          path: `${url.pathname}${url.search}`,
          method: req.method,
          headers: {
            ...req.headers,
            host: `${backendHost}:${backendPort}`,
          },
        },
        (proxyResponse) => {
          res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
          proxyResponse.pipe(res);
        },
      );

      proxyRequest.on("error", () => {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ message: "백엔드 서버에 연결할 수 없습니다." }));
      });

      req.pipe(proxyRequest);
      return;
    }

    const requestPath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const candidatePaths = [
      path.join(baseDir, requestPath),
      path.join(publicDir, requestPath),
    ];
    let filePath = candidatePaths.find((candidate) => {
      if (!candidate.startsWith(baseDir)) {
        return false;
      }

      return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    });

    if (!filePath) {
      filePath = path.join(baseDir, "index.html");
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || "text/plain; charset=utf-8";

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end("Internal Server Error");
        return;
      }

      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  })
  .listen(port, host, () => {
    console.log(`Frontend listening on http://${host}:${port}`);
  });
