'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import { Plus, Users, Loader2, X, Search } from 'lucide-react'
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
        <div className="flex flex-col min-h-screen bg-background pb-20">
            <Header title="Equipe & Permissões" />

            <div className="p-6 max-w-7xl mx-auto w-full space-y-10">

                {/* Header Actions */}
                <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                                <Users className="w-6 h-6" />
                            </div>
                            <h2 className="text-3xl font-black text-foreground tracking-tight">Gerenciar Equipe</h2>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium ml-2">
                            Gerencie os acessos e cargos dos seus colaboradores.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative flex-1 sm:min-w-[300px] group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar membro..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-14 pl-12 pr-4 bg-muted/40 border border-border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => { setSelectedUser(undefined); setIsModalOpen(true); }}
                            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-foreground text-background h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-foreground/10"
                        >
                            <Plus className="w-5 h-5" /> Novo Membro
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.3em]">Carregando Equipe...</p>
                    </div>
                ) : filteredUsers.length > 0 ? (
                    <TeamList
                        users={filteredUsers}
                        onEdit={(user) => { setSelectedUser(user); setIsModalOpen(true); }}
                        onRefresh={fetchUsers}
                    />
                ) : (
                    <div className="bg-card border-2 border-dashed border-border rounded-[3rem] p-20 text-center space-y-6">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/30">
                            <Users className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">Nenhum membro encontrado</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                Comece convidando seus colaboradores para que eles possam acessar o sistema.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all"
                        >
                            Convidar Membro
                        </button>
                    </div>
                )}
            </div>

            {/* Modal for UserForm */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card border border-border w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-8 border-b border-border bg-muted/30">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black tracking-tight">{selectedUser ? 'Editar Membro' : 'Convidar Novo Membro'}</h2>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Gerenciamento de Acessos</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 rounded-2xl hover:bg-muted transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10">
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
