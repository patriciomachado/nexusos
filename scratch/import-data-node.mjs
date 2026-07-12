import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const companyId = '9f535935-89a1-469c-9bbb-4a13ddada5f7' // Support Store
const CLIENTES_PDF = 'C:/Users/Support/Downloads/CLIENTES.pdf'
const ORDENS_PDF = 'C:/Users/Support/Downloads/ORDEMS.PDF'

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

function fixEncoding(str) {
    if (!str) return ''
    try {
        const bytes = Buffer.from(str, 'latin1')
        return bytes.toString('utf-8')
    } catch { return str }
}

function mapStatus(sit) {
    const s = parseInt(sit) || 0
    if (s === 10) return 'aberta'
    if (s === 20) return 'em_andamento'
    if (s === 30) return 'aguardando_pecas'
    if (s === 40) return 'concluida'
    if (s === 50) return 'concluida'
    if (s === 60) return 'cancelada'
    if (s === 70) return 'faturada'
    return 'concluida'
}

function parseDate(str) {
    if (!str || str === '0') return null
    const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2})?:?(\d{2})?:?(\d{2})?/)
    if (!m) return null
    return `${m[3]}-${m[2]}-${m[1]}T${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}`
}

async function run() {
    console.log('--- Iniciando Processamento ---')
    
    // 1. Clientes
    console.log('Lendo Clientes...')
    const clientesBuffer = fs.readFileSync(CLIENTES_PDF)
    const clientesFields = extractPDFText(clientesBuffer)
    const headerCountClientes = clientesFields.indexOf('1')
    if (headerCountClientes < 1) {
        console.error('Formato de PDF de Clientes não reconhecido')
        return
    }
    const parsedClientes = parseRecords(clientesFields, headerCountClientes)
    console.log(`Encontrados ${parsedClientes.length} clientes.`)

    const clienteCodeMap = {}
    const BATCH = 50

    console.log('Importando Clientes...')
    for (let i = 0; i < parsedClientes.length; i += BATCH) {
        const batch = parsedClientes.slice(i, i + BATCH)
        const rows = batch.map(c => ({
            company_id: companyId,
            name: fixEncoding(c.NOME) || 'Sem nome',
            email: c.EMAIL || null,
            phone: c.CELULAR || c.TELEFONE || null,
            cpf_cnpj: c.CPF_CNPJ || null,
            address: fixEncoding([c.ENDERECO, c.NUMERO, c.COMPLEM].filter(Boolean).join(', ')) || null,
            city: fixEncoding(c.CIDADE) || null,
            state: c.UF || null,
            zip_code: c.CEP || null,
            birth_date: parseDate(c.ANIVERSARIO),
            notes: fixEncoding(c.OBSERVACAO) || null,
            is_active: true,
        }))

        const { data, error } = await supabase.from('customers').insert(rows).select('id')
        if (error) {
            console.error(`Erro no lote ${i/BATCH+1}: ${error.message}`)
        } else {
            batch.forEach((c, j) => {
                if (data[j]) clienteCodeMap[c.CODIGO] = data[j].id
            })
        }
        process.stdout.write('.')
    }
    console.log('\nClientes importados.')

    // 2. Ordens
    console.log('Lendo Ordens...')
    const ordensBuffer = fs.readFileSync(ORDENS_PDF)
    const ordensFields = extractPDFText(ordensBuffer)
    const headerCountOrdens = ordensFields.indexOf('1')
    if (headerCountOrdens < 1) {
        console.error('Formato de PDF de Ordens não reconhecido')
        return
    }
    const parsedOrdens = parseRecords(ordensFields, headerCountOrdens)
    console.log(`Encontradas ${parsedOrdens.length} ordens.`)

    // Get max order number to avoid collision
    const { data: maxOs } = await supabase.from('service_orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1)
    
    let orderNum = 1
    if (maxOs && maxOs[0]) {
        const m = maxOs[0].order_number.match(/(\d+)/)
        if (m) orderNum = parseInt(m[1]) + 1
    }

    console.log('Importando Ordens...')
    for (let i = 0; i < parsedOrdens.length; i += BATCH) {
        const batch = parsedOrdens.slice(i, i + BATCH)
        const rows = batch.map((o, j) => {
            const laborCost = parseFloat(o.V_MAO) || 0
            const partsCost = parseFloat(o.V_PECAS) || 0
            const totalCost = laborCost + partsCost + (parseFloat(o.V_DESLOCA) || 0) + (parseFloat(o.V_TERCEIRO) || 0) + (parseFloat(o.V_OUTROS) || 0)

            return {
                company_id: companyId,
                order_number: `OS-${String(orderNum + i + j).padStart(5, '0')}`,
                customer_id: clienteCodeMap[o.COD_CLIENTE] || null,
                status: mapStatus(o.SITUACAO),
                priority: 'normal',
                title: fixEncoding(o.APARELHO) || 'Importado uMDB',
                description: fixEncoding(o.LAUDO) || null,
                problem_description: fixEncoding(o.DEFEITO) || null,
                equipment_description: fixEncoding([o.APARELHO, o.MARCA, o.MODELO].filter(Boolean).join(' - ')) || null,
                equipment_serial: o.SERIE || null,
                estimated_cost: totalCost,
                final_cost: totalCost,
                labor_cost: laborCost,
                parts_cost: partsCost,
                warranty_months: parseInt(o.GARANTIA) || 0,
                internal_notes: fixEncoding(o.OBS_SERVICO) || null,
                device_condition: fixEncoding(o.OBS_APARELHO) || null,
                created_at: parseDate(o.ENTRADA) || new Date().toISOString(),
                completed_at: parseDate(o.PRONTO),
            }
        })

        const { error } = await supabase.from('service_orders').insert(rows)
        if (error) {
            console.error(`\nErro no lote ${i/BATCH+1} de ordens: ${error.message}`)
        }
        process.stdout.write('.')
    }
    console.log('\n--- Importação Concluída ---')
}

run()
