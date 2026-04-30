import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function testPDF(filename) {
    console.log(`Testing ${filename}...`);
    try {
        const dataBuffer = fs.readFileSync(filename);
        // We only want the first few pages to avoid memory issues with 100MB files
        const options = {
            max: 5 // Limit to first 5 pages
        };
        const data = await pdf(dataBuffer, options);
        console.log(`--- Content of ${filename} ---`);
        console.log(data.text.substring(0, 5000)); // Print first 5000 chars
        console.log('--- End of Content ---');
    } catch (error) {
        console.error(`Error reading ${filename}:`, error.message);
    }
}

const clientesPath = 'C:\\Users\\Support\\Downloads\\CLIENTES.PDF';
const ordensPath = 'C:\\Users\\Support\\Downloads\\ORDEMS.PDF';

await testPDF(clientesPath);
await testPDF(ordensPath);
