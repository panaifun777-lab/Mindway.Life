import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

const dev = true
const port = 3000
const app = next({ dev, webpack: true })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    // Strip headers that crash Next.js 16 when behind Caddy proxy
    delete req.headers['x-real-ip']
    delete req.headers['x-forwarded-host']
    
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, () => {
    console.log(`> Custom server on http://localhost:${port}`)
  })
})
