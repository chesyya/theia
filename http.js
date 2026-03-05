const fs = require('fs');
const https = require('https');
const http = require('http');

const sourcePort = 5577;
const targetHost = '127.0.0.1';
const targetPort = 3000;

const server = https.createServer(
    {
        key: fs.readFileSync('/tmp/theia-good-cert/good.key'),
        cert: fs.readFileSync('/tmp/theia-good-cert/good.crt')
    },
    (req, res) => {
        const proxyReq = http.request(
            {
                hostname: targetHost,
                port: targetPort,
                path: req.url,
                method: req.method,
                headers: { ...req.headers, 'x-forwarded-proto': 'https' }
            },
            proxyRes => {
                res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
                proxyRes.pipe(res);
            }
        );

        proxyReq.on('error', err => {
            res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
            res.end('proxy error: ' + err.message);
        });

        req.pipe(proxyReq);
    }
);

server.listen(sourcePort, '127.0.0.1', () => {
    console.log(`HTTPS proxy started: https://localhost:${sourcePort} -> http://${targetHost}:${targetPort}`);
});
