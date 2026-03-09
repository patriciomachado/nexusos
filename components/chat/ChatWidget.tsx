'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react'

export default function ChatWidget() {
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat() as any
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    // Rules of Hooks: conditional returns must happen AFTER all hooks are configured
    if (!mounted) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="bg-[#12121a] border border-[#2a2a35] shadow-2xl rounded-2xl w-[380px] h-[550px] mb-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="bg-[#1a1a24] border-b border-[#2a2a35] px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-sm">Nexus AI</h3>
                                <p className="text-xs text-white/50">Assistente Virtual</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/50 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                <Bot className="w-12 h-12 text-blue-500/50 mb-3" />
                                <p className="text-white/60 text-sm">
                                    Olá! Eu sou o assistente virtual do Nexus OS. Como posso te ajudar hoje?
                                </p>
                            </div>
                        )}

                        {messages.map((m: any) => (
                            <div key={m.id} className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-600' : 'bg-[#1a1a24] border border-[#2a2a35]'
                                    }`}>
                                    {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-500" />}
                                </div>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                                    : 'bg-[#1a1a24] border border-[#2a2a35] text-white/90 rounded-tl-sm'
                                    }`}>
                                    {(m as any).content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-[#1a1a24] border border-[#2a2a35] flex items-center justify-center shrink-0">
                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                </div>
                                <div className="px-4 py-2.5 rounded-2xl text-sm bg-[#1a1a24] border border-[#2a2a35] text-white/50 rounded-tl-sm flex items-center">
                                    Pensando...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-[#1a1a24] border-t border-[#2a2a35]">
                        <form onSubmit={handleSubmit} className="relative flex items-center">
                            <input
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Pergunte algo ao Nexus..."
                                className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-full pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#2a2a35] disabled:text-white/30 text-white rounded-full transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 ${isOpen ? 'bg-[#2a2a35] text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>
        </div>
    )
}
