const http = require('http');
const fs = require('fs');

const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync('/tmp/proxy-debug.log', line);
};

const server = http.createServer((req, res) => {
  const headers = {...req.headers};
  delete headers['x-real-ip'];
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-for'];
  delete headers['x-forwarded-proto'];
  
  const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: req.url,
    method: req.method,
    headers,
    timeout: 30000,
  };
  
  const proxy = http.request(options, (pRes) => {
    res.writeHead(pRes.statusCode, pRes.headers);
    pRes.pipe(res);
  });
  
  proxy.on('error', (err) => {
    log(`UPSTREAM ERROR: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, {'Content-Type': 'text/html'});
      res.end('<html><body><h2>Server is restarting...</h2><p>Please wait a moment and refresh.</p><script>setTimeout(()=>location.reload(),3000)</script></body></html>');
    }
  });
  
  req.on('error', () => { proxy.destroy(); });
  req.pipe(proxy);
});

server.listen(3000, () => {
  log('Proxy :3000 -> :3001');
});
