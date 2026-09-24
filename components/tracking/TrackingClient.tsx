'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Zap, Info, Smartphone, CheckCircle2, Clock, MapPin, SearchCode, Wrench, AlertTriangle, MessageSquare, Star, MessageCircle, User, ClipboardList, Camera, Trash } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import Image from 'next/image'
import CustomerRatingForm from './CustomerRatingForm'
import { toast } from 'sonner'
import TrackingGallery from './TrackingGallery'

const maskPhone = (phone: string) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 4) return phone
    // If the phone has spaces or formatting, preserve it partially but mask the middle
    if (phone.includes(' ') || phone.includes('-')) {
        return phone.slice(0, 6) + '***-*' + phone.slice(-3)
    }
    return phone.slice(0, 5) + '*****' + phone.slice(-4)
}

interface Props {
    os: any
    company: any
    token: string
    hasRated: boolean
    ratingData: any
    isFinished: boolean
    statusCfg: any
}

export default function TrackingClient({ os, company, token, hasRated, ratingData, isFinished, statusCfg }: Props) {
    const [accepted, setAccepted] = useState(os.terms_accepted)
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [privacyAccepted, setPrivacyAccepted] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [isCanvasEmpty, setIsCanvasEmpty] = useState(true)
    const router = useRouter()

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingRef = useRef(false)

    async function handleAccept(signatureBase64: string | null) {
        setIsPending(true)
        try {
            const res = await fetch(`/api/tracking/${token}/accept-terms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ signature: signatureBase64 })
            })
            if (res.ok) {
                setAccepted(true)
                toast.success('Termos aceitos e OS assinada com sucesso!')
                router.refresh()
            } else {
                toast.error('Erro ao aceitar termos. Tente novamente.')
            }
        } catch (error) {
            toast.error('Erro de conexão.')
        } finally {
            setIsPending(false)
        }
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setIsCanvasEmpty(true)
    }

    useEffect(() => {
        if (accepted) return

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * (window.devicePixelRatio || 1)
            canvas.height = 180 * (window.devicePixelRatio || 1)
            
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
            ctx.strokeStyle = '#1e1b4b' // Indigo 950
            ctx.lineWidth = 3
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            setIsCanvasEmpty(true)
        }

        resize()
        window.addEventListener('resize', resize)

        function getPos(e: MouseEvent | TouchEvent) {
            const rect = canvas!.getBoundingClientRect()
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            }
        }

        function startDrawing(e: MouseEvent | TouchEvent) {
            isDrawingRef.current = true
            const pos = getPos(e)
            ctx!.beginPath()
            ctx!.moveTo(pos.x, pos.y)
            setIsCanvasEmpty(false)
            if (e.cancelable) e.preventDefault()
        }

        function draw(e: MouseEvent | TouchEvent) {
            if (!isDrawingRef.current) return
            const pos = getPos(e)
            ctx!.lineTo(pos.x, pos.y)
            ctx!.stroke()
            if (e.cancelable) e.preventDefault()
        }

        function stopDrawing() {
            isDrawingRef.current = false
        }

        canvas.addEventListener('mousedown', startDrawing)
        canvas.addEventListener('mousemove', draw)
        canvas.addEventListener('mouseup', stopDrawing)
        canvas.addEventListener('mouseleave', stopDrawing)

        canvas.addEventListener('touchstart', startDrawing, { passive: false })
        canvas.addEventListener('touchmove', draw, { passive: false })
        canvas.addEventListener('touchend', stopDrawing)

        return () => {
            window.removeEventListener('resize', resize)
            if (canvas) {
                canvas.removeEventListener('mousedown', startDrawing)
                canvas.removeEventListener('mousemove', draw)
                canvas.removeEventListener('mouseup', stopDrawing)
                canvas.removeEventListener('mouseleave', stopDrawing)
                canvas.removeEventListener('touchstart', startDrawing)
                canvas.removeEventListener('touchmove', draw)
                canvas.removeEventListener('touchend', stopDrawing)
            }
        }
    }, [accepted])

    const handleSubmit = async () => {
        if (isCanvasEmpty) {
            toast.error('Por favor, desenhe sua assinatura no campo indicado.')
            return
        }

        const canvas = canvasRef.current
        if (!canvas) return
        
        const signatureBase64 = canvas.toDataURL('image/png')
        await handleAccept(signatureBase64)
    }

    if (!accepted) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0a0f] flex items-center justify-center p-4">
                <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto text-indigo-500 mb-6">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Termos de Garantia</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Para visualizar o acompanhamento da sua Ordem de Serviço, por favor leia, assine e aceite os termos abaixo.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-indigo-500/5">
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-3xl border border-slate-200/50 dark:border-white/5 max-h-[30vh] overflow-y-auto custom-scrollbar mb-6 text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                                {company?.warranty_terms || 'Termos não configurados.'}
                            </div>
                        </div>

                        {/* Signature Pad */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between">
                                <label className="text-[13px] font-bold text-slate-500">Assinatura do Cliente</label>
                                <button
                                    type="button"
                                    onClick={clearCanvas}
                                    className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors"
                                >
                                    <Trash className="w-3.5 h-3.5" /> Limpar
                                </button>
                            </div>
                            <div className="relative border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-black/20 overflow-hidden">
                                <canvas ref={canvasRef} className="w-full h-[180px] cursor-crosshair touch-none block bg-transparent" />
                                <div className="absolute left-6 right-6 bottom-10 border-b border-dashed border-slate-300 dark:border-white/10 pointer-events-none" />
                                <span className="absolute bottom-3 left-6 text-[11px] text-slate-400 font-bold uppercase tracking-wider pointer-events-none select-none">Assine aqui</span>
                            </div>
                        </div>

                        {/* Checkboxes for Terms & Privacy */}
                        <div className="space-y-3 mb-6 p-4 bg-slate-50 dark:bg-black/10 rounded-2xl border border-slate-100 dark:border-white/5">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    id="checkbox-terms"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/10 dark:bg-black/25 shrink-0"
                                />
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Li e aceito os <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 font-bold underline transition-colors">Termos de Uso</a> do Nexus OS.
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    id="checkbox-privacy"
                                    checked={privacyAccepted}
                                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/10 dark:bg-black/25 shrink-0"
                                />
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Li e aceito a <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 font-bold underline transition-colors">Política de Privacidade</a> do Nexus OS.
                                </span>
                            </label>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isPending || !termsAccepted || !privacyAccepted}
                            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 group"
                        >
                            {isPending ? (
                                <span className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 animate-spin" /> PROCESSANDO...
                                </span>
                            ) : (
                                <>
                                    ACEITAR E ASSINAR OS <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {company?.name || 'Nexus OS'} &bull; Protocolo #{os.order_number}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Minimalist Header */}
            <header className="h-16 md:h-20 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {company?.logo_url ? (
                        <Image src={company.logo_url} alt={company.name} width={40} height={40} className="rounded-lg object-contain" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {company?.name?.charAt(0) || 'N'}
                        </div>
                    )}
                    <div>
                        <h1 className="font-bold text-sm md:text-base tracking-tight">{company?.name || 'Nexus OS'}</h1>
                        <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">Acompanhamento de OS</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Número da OS</p>
                    <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{os.order_number}</p>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-6 md:space-y-8 animate-in fade-in duration-1000">
                {/* Status Hero Card */}
                <div className={`rounded-3xl p-6 md:p-10 border ${statusCfg.border} ${statusCfg.bg} flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none" />

                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shrink-0 bg-white dark:bg-black/50 shadow-xl border ${statusCfg.border}`}>
                        {statusCfg.icon && <div className="scale-150">{statusCfg.icon}</div>}
                    </div>

                    <div className="flex-1 z-10">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Status Atual</p>
                        <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${statusCfg.text} mb-2`}>{statusCfg.label}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-md">
                            Atualizado em: {formatDateTime(os.updated_at)}
                        </p>
                    </div>
                </div>

                {/* Rating Section (Visible if completed) */}
                {isFinished && (
                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] shadow-lg p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-[0.02] pointer-events-none">
                            <Star className="w-64 h-64" />
                        </div>

                        <div className="relative z-10 max-w-xl mx-auto text-center space-y-6">
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">Como foi o nosso serviço?</h3>
                                <p className="text-sm text-slate-500">Sua avaliação é muito importante para continuarmos melhorando nosso atendimento.</p>
                            </div>

                            {hasRated ? (
                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-6 border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-center gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-8 h-8 ${star <= ratingData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-700'}`}
                                            />
                                        ))}
                                    </div>
                                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" /> Avaliação Recebida!
                                    </h4>
                                    {ratingData.comment && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{ratingData.comment}"</p>
                                    )}
                                </div>
                            ) : (
                                <CustomerRatingForm token={token} />
                            )}
                        </div>
                    </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Photo Gallery */}
                    <TrackingGallery 
                        devicesPhotos={{
                            photo_front_url: os.photo_front_url,
                            photo_back_url: os.photo_back_url
                        }}
                        attachments={os.service_order_attachments}
                    />

                    {/* Customer Details */}
                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold tracking-tight">Dados do Cliente</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Nome</p>
                                <p className="font-medium">{os.customers?.name}</p>
                            </div>
                            {os.customers?.phone && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Telefone</p>
                                    <p className="font-medium">{maskPhone(os.customers.phone)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Device Details */}
                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold tracking-tight">Detalhes do Aparelho</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Aparelho/Modelo</p>
                                <p className="font-medium">{os.title}</p>
                            </div>
                            {os.equipment_description && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Descrição Adicional</p>
                                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">{os.equipment_description}</p>
                                </div>
                            )}
                            {os.equipment_serial && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Num. de Série (IMEI)</p>
                                    <p className="font-mono text-sm bg-slate-100 dark:bg-white/5 px-2 py-1 rounded inline-block">{os.equipment_serial}</p>
                                </div>
                            )}
                            {os.checklist_progress && os.checklist_progress.length > 0 && (
                                <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Checklist de Entrada</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                        {os.checklist_progress.map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                                                <span className={item.completed ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-400 line-through decoration-1'}>{item.text}</span>
                                                {item.completed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border border-slate-200 dark:border-white/10 shrink-0" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Problem Details */}
                    <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <SearchCode className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold tracking-tight">Relato do Problema</h3>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                            {os.problem_description || 'Nenhum problema relatado.'}
                        </p>
                    </div>

                    {/* Solution (If finished) */}
                    {(isFinished && os.solution_applied) && (
                        <div className="md:col-span-2 rounded-3xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold tracking-tight text-emerald-900 dark:text-emerald-400">Solução Aplicada</h3>
                            </div>
                            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed font-medium">
                                {os.solution_applied}
                            </p>
                        </div>
                    )}

                    {/* Items Breakdown */}
                    {os.service_order_items && os.service_order_items.length > 0 && (
                        <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold tracking-tight">Serviços e Peças</h3>
                            </div>

                            <div className="space-y-3">
                                {os.service_order_items.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
                                        <div>
                                            <p className="text-sm font-bold">{item.item_name}</p>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">
                                                {item.quantity}x {formatCurrency(item.unit_price)}
                                            </p>
                                        </div>
                                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                                            {formatCurrency(item.total_price)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Financial Summary */}
                    <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="w-full md:w-auto">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Resumo Financeiro</p>
                            
                            {(() => {
                                const itemsTotal = os.service_order_items?.reduce((acc: number, item: any) => acc + (Number(item.total_price) || 0), 0) || 0;
                                const discount = Number(os.discount_amount) || 0;
                                const finalValue = os.final_cost || itemsTotal || os.estimated_cost;
                                const subtotal = finalValue + discount;
                                const isEstimated = !os.final_cost && itemsTotal === 0;

                                return (
                                    <div className="space-y-1">
                                        {discount > 0 && (
                                            <div className="flex items-center gap-3 text-sm font-medium">
                                                <span className="text-slate-500">Subtotal: {formatCurrency(subtotal)}</span>
                                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[11px] font-black uppercase">
                                                    -{formatCurrency(discount)} DESC.
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-end gap-3">
                                            <span className={`text-3xl md:text-4xl font-black tracking-tighter ${os.final_cost || itemsTotal > 0 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                                                {formatCurrency(finalValue)}
                                            </span>
                                            {isEstimated && (
                                                <span className="text-sm text-slate-400 pb-1 font-medium">(Estimado)</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex gap-6 w-full md:w-auto text-sm">
                            <div>
                                <p className="text-slate-400 mb-1">Entrada</p>
                                <p className="font-bold">{formatDate(os.created_at)}</p>
                            </div>
                            {os.completed_at && (
                                <div>
                                    <p className="text-slate-400 mb-1">Conclusão</p>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatDate(os.completed_at)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warranty Terms Section */}
                    {company?.warranty_terms && (
                        <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-6 md:p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold tracking-tight">Termos de Garantia e Condições</h3>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black uppercase tracking-widest border border-emerald-500/10">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {os.signature_url ? 'Aceito e Assinado' : 'Aceito pelo Cliente'}
                                </div>
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400/80 leading-relaxed font-medium bg-slate-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200/50 dark:border-white/5 whitespace-pre-line">
                                {company.warranty_terms}
                            </div>
                            
                            {os.signature_url && (
                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col items-center">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">Assinatura Digital do Cliente</p>
                                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 max-w-[280px] w-full flex items-center justify-center">
                                        <img src={os.signature_url} alt="Assinatura Digital" className="max-h-20 object-contain dark:invert" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Contact Footer */}
                <div className="text-center pt-8 border-t border-slate-200 dark:border-white/10">
                    <p className="text-sm text-slate-500 mb-4">Dúvidas sobre sua ordem de serviço?</p>
                    <div className="flex items-center justify-center gap-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {company?.phone && (
                            <a href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-indigo-500 transition-colors">
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                            </a>
                        )}
                        {company?.email && (
                            <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-indigo-500 transition-colors">
                                <MessageSquare className="w-4 h-4" /> E-mail
                            </a>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
