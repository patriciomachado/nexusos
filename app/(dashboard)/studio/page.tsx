'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
    Sparkles, Calendar, Video, FileText, Copy, Check, Trash2, 
    Play, Plus, Share2, MessageSquare, MapPin, Image as ImageIcon,
    Zap, RefreshCw, Layers, ArrowRight, Wand2, ShieldAlert, Award,
    Filter, ChevronRight, HelpCircle
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { BRAZILIAN_SEASONAL_EVENTS, WEEKLY_CONTENT_IDEAS } from '@/lib/studio-events'
import { StudioScript, SeasonalEvent } from '@/types/studio'
import TeleprompterModal from '@/components/studio/TeleprompterModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function StudioContent() {
    const searchParams = useSearchParams()
    const osIdParam = searchParams.get('os_id')

    // Default to 'generate' as primary tab, with dedicated 'calendar' tab
    const [activeTab, setActiveTab] = useState<'generate' | 'calendar' | 'library' | 'banners'>('generate')
    const [savedScripts, setSavedScripts] = useState<StudioScript[]>([])
    const [loadingScripts, setLoadingScripts] = useState(false)

    // Calendar Filtering State
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    // Generation Form State
    const [topic, setTopic] = useState('')
    const [category, setCategory] = useState('Geral')
    const [tone, setTone] = useState('viral')
    const [targetFormat, setTargetFormat] = useState('reels')
    const [osId, setOsId] = useState(osIdParam || '')
    const [isGenerating, setIsGenerating] = useState(false)

    // Current Generated Output
    const [currentOutput, setCurrentOutput] = useState<Partial<StudioScript> | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Teleprompter State
    const [teleprompterScript, setTeleprompterScript] = useState<StudioScript | null>(null)
    const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false)

    // Copy Feedback State
    const [copiedField, setCopiedField] = useState<string | null>(null)

    useEffect(() => {
        fetchScripts()
        if (osIdParam) {
            setActiveTab('generate')
            setOsId(osIdParam)
        }
    }, [osIdParam])

    const fetchScripts = async () => {
        setLoadingScripts(true)
        try {
            const res = await fetch('/api/studio/scripts')
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    setSavedScripts(data)
                }
            }
        } catch (error) {
            console.error('Error fetching scripts:', error)
        } finally {
            setLoadingScripts(false)
        }
    }

    const handleGenerate = async (overrideTopic?: string, overrideCategory?: string) => {
        const finalTopic = overrideTopic !== undefined ? overrideTopic : topic
        const finalCategory = overrideCategory !== undefined ? overrideCategory : category

        if (!finalTopic && !osId) {
            toast.error('Digite um tema ou escolha um evento do calendário.')
            return
        }

        setIsGenerating(true)
        try {
            const res = await fetch('/api/studio/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: finalTopic,
                    category: finalCategory,
                    tone,
                    targetFormat,
                    osId: osId || undefined
                })
            })

            if (res.ok) {
                const data = await res.json()
                setCurrentOutput(data)
                setActiveTab('generate')
                toast.success('Roteiro gerado pelo Claude AI!')
            } else {
                toast.error('Erro ao gerar roteiro. Tente novamente.')
            }
        } catch (error) {
            console.error('Error generating:', error)
            toast.error('Erro de conexão com a API do Claude')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSelectSeasonalEvent = (event: SeasonalEvent) => {
        setTopic(event.suggestedTopic)
        setCategory(event.category === 'tech' ? 'Tecnologia' : 'Sazonal')
        setActiveTab('generate')
        handleGenerate(event.suggestedTopic, event.category === 'tech' ? 'Tecnologia' : 'Sazonal')
    }

    const handleSaveScript = async () => {
        if (!currentOutput || !currentOutput.hook_3s) return

        setIsSaving(true)
        try {
            const res = await fetch('/api/studio/scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: currentOutput.title || 'Novo Roteiro',
                    category: currentOutput.category || category,
                    source_type: osId ? 'os' : 'manual',
                    source_id: osId || null,
                    hook_3s: currentOutput.hook_3s,
                    body_script: currentOutput.body_script,
                    cta_text: currentOutput.cta_text,
                    instagram_caption: currentOutput.instagram_caption,
                    whatsapp_text: currentOutput.whatsapp_text,
                    google_post: currentOutput.google_post,
                    banner_prompt: currentOutput.banner_prompt
                })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success('Roteiro salvo na sua Biblioteca!')
                fetchScripts()
            } else {
                toast.error(data.error || 'Erro ao salvar no banco de dados.')
            }
        } catch (error) {
            toast.error('Erro ao conectar ao banco de dados.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteScript = async (id: string) => {
        if (!confirm('Deseja excluir este roteiro salvo?')) return

        try {
            const res = await fetch(`/api/studio/scripts?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Roteiro removido')
                setSavedScripts(prev => prev.filter(s => s.id !== id))
            }
        } catch (error) {
            toast.error('Erro ao excluir')
        }
    }

    const copyToClipboard = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(fieldName)
        toast.success(`Copiado com sucesso!`)
        setTimeout(() => setCopiedField(null), 2000)
    }

    const openTeleprompter = (script: StudioScript | Partial<StudioScript>) => {
        const fullScript: StudioScript = {
            id: script.id || 'temp',
            company_id: '',
            title: script.title || 'Roteiro sem título',
            category: script.category || 'Geral',
            source_type: 'manual',
            hook_3s: script.hook_3s || '',
            body_script: script.body_script || '',
            cta_text: script.cta_text || '',
            instagram_caption: script.instagram_caption || '',
            whatsapp_text: script.whatsapp_text || '',
            google_post: script.google_post || '',
            created_at: new Date().toISOString()
        }
        setTeleprompterScript(fullScript)
        setIsTeleprompterOpen(true)
    }

    // Filtered seasonal events
    const filteredEvents = BRAZILIAN_SEASONAL_EVENTS.filter(event => {
        if (selectedMonth !== 'all' && event.month !== selectedMonth) return false
        if (selectedCategory !== 'all' && event.category !== selectedCategory) return false
        return true
    })

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    return (
        <div className="min-h-screen bg-background text-foreground pb-16">
            <Header title="Nexus Studio" subtitle="Publicidade, Roteiros de Vídeo e Marketing Inteligente com Claude AI" />

            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* Header & Tabs Nav */}
                <div className="bg-card border border-border rounded-3xl p-4 md:p-6 shadow-xl space-y-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                                <Sparkles className="w-6 h-6 animate-pulse text-amber-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight">Nexus Studio AI</h1>
                                <p className="text-xs text-muted-foreground font-medium">Conectado ao Claude 3.5 Sonnet via OpenRouter</p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex flex-wrap gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border w-full md:w-auto">
                            <button
                                onClick={() => setActiveTab('generate')}
                                className={cn(
                                    "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'generate' ? "bg-primary text-black font-black shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Wand2 className="w-4 h-4" />
                                Gerador Claude AI
                            </button>

                            <button
                                onClick={() => setActiveTab('calendar')}
                                className={cn(
                                    "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'calendar' ? "bg-primary text-black font-black shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Calendar className="w-4 h-4" />
                                Calendário Sazonal
                            </button>

                            <button
                                onClick={() => setActiveTab('library')}
                                className={cn(
                                    "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'library' ? "bg-primary text-black font-black shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <FileText className="w-4 h-4" />
                                Biblioteca ({savedScripts.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('banners')}
                                className={cn(
                                    "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'banners' ? "bg-primary text-black font-black shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <ImageIcon className="w-4 h-4" />
                                Banners & Artes
                            </button>
                        </div>
                    </div>
                </div>

                {/* TAB 1: GERADOR CLAUDE AI */}
                {activeTab === 'generate' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
                        {/* Coluna Esquerda: Formulário de Entrada */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-lg">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-black flex items-center gap-2">
                                        <Wand2 className="w-5 h-5 text-amber-500" />
                                        Criar Conteúdo com Claude AI
                                    </h2>
                                    <p className="text-xs text-muted-foreground">Digite o tema desejado ou selecione uma Ordem de Serviço da bancada.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* OS Selector ID Badge */}
                                    {osId && (
                                        <div className="p-3 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                <span className="font-bold">Carregado da OS nº: {osId.slice(0, 8)}</span>
                                            </div>
                                            <button onClick={() => setOsId('')} className="text-muted-foreground hover:text-rose-500 font-bold">Limpar</button>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Tema ou Assunto do Conteúdo</label>
                                        <textarea
                                            value={topic}
                                            onChange={e => setTopic(e.target.value)}
                                            placeholder="Ex: Troca de vidro de iPhone 13, Limpeza de Notebook esquentando, ou Alerta de celular molhado na praia..."
                                            rows={3}
                                            className="w-full bg-background border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Categoria</label>
                                            <select
                                                value={category}
                                                onChange={e => setCategory(e.target.value)}
                                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                                            >
                                                <option value="Geral">Geral</option>
                                                <option value="Tela e Vidro">Tela e Vidro</option>
                                                <option value="Bateria">Bateria</option>
                                                <option value="Reparo de Placa">Reparo de Placa</option>
                                                <option value="Notebooks e PCs">Notebooks e PCs</option>
                                                <option value="Sazonal">Sazonal / Promoção</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Tom de Voz</label>
                                            <select
                                                value={tone}
                                                onChange={e => setTone(e.target.value)}
                                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                                            >
                                                <option value="viral">Viral & Curioso</option>
                                                <option value="educativo">Educativo & Técnico</option>
                                                <option value="promocional">Promocional & Oferta</option>
                                                <option value="bastidores">Bastidores da Bancada</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleGenerate()}
                                        disabled={isGenerating}
                                        className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                Consultando Claude 3.5 Sonnet...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Gerar Roteiro com Claude AI
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Coluna Direita: Resultado Gerado */}
                        <div className="lg:col-span-7 space-y-6">
                            {currentOutput ? (
                                <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6 shadow-xl animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center justify-between border-b border-border pb-4">
                                        <div>
                                            <h3 className="text-lg font-black text-foreground">{currentOutput.title}</h3>
                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">✨ Gerado por Claude AI via OpenRouter</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openTeleprompter(currentOutput)}
                                                className="px-4 py-2 bg-amber-500 text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-md"
                                            >
                                                <Play className="w-4 h-4 fill-current" />
                                                Abrir Teleprompter
                                            </button>

                                            <button
                                                onClick={handleSaveScript}
                                                disabled={isSaving}
                                                className="px-4 py-2 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Salvar Roteiro
                                            </button>
                                        </div>
                                    </div>

                                    {/* 1. Gancho 3s */}
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
                                        <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">⚡ Gancho Viral (Primeiros 3 segundos)</span>
                                        <p className="text-base font-bold text-amber-200">"{currentOutput.hook_3s}"</p>
                                    </div>

                                    {/* 2. Roteiro de Bancada */}
                                    <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-2">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">🛠️ Roteiro da Bancada</span>
                                        <p className="text-sm font-medium whitespace-pre-line leading-relaxed">{currentOutput.body_script}</p>
                                    </div>

                                    {/* 3. CTA */}
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-1">
                                        <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">📣 Chamada para Ação (CTA)</span>
                                        <p className="text-sm font-bold text-emerald-200">"{currentOutput.cta_text}"</p>
                                    </div>

                                    {/* 4. Mídias de Exportação */}
                                    <div className="space-y-4 pt-4 border-t border-border">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pronto para Copiar & Postar:</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Instagram */}
                                            <div className="p-3 bg-muted/20 border border-border rounded-2xl space-y-2 flex flex-col justify-between">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-purple-400">Instagram / TikTok</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(currentOutput.instagram_caption || '', 'ig')} 
                                                        className="text-xs text-muted-foreground hover:text-primary font-bold"
                                                    >
                                                        {copiedField === 'ig' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground line-clamp-3 font-mono">{currentOutput.instagram_caption}</p>
                                            </div>

                                            {/* WhatsApp */}
                                            <div className="p-3 bg-muted/20 border border-border rounded-2xl space-y-2 flex flex-col justify-between">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-emerald-400">Status do WhatsApp</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(currentOutput.whatsapp_text || '', 'wa')} 
                                                        className="text-xs text-muted-foreground hover:text-primary font-bold"
                                                    >
                                                        {copiedField === 'wa' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground line-clamp-3 font-mono">{currentOutput.whatsapp_text}</p>
                                            </div>

                                            {/* Google Meu Negócio */}
                                            <div className="p-3 bg-muted/20 border border-border rounded-2xl space-y-2 flex flex-col justify-between">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-blue-400">Google Meu Negócio</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(currentOutput.google_post || '', 'gmb')} 
                                                        className="text-xs text-muted-foreground hover:text-primary font-bold"
                                                    >
                                                        {copiedField === 'gmb' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground line-clamp-3 font-mono">{currentOutput.google_post}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center bg-card border border-dashed border-border rounded-3xl p-8 space-y-3">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto">
                                        <Wand2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-base">Pronto para Criar Roteiros com Claude AI</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        Digite o tema ao lado ou navegue na aba <strong>Calendário Sazonal</strong> para selecionar uma data comemorativa.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: CALENDÁRIO SAZONAL (SEPARADO E DEDICADO) */}
                {activeTab === 'calendar' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Header & Filtros do Calendário */}
                        <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-xl">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                        <Calendar className="w-6 h-6 text-primary" />
                                        Calendário Sazonal do Setor Técnico
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Eventos comerciais, datas comemorativas e gatilhos sazonais do mercado de assistência técnica.
                                    </p>
                                </div>

                                {/* Filters */}
                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    {/* Mês Selector */}
                                    <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl text-xs">
                                        <Filter className="w-4 h-4 text-muted-foreground" />
                                        <select
                                            value={selectedMonth}
                                            onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                            className="bg-transparent font-bold outline-none cursor-pointer"
                                        >
                                            <option value="all">Todos os Meses</option>
                                            {monthNames.map((name, idx) => (
                                                <option key={idx + 1} value={idx + 1}>{name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Categoria Selector */}
                                    <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl text-xs">
                                        <select
                                            value={selectedCategory}
                                            onChange={e => setSelectedCategory(e.target.value)}
                                            className="bg-transparent font-bold outline-none cursor-pointer"
                                        >
                                            <option value="all">Todas as Categorias</option>
                                            <option value="tech">Técnico & Bastidores</option>
                                            <option value="comercial">Comercial & Promoções</option>
                                            <option value="estacao">Estações do Ano</option>
                                            <option value="nacional">Nacional / Conscientização</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sugestões da Semana */}
                        <div className="bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent border border-primary/20 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                                <Zap className="w-4 h-4" />
                                Ideias da Semana em Destaque
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {WEEKLY_CONTENT_IDEAS.map((idea, idx) => (
                                    <div key={idx} className="bg-card/80 border border-border rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                                                {idea.type}
                                            </span>
                                            <h3 className="font-bold text-sm mt-2 text-foreground">{idea.title}</h3>
                                            <p className="text-xs text-muted-foreground mt-1">{idea.desc}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setTopic(idea.title)
                                                setActiveTab('generate')
                                                handleGenerate(idea.title)
                                            }}
                                            className="w-full py-2 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mt-2"
                                        >
                                            <Wand2 className="w-3.5 h-3.5" />
                                            Criar com Claude AI
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Eventos Sazonais Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredEvents.length === 0 ? (
                                <div className="col-span-full py-16 text-center bg-card border border-dashed border-border rounded-3xl">
                                    <p className="text-xs text-muted-foreground">Nenhum evento encontrado para o mês ou categoria selecionada.</p>
                                </div>
                            ) : (
                                filteredEvents.map(event => (
                                    <div key={event.id} className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between group hover:border-primary/50 transition-all shadow-md">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                                    {monthNames[event.month - 1]} • Dia {event.day}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                    {event.badge}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-base group-hover:text-primary transition-colors">{event.title}</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                                        </div>

                                        <div className="pt-3 border-t border-border/50">
                                            <button
                                                onClick={() => handleSelectSeasonalEvent(event)}
                                                className="w-full py-2.5 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Wand2 className="w-4 h-4" />
                                                ✨ Criar Conteúdo com Claude AI
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: BIBLIOTECA DE SCRIPTS */}
                {activeTab === 'library' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <FileText className="w-5 h-5 text-emerald-500" />
                                Roteiros Salvos na Biblioteca ({savedScripts.length})
                            </h2>
                        </div>

                        {loadingScripts ? (
                            <div className="py-12 flex justify-center">
                                <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-30" />
                            </div>
                        ) : savedScripts.length === 0 ? (
                            <div className="py-16 text-center bg-card border border-dashed border-border rounded-3xl p-8 space-y-2">
                                <p className="text-sm font-bold">Sua biblioteca está vazia</p>
                                <p className="text-xs text-muted-foreground">Gere novos roteiros com o Claude AI e clique em "Salvar" para acessá-los aqui a qualquer momento!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedScripts.map(script => (
                                    <div key={script.id} className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between group hover:border-primary/40 transition-all shadow-md">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                                    {script.category}
                                                </span>
                                                <button onClick={() => handleDeleteScript(script.id)} className="text-muted-foreground hover:text-rose-500 p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <h3 className="font-bold text-base">{script.title}</h3>
                                            <p className="text-xs text-amber-400 font-bold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                                                "{script.hook_3s}"
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                                            <button
                                                onClick={() => openTeleprompter(script)}
                                                className="flex-1 py-2 bg-amber-500 text-black rounded-xl text-xs font-bold hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                Teleprompter
                                            </button>

                                            <button
                                                onClick={() => copyToClipboard(script.instagram_caption || '', script.id)}
                                                className="py-2 px-3 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                                title="Copiar Legenda"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: BANNERS & ARTES VISUAIS */}
                {activeTab === 'banners' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                            <div className="space-y-1">
                                <h2 className="text-lg font-black flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-purple-500" />
                                    Gerador & Modelos de Banners Promocionais
                                </h2>
                                <p className="text-xs text-muted-foreground">Prompts e ideias de banners visuais ajustadas para sua assistência técnica.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-5 bg-gradient-to-br from-purple-500/10 via-card to-card border border-purple-500/30 rounded-2xl space-y-3">
                                    <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Banner Promo 1</span>
                                    <h3 className="font-bold text-sm">Troca de Tela com Película Grátis</h3>
                                    <p className="text-xs text-muted-foreground">"Estilo futurista com luzes de neon azul e dourado, destacando precisão e rapidez na troca."</p>
                                    <button onClick={() => copyToClipboard("Banner promocional com texto 'TROCA DE TELA EM ATÉ 1 HORA' em neon azul sobre bancada de eletrônicos", 'b1')} className="w-full py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                                        <Copy className="w-3.5 h-3.5" /> Copiar Prompt de Imagem
                                    </button>
                                </div>

                                <div className="p-5 bg-gradient-to-br from-blue-500/10 via-card to-card border border-blue-500/30 rounded-2xl space-y-3">
                                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Banner Promo 2</span>
                                    <h3 className="font-bold text-sm">Revisão de Bateria & Saúde do Aparelho</h3>
                                    <p className="text-xs text-muted-foreground">"Destaque para o ícone de bateria 100% carregada com raio verde brilhante e logotipo da loja."</p>
                                    <button onClick={() => copyToClipboard("Banner publicitário moderno de bateria de celular 100% carregada com raio brilhante e texto de promoção", 'b2')} className="w-full py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                                        <Copy className="w-3.5 h-3.5" /> Copiar Prompt de Imagem
                                    </button>
                                </div>

                                <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-2xl space-y-3">
                                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Banner Promo 3</span>
                                    <h3 className="font-bold text-sm">Manutenção Preventiva de Notebooks</h3>
                                    <p className="text-xs text-muted-foreground">"Fotografia profissional de notebook limpo com pasta térmica de alta performance e ferramentas."</p>
                                    <button onClick={() => copyToClipboard("Banner publicitário de manutenção de notebook gamer, pasta térmica silver e cooler limpo", 'b3')} className="w-full py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                                        <Copy className="w-3.5 h-3.5" /> Copiar Prompt de Imagem
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Teleprompter Modal */}
            <TeleprompterModal
                isOpen={isTeleprompterOpen}
                onClose={() => setIsTeleprompterOpen(false)}
                script={teleprompterScript}
            />
        </div>
    )
}

export default function StudioPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-30" />
            </div>
        }>
            <StudioContent />
        </Suspense>
    )
}
