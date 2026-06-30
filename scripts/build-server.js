import fs from 'fs';
import path from 'path';

console.log('Building server...');
const srcDir = path.join(process.cwd(), 'electron');
const destDir = path.join(process.cwd(), 'dist-server');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(path.join(srcDir, 'server.js'), path.join(destDir, 'server.js'));
if (fs.existsSync(path.join(srcDir, 'main.js'))) {
    fs.copyFileSync(path.join(srcDir, 'main.js'), path.join(destDir, 'main.js'));
}
console.log('Server built successfully.');
