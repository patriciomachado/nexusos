'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import { Plus, Users, Loader2, X, Search, Sparkles, ShieldCheck } from 'lucide-react'
import TeamList from '@/components/team/TeamList'
import UserForm from '@/components/forms/UserForm'
import { User } from '@/types'

export default function TeamClient() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined)
    const [searchQuery, setSearchQuery] = useState('')

    async function fetchUsers() {
        setLoading(true)
        try {
            const res = await fetch('/api/users')
            const data = await res.json()
            if (res.ok) {
                setUsers(data)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Equipe & Segurança" />

            <div className="p-8 lg:p-12 max-w-screen-2xl mx-auto space-y-12">

                {/* Header Actions */}
                <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-1 bg-primary rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Controle de Acesso & Níveis</span>
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter">Gestão de Talentos</h2>
                        <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-xl">Gerencie as permissões, cargos e acessos da sua equipe operacional e administrativa.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                        <div className="relative flex-1 sm:min-w-[400px] group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou e-mail..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-16 pl-14 pr-6 bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[1.5rem] text-sm font-bold outline-none focus:border-primary/30 transition-all placeholder:opacity-30 shadow-2xl"
                            />
                        </div>
                        <button
                            onClick={() => { setSelectedUser(undefined); setIsModalOpen(true); }}
                            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-primary text-primary-foreground h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20 group"
                        >
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                            Novo Membro
                        </button>
                    </div>
                </div>

                {/* Dashboard Insight Bar */}
                <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Users className="w-7 h-7" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-foreground tracking-tight">{users.length} Colaboradores</h4>
                            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Base de talentos ativa no Nexus OS</p>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-white/5 hidden md:block" />
                    <div className="flex items-center gap-10">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Cargos</p>
                            <p className="text-sm font-bold text-foreground">6 Categorias</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Status</p>
                            <div className="flex items-center gap-1.5 justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-sm font-bold text-foreground">100% Online</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-8">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-[2.5rem] border-2 border-primary/20 animate-pulse" />
                                <Loader2 className="w-10 h-10 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 animate-pulse">Sincronizando Hierarquias</span>
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <TeamList
                            users={filteredUsers}
                            onEdit={(user) => { setSelectedUser(user); setIsModalOpen(true); }}
                            onRefresh={fetchUsers}
                        />
                    ) : (
                        <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[4rem] p-32 text-center space-y-10 shadow-2xl">
                            <div className="w-32 h-32 bg-primary/10 rounded-[3rem] flex items-center justify-center mx-auto group hover:rotate-12 transition-transform shadow-inner">
                                <Users className="w-16 h-16 text-primary/40" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-4xl font-black text-foreground tracking-tighter">Equipe não localizada</h3>
                                <p className="text-muted-foreground/60 text-lg max-w-sm mx-auto leading-relaxed">
                                    Não encontramos nenhum colaborador correspondente à sua busca ou sua base está vazia.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground h-16 px-12 rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-105"
                            >
                                Convidar Primeiro Membro
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Modal for UserForm */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="bg-card/60 backdrop-blur-3xl border border-white/10 w-full max-w-3xl rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500 relative">
                        {/* Backgroundglow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="flex items-center justify-between p-12 border-b border-white/5 relative z-10">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/40">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tighter text-foreground">{selectedUser ? 'Ajustar Perfil' : 'Integrar Talento'}</h2>
                                </div>
                                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em] font-black">Nexus OS Security Management</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-4 rounded-2xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all border border-transparent hover:border-white/10 group">
                                <X className="w-7 h-7 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        <div className="p-12 relative z-10">
                            <UserForm
                                initial={selectedUser}
                                onSuccess={() => { setIsModalOpen(false); fetchUsers(); }}
                                onCancel={() => setIsModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

