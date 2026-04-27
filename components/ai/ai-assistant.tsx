'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@ai-sdk/react'

const MotionButton = motion.button as any
const MotionDiv = motion.div as any

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: '/api/chat',
        initialMessages: [
            { id: 'welcome', role: 'assistant', content: 'Olá! Sou a Aura. Como posso ajudar na sua oficina hoje?' }
        ],
    } as any) as any

    useEffect(() => { 
        setIsMounted(true) 
    }, [])

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [isOpen, messages])

    const messagesEndRef = useRef<HTMLDivElement>(null)

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return
        handleSubmit(e)
    }

    return (
        <div style={{ position: 'fixed', bottom: 0, right: 0, zIndex: 99999 }}>
            {/* Botão Flutuante - Mais Simples e Elegante */}
            <MotionButton
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: '#6366f1', color: 'white', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                    zIndex: 100000
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                )}
            </MotionButton>

            {/* Painel de Chat - Estilo "Primeira Versão" (Clean & Modern) */}
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        style={{
                            position: 'fixed', bottom: '100px', right: '24px',
                            width: '380px', height: '550px', 
                            background: '#ffffff',
                            borderRadius: '20px',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0'
                        }}
                    >
                        {/* Header Clean */}
                        <div style={{ 
                            padding: '20px', 
                            background: '#6366f1',
                            color: 'white',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path></svg>
                                </div>
                                <span style={{ fontWeight: '700', fontSize: '16px' }}>Aura AI</span>
                            </div>
                            {isLoading && (
                                <MotionDiv
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '12px' }}
                                >
                                    Digitando...
                                </MotionDiv>
                            )}
                        </div>

                        {/* Mensagens */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#f8fafc' }}>
                            {messages.map((m: any, idx: number) => (
                                <div 
                                    key={m.id || `msg-${idx}`}
                                    style={{ 
                                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%',
                                        background: m.role === 'user' ? '#6366f1' : '#ffffff',
                                        color: m.role === 'user' ? 'white' : '#1e293b',
                                        padding: '12px 16px',
                                        borderRadius: '16px',
                                        borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                                        borderBottomLeftRadius: m.role === 'user' ? '16px' : '4px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                        border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                                        fontSize: '14px',
                                        lineHeight: '1.5'
                                    }}
                                >
                                    {typeof m.content === 'string' ? m.content : (m.content as any)?.toString?.() || ''}
                                    
                                    {/* Tool Indicators Simples */}
                                    {m.toolInvocations?.map((tool: any) => (
                                        <div key={tool.toolCallId} style={{ 
                                            marginTop: '8px', padding: '6px 10px', 
                                            background: 'rgba(0,0,0,0.05)', borderRadius: '8px', fontSize: '11px',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tool.state === 'result' ? '#22c55e' : '#6366f1' }} />
                                            <span>{tool.state === 'result' ? 'Dados obtidos' : 'Consultando sistema...'}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area Robusta */}
                        <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                            <form 
                                onSubmit={handleFormSubmit}
                                style={{ display: 'flex', gap: '8px' }}
                            >
                                <input 
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder="Escreva sua mensagem..."
                                    style={{ 
                                        flex: 1, background: '#f1f5f9', border: '1px solid #e2e8f0', 
                                        padding: '12px 16px', borderRadius: '12px', color: '#1e293b', 
                                        outline: 'none', fontSize: '14px' 
                                    }}
                                    disabled={isLoading}
                                />
                                <button 
                                    type="submit" 
                                    disabled={isLoading || !input.trim()} 
                                    style={{ 
                                        width: '45px', height: '45px', 
                                        background: '#6366f1', color: 'white', 
                                        border: 'none', borderRadius: '12px', 
                                        cursor: 'pointer', display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center',
                                        opacity: isLoading || !input.trim() ? 0.5 : 1
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </form>
                            {error && (
                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                                    Erro na conexão. Tente novamente.
                                </div>
                            )}
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    )
}
