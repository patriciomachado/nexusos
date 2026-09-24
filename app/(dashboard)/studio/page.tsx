'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
    Sparkles, Calendar, Video, FileText, Copy, Check, Trash2, 
    Play, Plus, Share2, MessageSquare, MapPin, Image as ImageIcon,
    Zap, RefreshCw, Layers, ArrowRight, Wand2, ShieldAlert, Award,
    Filter, ChevronRight, HelpCircle, Palette, Smartphone, Monitor, Layout
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
    const topicParam = searchParams.get('topic')

    // Default to 'generate' as primary tab
    const [activeTab, setActiveTab] = useState<'generate' | 'calendar' | 'library' | 'banners'>('generate')
    const [savedScripts, setSavedScripts] = useState<StudioScript[]>([])
    const [loadingScripts, setLoadingScripts] = useState(false)

    // Calendar Filtering State
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    // Generation Form State
    const [topic, setTopic] = useState(topicParam || '')
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

    // --- BANNER STUDIO CUSTOMIZATION STATE ---
    const [bannerTitle, setBannerTitle] = useState('TROCA DE TELA EM 45 MIN')
    const [bannerSubtitle, setBannerSubtitle] = useState('Com Película Grátis e 6 Meses de Garantia')
    const [bannerAspect, setBannerAspect] = useState<'1:1' | '9:16' | '16:9'>('1:1')
    const [bannerPrimaryColor, setBannerPrimaryColor] = useState('#3B82F6')
    const [bannerSecondaryColor, setBannerSecondaryColor] = useState('#F59E0B')
    const [bannerStyle, setBannerStyle] = useState('bancada_8k')

    useEffect(() => {
        fetchScripts()
        if (osIdParam) {
            setActiveTab('generate')
            setOsId(osIdParam)
        } else if (topicParam) {
            setActiveTab('generate')
            setTopic(topicParam)
        }
    }, [osIdParam, topicParam])

    const fetchScripts = async () => {
        setLoadingScripts(true)
        let remoteScripts: StudioScript[] = []
        try {
            const res = await fetch('/api/studio/scripts')
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    remoteScripts = data
                }
            }
        } catch (error) {
            console.error('Error fetching scripts:', error)
        }

        try {
            const localRaw = typeof window !== 'undefined' ? localStorage.getItem('nexus_studio_scripts') : null
            const localItems: StudioScript[] = localRaw ? JSON.parse(localRaw) : []
            const remoteIds = new Set(remoteScripts.map(s => s.id))
            const uniqueLocal = localItems.filter(l => !remoteIds.has(l.id))
            setSavedScripts([...remoteScripts, ...uniqueLocal])
        } catch (e) {
            setSavedScripts(remoteScripts)
        } finally {
            setLoadingScripts(false)
        }
    }

    const saveToLocalStorage = (script: StudioScript) => {
        try {
            const localRaw = localStorage.getItem('nexus_studio_scripts')
            const localItems: StudioScript[] = localRaw ? JSON.parse(localRaw) : []
            const updated = [script, ...localItems]
            localStorage.setItem('nexus_studio_scripts', JSON.stringify(updated))
            setSavedScripts(prev => {
                const exists = prev.some(p => p.id === script.id)
                return exists ? prev : [script, ...prev]
            })
        } catch (e) {
            console.error('Error saving to localStorage:', e)
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
                    osId: osId || undefined,
                    brandPrimaryColor: bannerPrimaryColor
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
        const tempScript: StudioScript = {
            id: 'local_' + Date.now(),
            company_id: '',
            title: currentOutput.title || 'Novo Roteiro',
            category: currentOutput.category || category,
            source_type: osId ? 'os' : 'manual',
            source_id: osId || null,
            hook_3s: currentOutput.hook_3s || '',
            body_script: currentOutput.body_script || '',
            cta_text: currentOutput.cta_text || '',
            instagram_caption: currentOutput.instagram_caption || '',
            whatsapp_text: currentOutput.whatsapp_text || '',
            google_post: currentOutput.google_post || '',
            banner_prompt: currentOutput.banner_prompt || null,
            created_at: new Date().toISOString()
        }

        try {
            const res = await fetch('/api/studio/scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: tempScript.title,
                    category: tempScript.category,
                    source_type: tempScript.source_type,
                    source_id: tempScript.source_id,
                    hook_3s: tempScript.hook_3s,
                    body_script: tempScript.body_script,
                    cta_text: tempScript.cta_text,
                    instagram_caption: tempScript.instagram_caption,
                    whatsapp_text: tempScript.whatsapp_text,
                    google_post: tempScript.google_post,
                    banner_prompt: tempScript.banner_prompt
                })
            })

            if (res.ok) {
                const data = await res.json()
                toast.success('Roteiro salvo na sua Biblioteca!')
                fetchScripts()
            } else {
                saveToLocalStorage(tempScript)
                toast.success('Roteiro salvo na sua Biblioteca!')
            }
        } catch (error) {
            saveToLocalStorage(tempScript)
            toast.success('Roteiro salvo na sua Biblioteca!')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteScript = async (id: string) => {
        if (!confirm('Deseja excluir este roteiro salvo?')) return

        if (id.startsWith('local_')) {
            try {
                const localRaw = localStorage.getItem('nexus_studio_scripts')
                const localItems: StudioScript[] = localRaw ? JSON.parse(localRaw) : []
                const updated = localItems.filter(l => l.id !== id)
                localStorage.setItem('nexus_studio_scripts', JSON.stringify(updated))
                setSavedScripts(prev => prev.filter(s => s.id !== id))
                toast.success('Roteiro removido')
            } catch (e) {
                console.error('Erro ao remover roteiro local')
            }
            return
        }

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

    // --- 1-CLICK BANNER CREATION FROM SCRIPT ---
    const handleCreateBannerFromScript = (script: StudioScript | Partial<StudioScript>) => {
        setBannerTitle((script.title || 'Manutenção Técnica').toUpperCase())
        setBannerSubtitle(script.cta_text || script.hook_3s || 'Garantia e Rapidez no Conserto')
        setActiveTab('banners')
        toast.success('Dados do roteiro carregados no Estúdio de Banners!')
    }

    const copyToClipboard = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(fieldName)
        toast.success(`Copiado para a área de transferência!`)
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

    // Helper to generate dynamic English prompts for ChatGPT and Nano Banana
    const generateDynamicPrompt = (engine: 'chatgpt' | 'nanobanana') => {
        const formatLabel = bannerAspect === '1:1' ? '1:1 square Instagram feed format' : bannerAspect === '9:16' ? '9:16 vertical Stories/Reels format' : '16:9 widescreen banner format'
        const styleText = bannerStyle === 'bancada_8k' ? 'Hyper-photorealistic 8k commercial advertising photograph of an electronics repair workbench with a technician holding precision tools' : bannerStyle === 'render_3d' ? 'Futuristic 3D product render with glowing glass elements and sleek metallic reflections' : bannerStyle === 'microscopio' ? 'Extreme macro lens photography under a microscope showing intricate circuit board micro-components and soldering gold traces' : 'Clean minimal studio product shot with elegant soft shadows'

        if (engine === 'chatgpt') {
            return `Commercial advertisement banner photography for an electronics repair shop, ${formatLabel}. Main topic: "${bannerTitle}". ${styleText}. Leave clean empty space at the top half reserved for text overlay: "${bannerSubtitle}". Primary brand lighting color palette: ${bannerPrimaryColor} and glowing accent color ${bannerSecondaryColor}. High resolution, 8k, cinematic studio lighting, crisp details, professional lighting --no distorted text, blur.`
        } else {
            return `Ultra-detailed commercial visual for "${bannerTitle}", ${formatLabel}. Style: ${styleText}. Accentuated by neon illumination in ${bannerPrimaryColor} and ${bannerSecondaryColor}. Photorealistic commercial quality, 8k resolution, macro 85mm lens f/1.8, dramatic contrast, professional product photography.`
        }
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

    const COLOR_PRESETS = [
        { name: 'Azul Tech & Dourado', primary: '#3B82F6', secondary: '#F59E0B' },
        { name: 'Vermelho Cyber', primary: '#EF4444', secondary: '#111827' },
        { name: 'Verde Esmeralda', primary: '#10B981', secondary: '#064E3B' },
        { name: 'Roxo Neon', primary: '#8B5CF6', secondary: '#06B6D4' },
        { name: 'Amarelo Ouro', primary: '#F59E0B', secondary: '#1E293B' },
        { name: 'Laranja Fogo', primary: '#F97316', secondary: '#7C2D12' }
    ]

    return (
        <div className="min-h-screen bg-background text-foreground pb-16">
            <Header title="Nexus Studio" subtitle="Publicidade, Roteiros de Vídeo e Banners Promocionais com Claude AI" />

            <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 space-y-6 max-w-7xl mx-auto">

                {/* Header & Tabs Nav */}
                <div className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-4">

                        {/* Navigation Tabs */}
                        <div className="flex flex-wrap gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border w-full md:w-auto">
                            <button
                                onClick={() => setActiveTab('generate')}
                                className={cn(
                                    "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'generate' ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Wand2 className="w-4 h-4" />
                                Gerador Claude AI
                            </button>

                            <button
                                onClick={() => setActiveTab('calendar')}
                                className={cn(
                                    "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'calendar' ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Calendar className="w-4 h-4" />
                                Calendário Sazonal
                            </button>

                            <button
                                onClick={() => setActiveTab('library')}
                                className={cn(
                                    "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'library' ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <FileText className="w-4 h-4" />
                                Biblioteca ({savedScripts.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('banners')}
                                className={cn(
                                    "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    activeTab === 'banners' ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
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
                            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
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
                                        <label className="text-[13px] font-medium text-muted-foreground ml-1">Tema ou Assunto do Conteúdo</label>
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
                                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Categoria</label>
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
                                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Tom de Voz</label>
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
 className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                                <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
                                        <div>
                                            <h3 className="text-lg font-black text-foreground">{currentOutput.title}</h3>
                                            <span className="text-xs font-bold text-amber-500">✨ Gerado por Claude AI via OpenRouter</span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => handleCreateBannerFromScript(currentOutput)}
                                                className="px-3.5 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Criar Banner
                                            </button>

                                            <button
 onClick={() => openTeleprompter(currentOutput)}
 className="px-4 py-2 bg-amber-500 text-black rounded-xl text-xs font-semibold hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-md"
 >
                                                <Play className="w-4 h-4 fill-current" />
                                                Teleprompter
                                            </button>

                                            <button
 onClick={handleSaveScript}
 disabled={isSaving}
 className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50"
 >
                                                <Copy className="w-4 h-4" />
                                                Salvar
                                            </button>
                                        </div>
                                    </div>

                                    {/* 1. Gancho 3s */}
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
                                        <span className="text-xs font-semibold text-amber-500">⚡ Gancho Viral (Primeiros 3 segundos)</span>
                                        <p className="text-base font-bold text-amber-200">"{currentOutput.hook_3s}"</p>
                                    </div>

                                    {/* 2. Roteiro de Bancada */}
                                    <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-2">
                                        <span className="text-xs font-semibold text-muted-foreground">🛠️ Roteiro da Bancada</span>
                                        <p className="text-sm font-medium whitespace-pre-line leading-relaxed">{currentOutput.body_script}</p>
                                    </div>

                                    {/* 3. CTA */}
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-1">
                                        <span className="text-xs font-semibold text-emerald-500">📣 Chamada para Ação (CTA)</span>
                                        <p className="text-sm font-bold text-emerald-200">"{currentOutput.cta_text}"</p>
                                    </div>

                                    {/* 4. Mídias de Exportação */}
                                    <div className="space-y-4 pt-4 border-t border-border">
                                        <h4 className="text-xs font-semibold text-muted-foreground">Pronto para Copiar & Postar:</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Instagram */}
                                            <div className="p-3 bg-muted/20 border border-border rounded-2xl space-y-2 flex flex-col justify-between">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-purple-400">Instagram / TikTok</span>
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
                                                    <span className="text-[11px] font-bold text-emerald-400">Status do WhatsApp</span>
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
                                                    <span className="text-[11px] font-bold text-blue-400">Google Meu Negócio</span>
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
                                <div className="py-20 text-center bg-card border border-dashed border-border rounded-2xl p-8 space-y-3">
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
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
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
                        <div className="border border-primary/20 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                                <Zap className="w-4 h-4" />
                                Ideias da Semana em Destaque
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {WEEKLY_CONTENT_IDEAS.map((idea, idx) => (
                                    <div key={idx} className="bg-card/80 border border-border rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all">
                                        <div>
                                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
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
 className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mt-2"
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
                                <div className="col-span-full py-16 text-center bg-card border border-dashed border-border rounded-2xl">
                                    <p className="text-xs text-muted-foreground">Nenhum evento encontrado para o mês ou categoria selecionada.</p>
                                </div>
                            ) : (
                                filteredEvents.map(event => (
                                    <div key={event.id} className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between group hover:border-primary/50 transition-all shadow-md">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                                    {monthNames[event.month - 1]} • Dia {event.day}
                                                </span>
                                                <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                    {event.badge}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-base group-hover:text-primary transition-colors">{event.title}</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                                        </div>

                                        <div className="pt-3 border-t border-border/50">
                                            <button
 onClick={() => handleSelectSeasonalEvent(event)}
 className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
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
                            <div className="py-16 text-center bg-card border border-dashed border-border rounded-2xl p-8 space-y-2">
                                <p className="text-sm font-bold">Sua biblioteca está vazia</p>
                                <p className="text-xs text-muted-foreground">Gere novos roteiros com o Claude AI e clique em "Salvar" para acessá-los aqui a qualquer momento!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedScripts.map(script => (
                                    <div key={script.id} className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between group hover:border-primary/40 transition-all shadow-md">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
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
                                                onClick={() => handleCreateBannerFromScript(script)}
                                                className="px-3 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                                title="Criar Banner"
                                            >
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                Criar Banner
                                            </button>

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

                {/* TAB 4: BANNERS & ARTES VISUAIS (ESTÚDIO PRÁTICO) */}
                {activeTab === 'banners' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
                        {/* Coluna Esquerda: Configurador de Banner */}
                        <div className="lg:col-span-6 space-y-6">
                            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                                <div>
                                    <h2 className="text-lg font-black flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-purple-500" />
                                        Estúdio de Banners & Artes Visuais
                                    </h2>
                                    <p className="text-xs text-muted-foreground">Escolha os formatos, cores e textos para gerar prompts ricos para ChatGPT e Nano Banana.</p>
                                </div>

                                {/* 1. Formato / Dimensão */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-muted-foreground ml-1">1. Dimensão da Arte</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setBannerAspect('1:1')}
                                            className={cn(
                                                "p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all",
                                                bannerAspect === '1:1' ? "bg-purple-500/10 border-purple-500 text-purple-300" : "bg-background border-border text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Layout className="w-5 h-5" />
                                            <span>Feed (1:1)</span>
                                        </button>

                                        <button
                                            onClick={() => setBannerAspect('9:16')}
                                            className={cn(
                                                "p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all",
                                                bannerAspect === '9:16' ? "bg-purple-500/10 border-purple-500 text-purple-300" : "bg-background border-border text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Smartphone className="w-5 h-5" />
                                            <span>Stories (9:16)</span>
                                        </button>

                                        <button
                                            onClick={() => setBannerAspect('16:9')}
                                            className={cn(
                                                "p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all",
                                                bannerAspect === '16:9' ? "bg-purple-500/10 border-purple-500 text-purple-300" : "bg-background border-border text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Monitor className="w-5 h-5" />
                                            <span>Horizontal (16:9)</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. Caixa de Cores da Marca */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-muted-foreground ml-1">2. Paleta de Cores da Marca</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_PRESETS.map((preset, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setBannerPrimaryColor(preset.primary)
                                                    setBannerSecondaryColor(preset.secondary)
                                                }}
                                                className={cn(
                                                    "px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all",
                                                    bannerPrimaryColor === preset.primary ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground"
                                                )}
                                            >
                                                <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: preset.primary }} />
                                                <span>{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Seletor Custom Hex Color */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl text-xs font-bold">
                                            <input
                                                type="color"
                                                value={bannerPrimaryColor}
                                                onChange={e => setBannerPrimaryColor(e.target.value)}
                                                className="w-6 h-6 rounded-md cursor-pointer border-none bg-transparent"
                                            />
                                            <span className="font-mono text-xs">{bannerPrimaryColor}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">Cor Primária Personalizada</span>
                                    </div>
                                </div>

                                {/* 3. Estilo Visual */}
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-muted-foreground ml-1">3. Estilo de Imagem</label>
                                    <select
                                        value={bannerStyle}
                                        onChange={e => setBannerStyle(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                                    >
                                        <option value="bancada_8k">📸 Fotografia 8K de Bancada (Técnico Trabalhando)</option>
                                        <option value="render_3d">💎 Render 3D Futurista com Neon & Vidro</option>
                                        <option value="microscopio">🔬 Microscópio Macro (Placa & Micro-solda)</option>
                                        <option value="minimalist">🎨 Studio Minimalista Clean de Produto</option>
                                    </select>
                                </div>

                                {/* 4. Textos que Vão na Imagem */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground ml-1">Título Estampado na Arte</label>
                                        <input
                                            type="text"
                                            value={bannerTitle}
                                            onChange={e => setBannerTitle(e.target.value)}
                                            placeholder="Ex: TROCA DE TELA EM 45 MIN"
                                            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[13px] font-medium text-muted-foreground ml-1">Selo de Oferta / Destaque</label>
                                        <input
                                            type="text"
                                            value={bannerSubtitle}
                                            onChange={e => setBannerSubtitle(e.target.value)}
                                            placeholder="Ex: Com Película Grátis e 6 Meses de Garantia"
                                            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna Direita: Mockup Visual & Copiador de Prompts */}
                        <div className="lg:col-span-6 space-y-6">
                            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
                                <div>
                                    <h3 className="text-base font-black flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-amber-400" />
                                        Preview Interativo da Composição
                                    </h3>
                                    <p className="text-xs text-muted-foreground">Simulação visual do banner nas cores escolhidas para conferência antes de gerar a arte.</p>
                                </div>

                                {/* Mockup Visual Card */}
                                <div 
                                    className="p-6 rounded-2xl border space-y-4 relative overflow-hidden transition-all flex flex-col justify-between min-h-[260px]"
                                    style={{
                                        borderColor: bannerPrimaryColor,
                                        background: `linear-gradient(135deg, ${bannerPrimaryColor}25 0%, #090D16 100%)`
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-black/40 text-white" style={{ borderColor: bannerPrimaryColor }}>
                                            Assistência Técnica • {bannerAspect}
                                        </span>
                                        <div className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: bannerSecondaryColor }} />
                                    </div>

                                    <div className="space-y-2 py-4">
                                        <h2 className="text-xl font-black text-white tracking-tight drop-shadow-md">
                                            {bannerTitle || 'SEU TÍTULO AQUI'}
                                        </h2>
                                        <p className="text-xs font-bold text-amber-300 bg-black/50 p-2.5 rounded-xl border border-amber-500/30 inline-block">
                                            ✨ {bannerSubtitle || 'Oferta especial da semana'}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-gray-300 font-bold">
                                        <span>Estilo: {bannerStyle}</span>
                                        <span>Cores: {bannerPrimaryColor} / {bannerSecondaryColor}</span>
                                    </div>
                                </div>

                                {/* Prompts Formatados para ChatGPT e Nano Banana */}
                                <div className="space-y-4 pt-2 border-t border-border">
                                    <h4 className="text-xs font-semibold text-muted-foreground">Prompts Profissionais em Inglês:</h4>

                                    {/* 1. Prompt ChatGPT (DALL-E 3) */}
                                    <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                🤖 ChatGPT (DALL-E 3)
                                            </span>
                                            <button
                                                onClick={() => copyToClipboard(generateDynamicPrompt('chatgpt'), 'prompt_chatgpt')}
                                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                Copiar Prompt ChatGPT
                                            </button>
                                        </div>
                                        <p className="text-[11px] font-mono text-muted-foreground leading-relaxed line-clamp-4">
                                            {generateDynamicPrompt('chatgpt')}
                                        </p>
                                    </div>

                                    {/* 2. Prompt Nano Banana / Imagen 3 */}
                                    <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                                🍌 Nano Banana / Imagen 3 / Flux
                                            </span>
                                            <button
                                                onClick={() => copyToClipboard(generateDynamicPrompt('nanobanana'), 'prompt_nano')}
                                                className="px-3 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                Copiar Prompt Nano Banana
                                            </button>
                                        </div>
                                        <p className="text-[11px] font-mono text-muted-foreground leading-relaxed line-clamp-4">
                                            {generateDynamicPrompt('nanobanana')}
                                        </p>
                                    </div>
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
