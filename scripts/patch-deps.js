// Removes "type": "module" from youtube-transcript's package.json so its
// CJS dist file can be loaded with require() from our CJS backend.
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '../node_modules/youtube-transcript/package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (pkg.type === 'module') {
  delete pkg.type;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('patched youtube-transcript: removed "type": "module"');
} else {
  console.log('youtube-transcript: already patched, skipping');
}
