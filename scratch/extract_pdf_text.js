const fs = require('fs');
const pdf = require('pdf-parse');

const CLIENTES_PDF = 'C:/Users/Support/Downloads/CLIENTES.pdf';
const ORDENS_PDF = 'C:/Users/Support/Downloads/ORDEMS.PDF';

async function extractData() {
    console.log('Extracting Clientes...');
    const cData = fs.readFileSync(CLIENTES_PDF);
    const cResult = await pdf(cData);
    
    console.log(`Extracted text from Clientes PDF (${cResult.text.length} chars)`);
    fs.writeFileSync('scratch/clientes_text.txt', cResult.text);

    console.log('Extracting Ordens...');
    const oData = fs.readFileSync(ORDENS_PDF);
    const oResult = await pdf(oData);
    console.log(`Extracted text from Ordens PDF (${oResult.text.length} chars)`);
    fs.writeFileSync('scratch/ordens_text.txt', oResult.text);
}

extractData().catch(console.error);
