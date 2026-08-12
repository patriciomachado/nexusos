const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('No .env.local file found at:', envPath);
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split(/\r?\n/);

for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
    }

    console.log(`Setting Vercel environment variable for: ${key}`);

    const targets = ['production', 'preview', 'development'];
    for (const target of targets) {
        try {
            const cmd = `npx vercel env add ${key} ${target} --value "${value.replace(/"/g, '\\"')}" --yes --scope um-quipe --force`;
            const output = execSync(cmd).toString();
            console.log(`[${target}] Added successfully`);
        } catch (err) {
            console.error(`Failed to add variable ${key} to ${target}:`, err.message);
        }
    }
}

console.log('All environment variables processed!');
