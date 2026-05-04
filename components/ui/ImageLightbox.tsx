'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface ImageLightboxProps {
    images: { url: string; label?: string }[]
    initialIndex?: number
}

export default function ImageLightbox({ images, initialIndex = 0 }: ImageLightboxProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [isZoomed, setIsZoomed] = useState(false)

    useEffect(() => {
        if (initialIndex > 0) {
            setCurrentIndex(initialIndex)
        }
    }, [initialIndex])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return
            if (e.key === 'Escape') setIsOpen(false)
            if (e.key === 'ArrowRight') nextImage()
            if (e.key === 'ArrowLeft') prevImage()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, currentIndex])

    const openLightbox = (index: number) => {
        setCurrentIndex(index)
        setIsOpen(true)
        document.body.style.overflow = 'hidden'
    }

    const closeLightbox = () => {
        setIsOpen(false)
        setIsZoomed(false)
        document.body.style.overflow = ''
    }

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length)
        setIsZoomed(false)
    }

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
        setIsZoomed(false)
    }

    if (!isOpen) {
        return null
    }

    const currentImage = images[currentIndex]

    return (
        <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) closeLightbox()
            }}
        >
            {/* Close Button */}
            <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium">
                {currentIndex + 1} / {images.length}
            </div>

            {/* Label */}
            {currentImage.label && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
                    {currentImage.label}
                </div>
            )}

            {/* Image Container */}
            <div 
                className={`relative max-w-[90vw] max-h-[80vh] transition-transform duration-300 ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
                onClick={() => setIsZoomed(!isZoomed)}
            >
                <img 
                    src={currentImage.url} 
                    alt={currentImage.label || 'Imagem'} 
                    className="max-w-[90vw] max-h-[80vh] object-contain"
                />
            </div>

            {/* Navigation */}
            {images.length > 1 && (
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

            {/* Zoom Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/50 text-xs">
                <ZoomIn className="w-4 h-4" />
                <span>Clique na imagem para {isZoomed ? 'diminuir' : 'aumentar'} o zoom</span>
                <span className="hidden sm:inline">• setas para navegar</span>
            </div>
        </div>
    )
}

export function useImageLightbox() {
    const [lightboxImages, setLightboxImages] = useState<{ url: string; label?: string }[]>([])
    const [initialIndex, setInitialIndex] = useState(0)

    const open = (images: { url: string; label?: string }[], index = 0) => {
        setLightboxImages(images)
        setInitialIndex(index)
    }

    return { lightboxImages, initialIndex, open }
}