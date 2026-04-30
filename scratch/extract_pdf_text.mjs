import fs from 'fs'
import pdf from 'pdf-parse'

const CLIENTES_PDF = 'C:/Users/Support/Downloads/CLIENTES.pdf'
const ORDENS_PDF = 'C:/Users/Support/Downloads/ORDEMS.PDF'
const COMPANY_ID = '9f535935-89a1-469c-9bbb-4a13ddada5f7'

async function extractData() {
    console.log('Extracting Clientes...')
    const cData = fs.readFileSync(CLIENTES_PDF)
    const cResult = await pdf(cData)
    
    // Split by lines and try to find records
    const cLines = cResult.text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    console.log(`Extracted ${cLines.length} lines from Clientes PDF`)
    fs.writeFileSync('scratch/clientes_text.txt', cResult.text)

    console.log('Extracting Ordens...')
    const oData = fs.readFileSync(ORDENS_PDF)
    const oResult = await pdf(oData)
    const oLines = oResult.text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    console.log(`Extracted ${oLines.length} lines from Ordens PDF`)
    fs.writeFileSync('scratch/ordens_text.txt', oResult.text)
}

extractData().catch(console.error)
