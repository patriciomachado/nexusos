'use client'

import { useState, useEffect, useRef } from 'react'
import { Star, Send, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface CustomerRatingFormProps {
    token: string
}

export default function CustomerRatingForm({ token }: CustomerRatingFormProps) {
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [countdown, setCountdown] = useState(5)
    const [reviewUrl, setReviewUrl] = useState('')
    const intervalRef = useRef<any>(null)
    const router = useRouter()

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating < 1 || rating > 5) {
            toast.error('Por favor, selecione uma nota de 1 a 5 estrelas.')
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch(`/api/tracking/${token}/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, comment }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao enviar avaliação')
            }

            toast.success('Avaliação enviada com sucesso! Muito obrigado.')
            
            if (data.googleReviewUrl) {
                setReviewUrl(data.googleReviewUrl)
                setIsSubmitted(true)
                let count = 5
                setCountdown(count)
                
                intervalRef.current = setInterval(() => {
                    count -= 1
                    setCountdown(count)
                    if (count <= 0) {
                        if (intervalRef.current) clearInterval(intervalRef.current)
                        window.location.href = data.googleReviewUrl
                    }
                }, 1000)
            } else {
                setIsSubmitted(true)
                setTimeout(() => {
                    router.refresh()
                }, 3000)
            }
        } catch (error: any) {
            toast.error(error.message)
            setIsLoading(false)
        }
    }

    if (isSubmitted && reviewUrl) {
        return (
            <div className="bg-white/70 dark:bg-white/[0.02] backdrop-blur-xl rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl relative z-10 animate-in fade-in zoom-in duration-500 flex flex-col items-center text-center gap-6 max-w-md mx-auto">
                <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full animate-pulse" />
                    <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg relative animate-bounce">
                        <Star className="w-10 h-10 text-white fill-white" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent ">
                        Sua opinião vale muito!
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ficamos muito felizes que teve uma boa experiência! Que tal nos apoiar compartilhando isso no Google?
                    </p>
                </div>

                {/* Progress Circle Visual Timer */}
                <div className="flex flex-col items-center gap-2 py-2">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="absolute w-full h-full transform -rotate-90">
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                className="stroke-slate-200 dark:stroke-slate-800"
                                strokeWidth="4"
                                fill="transparent"
                            />
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                className="stroke-indigo-600 dark:stroke-indigo-400 transition duration-1000 ease-linear"
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={176}
                                strokeDashoffset={176 - (176 * countdown) / 5}
                            />
                        </svg>
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{countdown}s</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Redirecionando automaticamente...</span>
                </div>

                <div className="w-full space-y-3">
                    <a
                        href={reviewUrl}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-4 px-6 font-black text-sm shadow-[0_4px_25px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5"
                    >
                        Avaliar no Google Agora
                        <ExternalLink className="w-4 h-4" />
                    </a>
                    
                    <button
                        onClick={() => router.refresh()}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        Voltar para a Ordem de Serviço
                    </button>
                </div>
            </div>
        )
    }

    if (isSubmitted) {
        return (
            <div className="bg-white/70 dark:bg-white/[0.02] backdrop-blur-xl rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl relative z-10 animate-in fade-in zoom-in duration-500 flex flex-col items-center text-center gap-6 max-w-md mx-auto">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                    <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg relative">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent ">
                        Muito Obrigado!
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Sua avaliação foi enviada com sucesso e será utilizada para melhorarmos continuamente nossos serviços.
                    </p>
                </div>

                <button
                    onClick={() => router.refresh()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl py-4 px-6 font-bold text-sm transition"
                >
                    Voltar para a Ordem de Serviço
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-white/[0.02] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/10 shadow-sm relative z-10">
            <div className="flex flex-col items-center gap-6">

                {/* Star Selection */}
                <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className={`p-2 rounded-full transition duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ${(hoverRating || rating) >= star
                                    ? 'text-yellow-400'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                        >
                            <Star className={`w-10 h-10 ${(hoverRating || rating) >= star ? 'fill-yellow-400' : ''}`} />
                        </button>
                    ))}
                </div>

                <div className="w-full space-y-4">
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Deixe um comentário sobre o seu atendimento (opcional)"
                        className="w-full bg-white dark:bg-[#0a0a0f] border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition resize-none h-24"
                    />

                    <button
                        type="submit"
                        disabled={rating === 0 || isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 px-6 font-bold text-sm shadow-[0_4px_20px_rgba(79,70,229,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Enviar Avaliação
                            </>
                        )}
                    </button>
                    {rating === 0 && (
                        <p className="text-xs text-center text-slate-500">Selecione uma nota de 1 a 5 para enviar.</p>
                    )}
                </div>
            </div>
        </form>
    )
}
