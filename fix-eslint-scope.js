const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'node_modules', 'eslint-scope', 'package.json');

if (fs.existsSync(file)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (pkg.exports && !pkg.exports['./lib/*']) {
      pkg.exports['./lib/*'] = './lib/*.js';
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2));
      console.log('Successfully patched eslint-scope package.json exports for Node compatibility.');
    }
  } catch (e) {
    console.error('Could not patch eslint-scope:', e);
  }
}
