import fs from 'fs'

function extractPDFText(buffer) {
    const text = buffer.toString('latin1')
    const matches = text.match(/\(([^)]*)\)/g)
    if (!matches) return []
    return matches.map(m => m.slice(1, -1))
}

function parseRecords(fields, headerCount) {
    const headers = fields.slice(0, headerCount)
    const data = fields.slice(headerCount)
    const records = []
    for (let i = 0; i < data.length; i += headerCount) {
        if (i + headerCount > data.length) break
        const rec = {}
        for (let j = 0; j < headerCount; j++) {
            const v = data[i + j]
            if (v && v !== '0' && v !== 'False') {
                rec[headers[j]] = v
            }
        }
        if (Object.keys(rec).length > 1) records.push(rec)
    }
    return records
}

const CLIENTES_PDF = 'C:/Users/Support/Downloads/CLIENTES.pdf'
const ORDENS_PDF = 'C:/Users/Support/Downloads/ORDEMS.PDF'

console.log('--- Preview Clientes ---')
const cBuf = fs.readFileSync(CLIENTES_PDF)
const cFields = extractPDFText(cBuf)
const cHeaderCount = cFields.indexOf('1')
if (cHeaderCount > 0) {
    const cRecords = parseRecords(cFields, cHeaderCount)
    console.log('Sample Clientes:', cRecords.slice(0, 5))
} else {
    console.log('Could not find header in Clientes PDF')
}

console.log('--- Preview Ordens ---')
const oBuf = fs.readFileSync(ORDENS_PDF)
const oFields = extractPDFText(oBuf)
const oHeaderCount = oFields.indexOf('1')
if (oHeaderCount > 0) {
    const oRecords = parseRecords(oFields, oHeaderCount)
    console.log('Sample Ordens:', oRecords.slice(0, 5))
} else {
    console.log('Could not find header in Ordens PDF')
}
