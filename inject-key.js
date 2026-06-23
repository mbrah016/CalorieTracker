const fs = require('fs');
const path = require('path');

const key = process.argv[2];
if (!key) {
  console.error('Usage: node inject-key.js <API_KEY>');
  process.exit(1);
}

const webPath = path.join(__dirname, 'dist/_expo/static/js/web');
if (!fs.existsSync(webPath)) {
  console.error('dist/_expo/static/js/web not found. Run expo export first.');
  process.exit(1);
}

const files = fs.readdirSync(webPath).filter(f => f.endsWith('.js'));
let injected = 0;

files.forEach(file => {
  const filePath = path.join(webPath, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace key=${n} with actual key
  const newContent = content.replace(/key=\$\{n\}/g, `key=${key}`);
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✓ Injected into ${file}`);
    injected++;
  }
});

if (injected > 0) {
  console.log(`\n✓ API key injected into ${injected} file(s)!`);
} else {
  console.log('No key=${n} pattern found');
}
