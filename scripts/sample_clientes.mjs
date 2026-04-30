import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function testPDF(filename) {
    console.log(`Testing ${filename}...`);
    try {
        const dataBuffer = fs.readFileSync(filename);
        const options = { max: 1 }; // Only first page
        const data = await pdf(dataBuffer, options);
        console.log(`--- Content of ${filename} ---`);
        console.log(data.text);
        console.log('--- End of Content ---');
    } catch (error) {
        console.error(`Error reading ${filename}:`, error.message);
    }
}

await testPDF('C:\\Users\\Support\\Downloads\\CLIENTES.PDF');
