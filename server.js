import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

// Explicit public asset manifest. New browser modules must be added here.
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'style.css', 'src/app.js', 'src/case-packet.js',
  'src/data.js', 'src/diagnostics.js', 'src/engine.js',
  'src/import-controller.js', 'src/simulator.js', 'src/session.js', 'src/stress.js', 'src/threshold-sweep.js'
]);
const allowed = new Set(PUBLIC_FILES);
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Exported for socketless tests; importing this module never opens a port.
export function createHandler(root = projectRoot) {
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    const reply = (status, message) => {
      res.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8'});
      res.end(req.method === 'HEAD' ? undefined : message);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return reply(405, 'Method not allowed');
    }
    let name;
    try {
      // Do not normalize traversal segments into an allowed resource.
      const raw = req.url.split('?')[0];
      const pathname = decodeURIComponent(raw);
      if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') ||
          pathname.split('/').some(part => part === '.' || part === '..')) {
        return reply(404, 'Not found');
      }
      name = pathname === '/' ? 'index.html' : pathname.slice(1);
    } catch { return reply(400, 'Bad request'); }
    if (!allowed.has(name)) return reply(404, 'Not found');
    try {
      const realRoot = await fs.realpath(root);
      const file = await fs.realpath(path.join(realRoot, name));
      const relative = path.relative(realRoot, file);
      // Also forbid in-root aliases to private files, not just escaping links.
      if (relative.split(path.sep).join('/') !== name) return reply(404, 'Not found');
      if (!(await fs.stat(file)).isFile()) return reply(404, 'Not found');
      const body = await fs.readFile(file);
      const type = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8'}[path.extname(name)];
      res.writeHead(200, {'Content-Type': type, 'Content-Length': body.length});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { reply(404, 'Not found'); }
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');
  const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Invalid port: use an integer from 1 to 65535');
    process.exitCode = 1;
  } else {
    http.createServer(createHandler()).listen(port, '127.0.0.1', () =>
      console.log(`BankGuard: http://localhost:${port}`));
  }
}
