'use client'

import { useState } from 'react'
import { Info, X, ChevronLeft, ChevronRight, ZoomIn, Camera } from 'lucide-react'

interface AttachmentImage {
    id: string
    file_url: string
    file_name?: string
    description?: string
    file_type?: string
}

interface DevicesPhotos {
    photo_front_url?: string
    photo_back_url?: string
}

interface Props {
    devicesPhotos?: DevicesPhotos
    attachments?: AttachmentImage[]
}

export default function TrackingGallery({ devicesPhotos, attachments }: Props) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)

    const allImages: { url: string; label: string }[] = []

    if (devicesPhotos?.photo_front_url) {
        allImages.push({ url: devicesPhotos.photo_front_url, label: 'Foto Frontal' })
    }
    if (devicesPhotos?.photo_back_url) {
        allImages.push({ url: devicesPhotos.photo_back_url, label: 'Foto Traseira' })
    }
    attachments?.forEach((att) => {
        if (att.file_type === 'photo') {
            allImages.push({ url: att.file_url, label: att.description || att.file_name || 'Imagem' })
        }
    })

    const openLightbox = (index: number) => {
        setCurrentIndex(index)
        setLightboxOpen(true)
        document.body.style.overflow = 'hidden'
    }

    const closeLightbox = () => {
        setLightboxOpen(false)
        document.body.style.overflow = ''
    }

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % allImages.length)
    }

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
    }

    if (allImages.length === 0) {
        return null
    }

    return (
        <>
            {/* Image Gallery */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Camera className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold tracking-tight">Fotos do Aparelho</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {devicesPhotos?.photo_front_url && (
                        <div 
                            className="space-y-2 cursor-pointer group"
                            onClick={() => openLightbox(0)}
                        >
                            <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 group-hover:border-indigo-500/30 transition-colors">
                                <img 
                                    src={devicesPhotos.photo_front_url} 
                                    alt="Frontal" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block text-center">Frontal</span>
                        </div>
                    )}
                    {devicesPhotos?.photo_back_url && (
                        <div 
                            className="space-y-2 cursor-pointer group"
                            onClick={() => openLightbox(devicesPhotos?.photo_front_url ? 1 : 0)}
                        >
                            <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 group-hover:border-indigo-500/30 transition-colors">
                                <img 
                                    src={devicesPhotos.photo_back_url} 
                                    alt="Traseira" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block text-center">Traseira</span>
                        </div>
                    )}
                    {attachments?.map((attachment, idx) => {
                        if (attachment.file_type !== 'photo') return null
                        const imageIndex = (devicesPhotos?.photo_front_url ? 1 : 0) + (devicesPhotos?.photo_back_url ? 1 : 0) + idx
                        return (
                            <div 
                                key={attachment.id} 
                                className="space-y-2 cursor-pointer group"
                                onClick={() => openLightbox(imageIndex)}
                            >
                                <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 group-hover:border-indigo-500/30 transition-colors">
                                    <img 
                                        src={attachment.file_url} 
                                        alt={attachment.file_name || 'Imagem'} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                    />
                                </div>
                                {attachment.description && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block text-center truncate">
                                        {attachment.description}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && allImages.length > 0 && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeLightbox()
                    }}
                >
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium">
                        {currentIndex + 1} / {allImages.length}
                    </div>

                    {allImages[currentIndex].label && (
                        <div className="absolute top-16 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium px-4 py-1 bg-black/30 rounded-full">
                            {allImages[currentIndex].label}
                        </div>
                    )}

                    <div className="relative max-w-[90vw] max-h-[80vh]">
                        <img 
                            src={allImages[currentIndex].url} 
                            alt={allImages[currentIndex].label} 
                            className="max-w-[90vw] max-h-[80vh] object-contain animate-in zoom-in-95 duration-200" 
                        />
                    </div>

                    {allImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); prevImage() }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); nextImage() }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/50 text-xs">
                        <ZoomIn className="w-4 h-4" />
                        <span>Use as setas ← → para navegar</span>
                    </div>
                </div>
            )}
        </>
    )
}