'use client'

import { useEffect, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera, RefreshCw, Volume2, VolumeX, Keyboard, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BarcodeScannerModalProps {
    isOpen: boolean
    onClose: () => void
    onScan: (code: string) => void
    title?: string
}

export default function BarcodeScannerModal({
    isOpen,
    onClose,
    onScan,
    title = 'Escanear Código de Barras'
}: BarcodeScannerModalProps) {
    const [html5Qrcode, setHtml5Qrcode] = useState<Html5Qrcode | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
    const [selectedCameraId, setSelectedCameraId] = useState<string>('')
    const [manualCode, setManualCode] = useState('')
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [showManualInput, setShowManualInput] = useState(false)

    const scannerContainerId = 'nexus-barcode-reader-element'

    // Play scan success sound using Web Audio API
    const playSuccessBeep = () => {
        if (!soundEnabled) return
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            osc.type = 'sine'
            osc.frequency.setValueAtTime(1200, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.1)

            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start()
            osc.stop(ctx.currentTime + 0.15)

            if ('vibrate' in navigator) {
                navigator.vibrate(100)
            }
        } catch {
            // Audio context blocked or not supported
        }
    }

    const handleSuccessfulScan = (decodedText: string) => {
        playSuccessBeep()
        toast.success(`Código lido: ${decodedText}`)
        onScan(decodedText)
        handleClose()
    }

    // Initialize camera stream
    useEffect(() => {
        if (!isOpen) return

        let scanner: Html5Qrcode | null = null

        const startScanner = async () => {
            try {
                // Get available cameras
                const devices = await Html5Qrcode.getCameras()
                if (devices && devices.length > 0) {
                    setCameras(devices.map(d => ({ id: d.id, label: d.label || `Câmera ${d.id}` })))
                    // Prefer back camera if available
                    const backCamera = devices.find(d => 
                        d.label.toLowerCase().includes('back') || 
                        d.label.toLowerCase().includes('traseira') || 
                        d.label.toLowerCase().includes('environment')
                    ) || devices[0]

                    const cameraId = backCamera.id
                    setSelectedCameraId(cameraId)

                    scanner = new Html5Qrcode(scannerContainerId, {
                        verbose: false,
                        formatsToSupport: [
                            Html5QrcodeSupportedFormats.EAN_13,
                            Html5QrcodeSupportedFormats.EAN_8,
                            Html5QrcodeSupportedFormats.CODE_128,
                            Html5QrcodeSupportedFormats.CODE_39,
                            Html5QrcodeSupportedFormats.UPC_A,
                            Html5QrcodeSupportedFormats.UPC_E,
                            Html5QrcodeSupportedFormats.QR_CODE,
                        ]
                    })

                    setHtml5Qrcode(scanner)

                    await scanner.start(
                        { facingMode: 'environment' },
                        {
                            fps: 15,
                            qrbox: { width: 280, height: 160 },
                            aspectRatio: 1.0,
                        },
                        (decodedText) => {
                            handleSuccessfulScan(decodedText)
                        },
                        () => {
                            // Frame scanning fail (normal when searching)
                        }
                    )
                    setIsScanning(true)
                } else {
                    toast.error('Nenhuma câmera encontrada no dispositivo.')
                    setShowManualInput(true)
                }
            } catch (err: any) {
                console.error('Camera access error:', err)
                toast.error('Permissão de câmera negada ou indisponível.')
                setShowManualInput(true)
            }
        }

        const timer = setTimeout(() => {
            startScanner()
        }, 300)

        return () => {
            clearTimeout(timer)
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(console.error)
            }
        }
    }, [isOpen])

    const switchCamera = async (cameraId: string) => {
        if (!html5Qrcode) return
        setSelectedCameraId(cameraId)
        try {
            if (html5Qrcode.isScanning) {
                await html5Qrcode.stop()
            }
            await html5Qrcode.start(
                cameraId,
                {
                    fps: 15,
                    qrbox: { width: 280, height: 160 },
                },
                (decodedText) => handleSuccessfulScan(decodedText),
                () => {}
            )
        } catch (error) {
            console.error('Failed to switch camera:', error)
            toast.error('Erro ao alternar câmera.')
        }
    }

    const handleClose = async () => {
        if (html5Qrcode && html5Qrcode.isScanning) {
            try {
                await html5Qrcode.stop()
            } catch (e) {
                console.error('Error stopping scanner:', e)
            }
        }
        setIsScanning(false)
        onClose()
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!manualCode.trim()) {
            toast.error('Digite um código válido')
            return
        }
        handleSuccessfulScan(manualCode.trim())
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-card/95 border border-border/50 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Camera className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-foreground text-base tracking-tight">{title}</h3>
                            <p className="text-xs font-bold text-muted-foreground">Aproxime o código da câmera</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={cn(
                                "p-2.5 rounded-xl border transition-all",
                                soundEnabled ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/40 border-transparent text-muted-foreground"
                            )}
                            title={soundEnabled ? "Som Ativado" : "Som Desativado"}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Camera View Area */}
                <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
                    <div id={scannerContainerId} className="w-full h-full min-h-[320px] object-cover" />

                    {/* Viewfinder Target Overlay */}
                    {isScanning && !showManualInput && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                            <div className="relative w-[280px] h-[160px] border-2 border-primary/40 rounded-2xl bg-primary/5">
                                {/* Corners */}
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />

                                {/* Scanning Line Animation */}
                                <div className="absolute inset-x-2 h-0.5 animate-pulse shadow-[0_0_12px_#3b82f6] top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls & Manual Input Toggle */}
                <div className="p-4 border-t border-border/40 space-y-4 bg-background/50">
                    <div className="flex items-center justify-between gap-3">
                        {cameras.length > 1 && (
                            <div className="flex items-center gap-2 flex-1">
                                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                                <select
                                    value={selectedCameraId}
                                    onChange={(e) => switchCamera(e.target.value)}
                                    className="bg-muted/40 border border-border/50 text-xs font-medium rounded-xl px-3 py-2 text-foreground focus:outline-none w-full"
                                >
                                    {cameras.map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition-all ml-auto"
                        >
                            <Keyboard className="w-4 h-4 text-primary" />
                            <span>{showManualInput ? 'Usar Câmera' : 'Digitar Código'}</span>
                        </button>
                    </div>

                    {showManualInput && (
                        <form onSubmit={handleManualSubmit} className="flex items-center gap-2 pt-2 animate-in slide-in-from-bottom-2 duration-300">
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Digite o código de barras ou SKU..."
                                className="flex-1 bg-muted/30 border border-border/60 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary"
                                autoFocus
                            />
                            <button
 type="submit"
 className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1 hover:bg-primary/90 transition-all"
 >
                                <Check className="w-4 h-4" />
                                <span>OK</span>
                            </button>
                        </form>
                    )}
                </div>

            </div>
        </div>
    )
}
