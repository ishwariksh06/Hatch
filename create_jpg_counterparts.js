const fs = require('fs');
const path = require('path');

const foodDir = path.join(__dirname, 'public', 'food');
const files = fs.readdirSync(foodDir);

for (const file of files) {
  if (file.endsWith('.jpeg')) {
    const jpgName = file.replace(/\.jpeg$/, '.jpg');
    const src = path.join(foodDir, file);
    const dest = path.join(foodDir, jpgName);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`Created copy: ${jpgName}`);
    }
  }
}
console.log('Finished creating .jpg counterparts.');
