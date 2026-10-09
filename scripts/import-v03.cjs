'use strict';
// Rebuild the published v0.3 prototype source from small, reviewed base64 parts.
// Only the fixed allowlist of source files can be extracted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { brotliDecompressSync } = require('node:zlib');

const root = path.resolve(__dirname, '..');
const source = path.join(root, '.bootstrap');
const parts = fs.readdirSync(source).filter(n => /^v0\.3\.part[0-4]\.b64$/.test(n)).sort();
if (parts.length !== 5) throw Error('Expected five source archive parts. Found: '+parts.length);
const bytes = Buffer.from(parts.map(n => fs.readFileSync(path.join(source, n), 'utf8').trim()).join(''), 'base64');
const expectedHash = 'e20459d9e1d77ddf327326ba82951ad2b55b9974b59e3a6d7805e640ecc8612d';
if (crypto.createHash('sha256').update(bytes).digest('hex') !== expectedHash) throw Error('Source archive checksum mismatch');
const tar = brotliDecompressSync(bytes);
const allow = new Set([
  '.env.example', 'INICIAR-SANTTOS-CITY.bat', 'TESTAR-SANTTOS-CITY.bat',
  'github.js', 'package.json', 'server.js', 'world.js',
  'public/app.js', 'public/index.html', 'public/isometric.js',
  'public/style.css', 'public/favicon.svg',
  'tests/api.test.js', 'tests/github.test.js', 'tests/isometric.test.js',
  'tests/world.test.js',
]);
let position = 0;
const written = new Set();
const field = (buffer, start, length) => buffer.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
while (position + 512 <= tar.length) {
  const header = tar.subarray(position, position + 512);
  if (header.every(byte => byte === 0)) break;
  const name = field(header, 0, 100);
  const sizeString = field(header, 124, 12).trim();
  if (!/^[0-7]+$/.test(sizeString)) throw Error('Malformed tar header');
  const size = parseInt(sizeString, 8);
  const type = field(header, 156, 1);
  if (size < 0 || size > 2000000) throw Error('Invalid tar entry size');
  const offset = position + 512;
  if (offset + size > tar.length) throw Error('Truncated tar');
  if (allow.has(name)) {
    if (written.has(name) || (type && type !== '0')) throw Error('Duplicate or non-file: '+name);
    const dest = path.resolve(root, name);
    if (!dest.startsWith(root + path.sep)) throw Error('Unsafe path');
    fs.mkdirSync(path.dirname(dest), { recursive:true });
    fs.writeFileSync(dest, tar.subarray(offset, offset + size));
    written.add(name);
    process.stdout.write('Restored '+name+'\n');
  }
  position = offset + Math.ceil(size / 512) * 512;
}
if (written.size !== allow.size) throw Error('Incomplete source: '+written.size+'/'+allow.size);
console.log('Imported all '+written.size+' source files.');
