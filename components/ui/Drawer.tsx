'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function Drawer({ isOpen, onClose, children, title }: DrawerProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-background/40 backdrop-blur-sm z-[100] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 w-full sm:max-w-md bg-card border-l border-border z-[101] shadow-2xl transition-transform duration-500 ease-in-out transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-black tracking-tighter uppercase">{title || 'Menu'}</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
