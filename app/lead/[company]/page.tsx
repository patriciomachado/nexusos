import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import LeadForm from './LeadForm'

export default async function LeadPage({ params }: { params: Promise<{ company: string }> }) {
    const { company: companyId } = await params
    const db = createAdminClient()

    const { data: company } = await db
        .from('companies')
        .select('id, name, logo_url, phone, city, state')
        .eq('id', companyId)
        .maybeSingle()

    if (!company) notFound()

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100">
            <header className="border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a]">
                <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
                    {company.logo_url ? (
                        <Image src={company.logo_url} alt={company.name} width={40} height={40} className="rounded-lg object-contain" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                            {company.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <span className="text-[17px] font-semibold truncate block">{company.name}</span>
                        {(company.city || company.state) && (
                            <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block">{[company.city, company.state].filter(Boolean).join(' - ')}</span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-5 py-8 space-y-5">
                <div>
                    <p className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Fale com a gente</p>
                    <h1 className="text-[24px] font-bold leading-tight mt-1">Peça um orçamento ou tire uma dúvida</h1>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 mt-1">Deixe seus dados que a {company.name} te responde rapidinho.</p>
                </div>

                <LeadForm companyId={company.id} companyPhone={company.phone} companyName={company.name} />
            </main>
        </div>
    )
}

export const metadata = { title: 'Fale com a loja' }
