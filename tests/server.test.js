import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHandler, PUBLIC_FILES} from '../server.js';

async function request(url, method = 'GET', root) {
  const result = {headers: {}};
  const res = {
    setHeader(k, v) { result.headers[k] = v; },
    writeHead(status, headers = {}) { result.status = status; Object.assign(result.headers, headers); return this; },
    end(body) { result.body = body; }
  };
  await createHandler(root)({url, method}, res);
  return result;
}
test('public manifest serves every browser asset with nosniff', async () => {
  for (const file of PUBLIC_FILES) {
    const r = await request('/' + file);
    assert.equal(r.status, 200, file);
    assert.equal(r.headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(r.headers['Content-Length'], r.body.length);
  }
});
test('root and cache-busting query serve HTML and JavaScript', async () => {
  assert.match((await request('/')).headers['Content-Type'], /text\/html/);
  assert.match((await request('/src/app.js?v=2')).headers['Content-Type'], /text\/javascript/);
});
test('HEAD matches GET headers without response body, including errors', async () => {
  for (const url of ['/', '/style.css', '/missing']) {
    const get = await request(url), head = await request(url, 'HEAD');
    assert.equal(head.status, get.status);
    assert.deepEqual(head.headers, get.headers);
    assert.equal(head.body, undefined);
  }
});
test('server refuses non-read methods', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const r = await request('/', method);
    assert.equal(r.status, 405);
    assert.equal(r.headers.Allow, 'GET, HEAD');
  }
});
test('source infrastructure, credentials and unlisted files are never public', async () => {
  for (const name of ['.env', '.git/config', 'package.json', 'server.js', 'README.md', 'docs/developer_handoff_ru.md', 'src/secret.js']) {
    assert.equal((await request('/' + name)).status, 404, name);
  }
});
test('traversal, encoded separators, backslashes and absolute targets are refused', async () => {
  for (const url of ['/src/../index.html', '/%2e%2e/index.html', '/src/%2e%2e/index.html', '/src%5capp.js', '/index.html%00', '//index.html', 'http://localhost/index.html']) {
    assert.equal((await request(url)).status, 404, url);
  }
  assert.equal((await request('/%zz')).status, 400);
});
test('missing allowlisted assets fail closed', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bankguard-empty-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  assert.equal((await request('/', 'GET', root)).status, 404);
});
test('symlinked asset directories cannot expose outside or private inside files', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bankguard-links-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const publicRoot = path.join(root, 'public'), outside = path.join(root, 'private');
  await fs.mkdir(publicRoot); await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'app.js'), 'secret');
  // Windows junctions do not need developer mode or symlink privileges.
  await fs.symlink(outside, path.join(publicRoot, 'src'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await request('/src/app.js', 'GET', publicRoot)).status, 404);
  await fs.unlink(path.join(publicRoot, 'src'));
  const inside = path.join(publicRoot, 'private');
  await fs.mkdir(inside); await fs.writeFile(path.join(inside, 'app.js'), 'secret');
  await fs.symlink(inside, path.join(publicRoot, 'src'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await request('/src/app.js', 'GET', publicRoot)).status, 404);
});
test('public manifest includes all current browser JavaScript modules', async () => {
  const modules = (await fs.readdir(new URL('../src/', import.meta.url))).filter(f => f.endsWith('.js')).map(f => 'src/' + f);
  assert.deepEqual(PUBLIC_FILES.filter(f => f.startsWith('src/')).sort(), modules.sort());
});
