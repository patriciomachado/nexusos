'use client'

import { useState } from 'react'
import { Star, Send, Loader2 } from 'lucide-react'
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
    const router = useRouter()

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
            router.refresh() // Refresh the page to show the "Already Rated" state
        } catch (error: any) {
            toast.error(error.message)
            setIsLoading(false) // Only reset if failed. If success, it refreshes anyway.
        }
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
                            className={`p-2 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ${(hoverRating || rating) >= star
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
                        className="w-full bg-white dark:bg-[#0a0a0f] border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none h-24"
                    />

                    <button
                        type="submit"
                        disabled={rating === 0 || isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 px-6 font-bold text-sm shadow-[0_4px_20px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
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
