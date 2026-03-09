import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { notFound } from 'next/navigation'
import { formatDateTime, formatCurrency, OS_STATUS_LABELS, OS_STATUS_COLORS, OS_PRIORITY_LABELS, cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Clock, MapPin, User, Wrench, DollarSign, Calendar, Info } from 'lucide-react'
import OSActions from '@/components/os/OSActions'

export default async function ServiceOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    const { id } = await params
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const { data: os } = await db
        .from('service_orders')
        .select(`
      *,
      customers(name, phone, email, address, city),
      technicians(name, phone, specialties),
      service_types(name),
      service_order_items(*),
      service_order_attachments(*),
      service_order_history(*, users(full_name)),
      payments(*)
    `)
        .eq('id', id)
        .eq('company_id', user?.company_id)
        .single()

    if (!os) notFound()

    const statusClasses = OS_STATUS_COLORS[os.status] || ''

    return (
        <div className="animate-fade-in bg-background min-h-screen transition-colors duration-300">
            <Header title={`OS Nº ${os.order_number}`} />
            <div className="p-6 max-w-6xl mx-auto">
                {/* Back + Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <Link href="/service-orders" className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-muted-foreground/70 transition-colors mb-3">
                            <ArrowLeft className="w-4 h-4" />
                            Voltar para OS
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground">{os.title}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClasses}`}>
                                {OS_STATUS_LABELS[os.status]}
                            </span>
                            <span className="text-sm text-foreground/40">Prioridade: <span className="text-foreground/70">{OS_PRIORITY_LABELS[os.priority]}</span></span>
                            <span className="text-sm text-foreground/40">Criada em: <span className="text-foreground/70">{formatDateTime(os.created_at)}</span></span>
                        </div>
                    </div>
                    <OSActions os={os as any} variant="detail" />
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main info */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Details card */}
                        <div className="rounded-2xl border border-border bg-muted/[0.02] p-5">
                            <h2 className="text-[10px] font-black text-muted-foreground/60 mb-4 uppercase tracking-[0.2em]">Detalhes do Serviço</h2>
                            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl",
                                        os.status === 'concluida' || os.status === 'faturada'
                                            ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                            : "bg-indigo-500 text-white shadow-indigo-500/20"
                                    )}>
                                        {os.status.replace('_', ' ')}
                                    </span>
                                    {os.terms_accepted && (
                                        <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                            <Info className="w-3 h-3" />
                                            Termos Aceitos
                                        </span>
                                    )}
                                </div>
                                {os.description && (
                                    <div className="sm:col-span-2">
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Descrição</span>
                                        <p className="text-foreground/80">{os.description}</p>
                                    </div>
                                )}
                                {os.problem_description && (
                                    <div className="sm:col-span-2">
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Problema Relatado</span>
                                        <p className="text-foreground/80">{os.problem_description}</p>
                                    </div>
                                )}
                                {os.solution_applied && (
                                    <div className="sm:col-span-2">
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Solução Aplicada</span>
                                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">{os.solution_applied}</p>
                                    </div>
                                )}
                                {os.equipment_description && (
                                    <div>
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Equipamento</span>
                                        <p className="text-foreground/80">{os.equipment_description}</p>
                                    </div>
                                )}
                                {os.equipment_serial && (
                                    <div>
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Número de Série</span>
                                        <p className="text-foreground/80 font-mono">{os.equipment_serial}</p>
                                    </div>
                                )}
                                {os.scheduled_date && (
                                    <div>
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Agendada para</span>
                                        <p className="text-foreground/80">{formatDateTime(os.scheduled_date)}</p>
                                    </div>
                                )}
                                {os.warranty_months > 0 && (
                                    <div>
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Garantia</span>
                                        <p className="text-foreground/80">{os.warranty_months} meses</p>
                                    </div>
                                )}
                                {os.internal_notes && (
                                    <div className="sm:col-span-2">
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Notas Internas</span>
                                        <p className="text-amber-600 dark:text-amber-400/80 text-xs bg-amber-500/10 rounded p-2">{os.internal_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items/Materials */}
                        {os.service_order_items && os.service_order_items.length > 0 && (
                            <div className="rounded-2xl border border-border bg-muted/[0.02] p-5">
                                <h2 className="text-[10px] font-black text-muted-foreground/60 mb-4 uppercase tracking-[0.2em]">Peças e Materiais</h2>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-xs text-muted-foreground/40">
                                            <th className="text-left pb-2">Item</th>
                                            <th className="text-right pb-2">Qtd</th>
                                            <th className="text-right pb-2">Preço Unit.</th>
                                            <th className="text-right pb-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {(os.service_order_items as any[]).map((item) => (
                                            <tr key={item.id}>
                                                <td className="py-2 text-foreground/70">{item.item_name}</td>
                                                <td className="py-2 text-right text-muted-foreground/50">{item.quantity}</td>
                                                <td className="py-2 text-right text-muted-foreground/50">{formatCurrency(item.unit_price)}</td>
                                                <td className="py-2 text-right text-foreground">{formatCurrency(item.total_price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-border">
                                            <td colSpan={3} className="pt-2 text-right text-muted-foreground/40 text-xs">Total:</td>
                                            <td className="pt-2 text-right font-bold text-foreground">
                                                {formatCurrency((os.service_order_items as any[]).reduce((s, i) => s + i.total_price, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* History */}
                        {os.service_order_history && os.service_order_history.length > 0 && (
                            <div className="rounded-2xl border border-border bg-muted/[0.02] p-5">
                                <h2 className="text-[10px] font-black text-muted-foreground/60 mb-4 uppercase tracking-[0.2em]">Histórico de Alterações</h2>
                                <div className="space-y-3">
                                    {(os.service_order_history as any[]).reverse().map((h) => (
                                        <div key={h.id} className="flex items-start gap-3 text-xs">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                            <div>
                                                <span className="text-muted-foreground/40">{formatDateTime(h.created_at)}</span>
                                                {' · '}
                                                <span className="text-foreground/60">{h.changed_by_name || 'Sistema'}</span>
                                                {h.field_name && (
                                                    <>
                                                        {' — alterou '}
                                                        <span className="text-foreground/80">{h.field_name}</span>
                                                        {h.old_value && h.new_value && (
                                                            <span className="text-muted-foreground/40"> de <span className="text-destructive">{h.old_value}</span> para <span className="text-emerald-600 dark:text-emerald-400">{h.new_value}</span></span>
                                                        )}
                                                    </>
                                                )}
                                                {h.change_reason && <p className="text-muted-foreground/40 mt-0.5">{h.change_reason}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar info */}
                    <div className="space-y-4">
                        {/* Customer */}
                        {os.customers && (
                            <div className="rounded-2xl border border-border bg-muted/[0.02] p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-4 h-4 text-primary" />
                                    <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Cliente</h3>
                                </div>
                                <p className="text-sm font-medium text-foreground">{(os.customers as any).name}</p>
                                {(os.customers as any).phone && <p className="text-xs text-muted-foreground/50 mt-1">{(os.customers as any).phone}</p>}
                                {(os.customers as any).email && <p className="text-xs text-muted-foreground/50">{(os.customers as any).email}</p>}
                                {(os.customers as any).address && (
                                    <div className="flex items-start gap-1 mt-2">
                                        <MapPin className="w-3 h-3 text-muted-foreground/30 mt-0.5" />
                                        <p className="text-xs text-muted-foreground/40">{(os.customers as any).address}, {(os.customers as any).city}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Technician */}
                        {os.technicians && (
                            <div className="rounded-2xl border border-border bg-muted/[0.02] p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wrench className="w-4 h-4 text-amber-500 dark:text-orange-400" />
                                    <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Técnico</h3>
                                </div>
                                <p className="text-sm font-medium text-foreground">{(os.technicians as any).name}</p>
                                {(os.technicians as any).phone && <p className="text-xs text-muted-foreground/50 mt-1">{(os.technicians as any).phone}</p>}
                            </div>
                        )}

                        {/* Financial */}
                        <div className="rounded-2xl border border-border bg-muted/[0.02] p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-green-400" />
                                <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Financeiro</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                {os.estimated_cost > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground/50">Estimado</span>
                                        <span className="text-foreground/70">{formatCurrency(os.estimated_cost)}</span>
                                    </div>
                                )}
                                {os.parts_cost > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground/50">Peças</span>
                                        <span className="text-foreground">{formatCurrency(os.parts_cost)}</span>
                                    </div>
                                )}
                                {os.labor_cost > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground/50">Mão de obra</span>
                                        <span className="text-foreground">{formatCurrency(os.labor_cost)}</span>
                                    </div>
                                )}
                                {(os.parts_cost > 0 || os.labor_cost > 0) && (
                                    <div className="flex justify-between border-t border-border/50 pt-2 text-[10px] font-black uppercase tracking-widest text-emerald-500/80">
                                        <span>Lucro Estimado</span>
                                        <span>{formatCurrency(os.estimated_cost - (os.parts_cost || 0) - (os.labor_cost || 0))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-border pt-2">
                                    <span className="text-muted-foreground/50">Total Final</span>
                                    <span className="font-bold text-emerald-600 dark:text-green-400">{formatCurrency(os.final_cost || os.estimated_cost)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tracking link */}
                        {os.tracking_token && (
                            <div className="rounded-xl border border-border bg-muted/[0.02] p-4">
                                <h3 className="text-sm font-semibold text-foreground mb-2">Link do Cliente</h3>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/track/${os.tracking_token}`}
                                        className="flex-1 bg-muted/5 border border-border rounded px-2 py-1 text-xs text-muted-foreground/50 truncate"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground/30 mt-2">Compartilhe este link para o cliente acompanhar a OS</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
