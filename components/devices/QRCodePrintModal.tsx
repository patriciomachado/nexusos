'use client'

import { X, Printer, QrCode, Smartphone, ShieldCheck, DollarSign } from 'lucide-react'
import { Device } from '@/types/devices'
import { formatCurrency } from '@/lib/utils'

interface QRCodePrintModalProps {
    isOpen: boolean
    onClose: () => void
    device: Device | null
}

export default function QRCodePrintModal({ isOpen, onClose, device }: QRCodePrintModalProps) {
    if (!isOpen || !device) return null

    const handlePrint = () => {
        window.print()
    }

    const catalogUrl = `https://nexusgestor.com/catalogo`
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(catalogUrl)}`

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-border rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-primary" />
                        <h2 className="text-base font-black">Etiqueta de Vitrine com QR Code</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Printable Shelf Card */}
                <div className="p-6 bg-white text-black rounded-3xl border-2 border-dashed border-gray-300 space-y-5 text-center font-sans shadow-lg print:border-none print:shadow-none">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                            {device.condition === 'novo_lacrado' ? 'NOVO LACRADO' : 'SEMINOVO REVISADO'}
                        </span>
                        <h3 className="text-xl font-black tracking-tight text-gray-900 mt-2">
                            {device.brand} {device.model} {device.storage}
                        </h3>
                        <p className="text-xs font-semibold text-gray-600">Cor: {device.color || 'Padrão'} • Bateria {device.battery_health}%</p>
                    </div>

                    {/* QR Code Container */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 inline-block mx-auto">
                        <img
                            src={qrCodeApiUrl}
                            alt="QR Code do Aparelho"
                            className="w-32 h-32 mx-auto rounded-lg"
                        />
                        <span className="text-[9px] font-bold text-gray-500 mt-1 block">Aponte a câmera para ver detalhes</span>
                    </div>

                    {/* Preços */}
                    <div className="space-y-1 bg-gray-100 p-3 rounded-2xl border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">À VISTA NO PIX</span>
                        <p className="text-2xl font-black text-emerald-600 tracking-tight">
                            {formatCurrency(device.cash_price)}
                        </p>
                        {device.installment_price && (
                            <p className="text-xs font-bold text-gray-600">
                                ou 12x de {formatCurrency(device.installment_price / 12)} no cartão
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-500 pt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        Garantia e Assistência Técnica Especializada
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted">
                        Fechar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir Etiqueta
                    </button>
                </div>
            </div>
        </div>
    )
}
