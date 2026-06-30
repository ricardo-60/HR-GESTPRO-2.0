import { execSync } from 'child_process';
console.log('Building client...');
execSync('npm run build', { stdio: 'inherit' });
console.log('Client built successfully.');
