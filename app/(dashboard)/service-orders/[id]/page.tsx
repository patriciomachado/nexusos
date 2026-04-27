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
                    <div className="lg:col-span-2 space-y-6">
                        {/* Details card */}
                        <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-6 shadow-sm">
                            <h2 className="text-[10px] font-black text-muted-foreground/60 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Informações Gerais
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-6 text-sm">
                                <div className="sm:col-span-2 flex flex-wrap items-center gap-3 mb-2">
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition-all duration-300",
                                        os.status === 'concluida' || os.status === 'faturada'
                                            ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                            : "bg-indigo-500 text-white shadow-indigo-500/20"
                                    )}>
                                        {OS_STATUS_LABELS[os.status]}
                                    </span>
                                    {os.terms_accepted && (
                                        <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                            <Info className="w-3 h-3" />
                                            Termos Aceitos
                                        </span>
                                    )}
                                </div>
                                
                                {os.problem_description && (
                                    <div className="sm:col-span-2 bg-muted/20 p-4 rounded-xl border border-border/30">
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-2">Problema Relatado</span>
                                        <p className="text-foreground/90 leading-relaxed italic">"{os.problem_description}"</p>
                                    </div>
                                )}

                                {os.description && (
                                    <div className="sm:col-span-2">
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Diagnóstico Técnico / Descrição</span>
                                        <p className="text-foreground/80 leading-relaxed">{os.description}</p>
                                    </div>
                                )}
                                
                                {os.solution_applied && (
                                    <div className="sm:col-span-2 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                        <span className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-[0.2em] block mb-1">Solução Aplicada</span>
                                        <p className="text-emerald-700 dark:text-emerald-300 font-medium">{os.solution_applied}</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {os.equipment_description && (
                                        <div>
                                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Equipamento</span>
                                            <div className="flex items-center gap-2 text-foreground/80">
                                                <Wrench className="w-4 h-4 text-primary/40" />
                                                <p className="font-semibold">{os.equipment_description}</p>
                                            </div>
                                        </div>
                                    )}
                                    {os.equipment_serial && (
                                        <div>
                                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Número de Série</span>
                                            <p className="text-foreground/80 font-mono text-xs bg-muted/30 px-2 py-1 rounded inline-block">{os.equipment_serial}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {os.scheduled_date && (
                                        <div>
                                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Agendada para</span>
                                            <div className="flex items-center gap-2 text-foreground/80">
                                                <Calendar className="w-4 h-4 text-primary/40" />
                                                <p>{formatDateTime(os.scheduled_date)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {os.warranty_months > 0 && (
                                        <div>
                                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Garantia</span>
                                            <p className="text-foreground/80 font-bold">{os.warranty_months} meses</p>
                                        </div>
                                    )}
                                </div>

                                {os.internal_notes && (
                                    <div className="sm:col-span-2">
                                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mb-1">Notas Internas</span>
                                        <p className="text-amber-700 dark:text-amber-400 text-xs bg-amber-500/5 rounded-xl border border-amber-500/10 p-3 italic">
                                            {os.internal_notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Device Photos if exist */}
                        {(os.photo_front_url || os.photo_back_url) && (
                            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-6 shadow-sm">
                                <h2 className="text-[10px] font-black text-muted-foreground/60 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Info className="w-3 h-3" />
                                    Fotos do Dispositivo
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {os.photo_front_url && (
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block text-center">Frontal</span>
                                            <div className="aspect-video rounded-xl overflow-hidden border border-border bg-muted/50">
                                                <img src={os.photo_front_url} alt="Frontal" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in" />
                                            </div>
                                        </div>
                                    )}
                                    {os.photo_back_url && (
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block text-center">Traseira</span>
                                            <div className="aspect-video rounded-xl overflow-hidden border border-border bg-muted/50">
                                                <img src={os.photo_back_url} alt="Traseira" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Items/Materials */}
                        <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-6 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <DollarSign className="w-3 h-3" />
                                    Itens e Serviços
                                </h2>
                                <span className="text-[10px] font-black px-2 py-1 bg-primary/10 text-primary rounded-md uppercase tracking-tighter">
                                    {os.service_order_items?.length || 0} ITENS
                                </span>
                            </div>
                            
                            <div className="overflow-x-auto -mx-6">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border/50 text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">
                                            <th className="text-left px-6 pb-3">Descrição do Item/Serviço</th>
                                            <th className="text-right px-4 pb-3">Qtd</th>
                                            <th className="text-right px-4 pb-3">Unitário</th>
                                            <th className="text-right px-6 pb-3">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {os.service_order_items && os.service_order_items.length > 0 ? (
                                            (os.service_order_items as any[]).map((item) => (
                                                <tr key={item.id} className="hover:bg-muted/5 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-foreground/80 group-hover:text-primary transition-colors">
                                                            {item.item_name}
                                                        </div>
                                                        {item.inventory_item_id && (
                                                            <span className="text-[9px] font-bold text-muted-foreground/40 bg-muted/40 px-1.5 py-0.5 rounded">PEÇA DO ESTOQUE</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-muted-foreground/60 font-mono">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-muted-foreground/60 font-mono">
                                                        {formatCurrency(item.unit_price)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-foreground/90">
                                                        {formatCurrency(item.total_price)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground/40 italic">
                                                    Nenhum item adicionado a esta OS.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {os.service_order_items && os.service_order_items.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-muted/5">
                                                <td colSpan={3} className="px-6 py-4 text-right text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Soma dos Itens:</td>
                                                <td className="px-6 py-4 text-right font-black text-foreground text-lg tracking-tighter">
                                                    {formatCurrency((os.service_order_items as any[]).reduce((s, i) => s + (Number(i.total_price) || 0), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* History */}
                        <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-6 shadow-sm">
                            <h2 className="text-[10px] font-black text-muted-foreground/60 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Jornada da OS
                            </h2>
                            <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/30">
                                {os.service_order_history && os.service_order_history.length > 0 ? (
                                    (os.service_order_history as any[]).reverse().map((h) => (
                                        <div key={h.id} className="relative pl-8 group">
                                            <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-background bg-primary group-hover:scale-110 transition-transform shadow-sm" />
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-primary uppercase">{h.changed_by_name || 'Sistema'}</span>
                                                    <span className="text-[9px] text-muted-foreground/40 font-mono tracking-tighter bg-muted/30 px-1.5 py-0.5 rounded">
                                                        {formatDateTime(h.created_at)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-foreground/70 leading-relaxed">
                                                    {h.field_name && (
                                                        <>
                                                            Alterou <span className="font-bold text-foreground/90">{h.field_name}</span>
                                                            {h.old_value && h.new_value && (
                                                                <span className="text-muted-foreground/60"> de <span className="text-destructive/70 line-through decoration-1">{h.old_value}</span> para <span className="text-emerald-600 dark:text-emerald-400 font-bold">{h.new_value}</span></span>
                                                            )}
                                                        </>
                                                    )}
                                                    {h.change_reason && (
                                                        <div className="mt-1 bg-muted/10 p-2 rounded-lg border border-border/20 italic">
                                                            {h.change_reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground/40 italic ml-8">Nenhum histórico registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar info */}
                    <div className="space-y-6">
                        {/* Customer */}
                        {os.customers && (
                            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-5 shadow-sm hover:border-primary/30 transition-colors">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Proprietário</h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{(os.customers as any).name}</p>
                                        {(os.customers as any).phone && (
                                            <a href={`tel:${(os.customers as any).phone}`} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 mt-1">
                                                <Info className="w-3 h-3" />
                                                {(os.customers as any).phone}
                                            </a>
                                        )}
                                    </div>
                                    {(os.customers as any).email && (
                                        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
                                            <Info className="w-3 h-3" />
                                            {(os.customers as any).email}
                                        </p>
                                    )}
                                    {(os.customers as any).address && (
                                        <div className="pt-3 border-t border-border/30 flex items-start gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-primary/40 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-muted-foreground/50 leading-tight">{(os.customers as any).address}, {(os.customers as any).city}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Technician */}
                        {os.technicians && (
                            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-5 shadow-sm hover:border-amber-500/30 transition-colors">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                        <Wrench className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Especialista</h3>
                                </div>
                                <p className="text-sm font-bold text-foreground">{(os.technicians as any).name}</p>
                                {(os.technicians as any).phone && <p className="text-xs text-muted-foreground/50 mt-1">{(os.technicians as any).phone}</p>}
                                {(os.technicians as any).specialties && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {(os.technicians as any).specialties.slice(0, 3).map((s: string) => (
                                            <span key={s} className="text-[8px] font-black bg-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Financial Card - Enhanced */}
                        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 backdrop-blur-2xl p-6 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-500" />
                            
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Resumo Financeiro</h3>
                            </div>

                            <div className="space-y-4 text-sm relative z-10">
                                {os.estimated_cost > 0 && (
                                    <div className="flex justify-between items-center group/item">
                                        <span className="text-muted-foreground/60 text-xs uppercase tracking-tighter font-bold">Orçamento Inicial</span>
                                        <span className="text-foreground/70 font-mono font-medium">{formatCurrency(os.estimated_cost)}</span>
                                    </div>
                                )}
                                
                                {(() => {
                                    const itemsTotal = os.service_order_items?.reduce((acc: number, item: any) => acc + (Number(item.total_price) || 0), 0) || 0;
                                    const subtotal = itemsTotal || os.estimated_cost;
                                    const discount = Number(os.discount_amount) || 0;
                                    const finalValue = (os.final_cost || subtotal) - (os.final_cost ? 0 : discount);
                                    
                                    return (
                                        <>
                                            <div className="flex justify-between items-center group/item">
                                                <span className="text-muted-foreground/60 text-xs uppercase tracking-tighter font-bold">Subtotal</span>
                                                <span className="text-foreground/70 font-mono font-medium">{formatCurrency(subtotal)}</span>
                                            </div>

                                            {discount > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-rose-500/60 text-xs uppercase tracking-tighter font-bold">Desconto Concedido</span>
                                                    <span className="text-rose-500 font-mono font-bold">- {formatCurrency(discount)}</span>
                                                </div>
                                            )}

                                            <div className="pt-4 mt-2 border-t border-primary/10">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1 text-center">Valor Total a Pagar</span>
                                                    <div className="text-3xl font-black text-primary text-center tracking-tighter tabular-nums drop-shadow-sm">
                                                        {formatCurrency(finalValue)}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                                
                                {os.status === 'faturada' && (
                                    <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Info className="w-3 h-3" />
                                            OS Finalizada e Paga
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tracking link */}
                        {os.tracking_token && (
                            <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 group shadow-sm">
                                <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-3">Link de Rastreio</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-background/50 border border-border/50 rounded-xl px-3 py-2 text-[10px] font-mono text-muted-foreground/70 truncate select-all">
                                        {`${typeof window !== 'undefined' ? window.location.origin : ''}/track/${os.tracking_token}`}
                                    </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground/40 mt-3 text-center leading-tight">
                                    O cliente pode usar este link para ver o status da OS sem precisar de login.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
