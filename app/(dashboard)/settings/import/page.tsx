'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { importDataAction } from './actions';

export default function ImportPage() {
    const [customerFile, setCustomerFile] = useState<File | null>(null);
    const [orderFile, setOrderFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'processing' | 'uploading' | 'completed' | 'error'>('idle');
    const [result, setResult] = useState<{ customers: number; orders: number } | null>(null);

    const handleImport = async () => {
        if (!customerFile || !orderFile) {
            toast.error('Por favor, selecione ambos os arquivos (Clientes e Ordens)');
            return;
        }

        setIsImporting(true);
        setStatus('processing');
        setProgress(10);

        try {
            const formData = new FormData();
            formData.append('customers', customerFile);
            formData.append('orders', orderFile);

            setProgress(30);
            const response = await importDataAction(formData);

            if (response.success) {
                setResult({
                    customers: response.customersCount || 0,
                    orders: response.ordersCount || 0
                });
                setStatus('completed');
                setProgress(100);
                toast.success('Importação concluída com sucesso!');
            } else {
                throw new Error(response.error || 'Erro desconhecido na importação');
            }
        } catch (error: any) {
            console.error('Erro na importação:', error);
            setStatus('error');
            toast.error(error.message || 'Falha ao importar dados');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-1 relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                    Importação <span className="text-primary">uMDB Plus</span>
                </h1>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider opacity-60">
                    Migre seus dados históricos com tecnologia Nexus
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Clientes Card */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                        <FileText size={120} />
                    </div>
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-xs">Clientes</h3>
                                <p className="text-xs text-muted-foreground font-medium">Upload do arquivo CLIENTES.PDF</p>
                            </div>
                        </div>
                        <div className="space-y-2 pt-2">
                            <label className="text-[13px] font-medium text-muted-foreground px-1 block">
                                Selecionar Arquivo
                            </label>
                            <input 
                                type="file" 
                                accept=".pdf" 
                                onChange={(e) => setCustomerFile(e.target.files?.[0] || null)}
                                className="w-full text-xs font-bold bg-muted/40 border border-border rounded-xl p-3 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:uppercase file:bg-primary file:text-white hover:bg-muted/60 transition-colors"
                                disabled={isImporting}
                            />
                        </div>
                    </div>
                </div>

                {/* Ordens Card */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                        <Zap size={120} />
                    </div>
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shadow-inner">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-xs">Ordens de Serviço</h3>
                                <p className="text-xs text-muted-foreground font-medium">Upload do arquivo ORDEMS.PDF</p>
                            </div>
                        </div>
                        <div className="space-y-2 pt-2">
                            <label className="text-[13px] font-medium text-muted-foreground px-1 block">
                                Selecionar Arquivo
                            </label>
                            <input 
                                type="file" 
                                accept=".pdf" 
                                onChange={(e) => setOrderFile(e.target.files?.[0] || null)}
                                className="w-full text-xs font-bold bg-muted/40 border border-border rounded-xl p-3 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:uppercase file:bg-primary file:text-white hover:bg-muted/60 transition-colors"
                                disabled={isImporting}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Status & Progress */}
            {status !== 'idle' && (
                <div className="bg-muted/30 border border-border rounded-3xl p-8 space-y-6 relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                                status === 'completed' ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
                            )}>
                                {status === 'processing' || status === 'uploading' ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : status === 'completed' ? (
                                    <CheckCircle2 className="w-6 h-6" />
                                ) : (
                                    <AlertCircle className="w-6 h-6 text-destructive" />
                                )}
                            </div>
                            <div>
                                <h4 className="font-black text-sm">
                                    {status === 'processing' && 'Processando PDFs...'}
                                    {status === 'uploading' && 'Sincronizando Banco...'}
                                    {status === 'completed' && 'Sucesso!'}
                                    {status === 'error' && 'Falha na Importação'}
                                </h4>
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                                    {status === 'processing' && 'Extraindo dados e filtrando duplicatas'}
                                    {status === 'uploading' && 'Enviando lotes para o Supabase'}
                                    {status === 'completed' && 'Sua base de dados foi atualizada'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black text-primary">{progress}%</span>
                        </div>
                    </div>

                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border p-0.5">
                        <div 
                            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    
                    {status === 'completed' && result && (
                        <div className="grid grid-cols-2 gap-4 pt-4 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 bg-background rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
                                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1">Clientes</span>
                                <span className="text-4xl font-black text-primary">{result.customers}</span>
                            </div>
                            <div className="p-6 bg-background rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
                                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1">Ordens</span>
                                <span className="text-4xl font-black text-indigo-500">{result.orders}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Action Button */}
            <div className="flex flex-col items-center gap-6 pt-4">
                <button 
 onClick={handleImport}
 disabled={isImporting || !customerFile || !orderFile}
 className={cn(
 "w-full md:w-auto min-w-[280px] h-16 rounded-2xl font-black text-lg transition-all duration-500 flex items-center justify-center gap-3 shadow-2xl",
 isImporting 
 ? "bg-muted text-muted-foreground cursor-not-allowed" 
 : "bg-primary text-white hover:scale-[1.02] hover:shadow-primary/40 active:scale-95"
 )}
 >
                    {isImporting ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Importando
                        </>
                    ) : (
                        <>
                            <Upload className="w-6 h-6" />
                            Iniciar Migração
                        </>
                    )}
                </button>

                <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 max-w-2xl text-center">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[11px] font-black text-amber-500/80 uppercase tracking-widest leading-relaxed">
                        Aviso: Este processo é irreversível e processa dados em larga escala. Certifique-se de que os PDFs são originais do uMDB Plus.
                    </p>
                </div>
            </div>
        </div>
    );
}
