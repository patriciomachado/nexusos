/**
 * Shrinks photos in the browser before upload. A phone photo (3–8 MB,
 * 4000px) becomes ~150–400 KB at 1600px, which loads fast on the OS page,
 * the tracking link and the catalog, and saves storage.
 *
 * - Respects the camera's orientation (EXIF), so photos don't come out rotated.
 * - Keeps transparency for logos (PNG), uses JPEG for photos.
 * - Returns the original file when it is already small, or when the browser
 *   can't decode it (e.g. HEIC on desktop): uploading never breaks.
 */

type Preset = 'photo' | 'logo'

const PRESETS: Record<Preset, { maxSize: number; quality: number; skipBelowBytes: number }> = {
    photo: { maxSize: 1600, quality: 0.8, skipBelowBytes: 350 * 1024 },
    logo: { maxSize: 512, quality: 0.9, skipBelowBytes: 150 * 1024 },
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' })
        } catch { /* fall back to <img> */ }
    }
    const url = URL.createObjectURL(file)
    try {
        const img = new Image()
        img.decoding = 'async'
        img.src = url
        await img.decode()
        return img
    } finally {
        URL.revokeObjectURL(url)
    }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality))
}

function renamed(name: string, ext: string) {
    const base = name.replace(/\.[^.]+$/, '') || 'imagem'
    return `${base}.${ext}`
}

export async function compressImage(file: File, preset: Preset = 'photo'): Promise<File> {
    const { maxSize, quality, skipBelowBytes } = PRESETS[preset]
    if (typeof document === 'undefined' || !file.type.startsWith('image/')) return file
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file

    let source: ImageBitmap | HTMLImageElement
    try {
        source = await decode(file)
    } catch {
        return file
    }
    const width = 'naturalWidth' in source ? source.naturalWidth : source.width
    const height = 'naturalHeight' in source ? source.naturalHeight : source.height
    if (!width || !height) return file
    if (file.size <= skipBelowBytes && Math.max(width, height) <= maxSize) return file

    const scale = Math.min(1, maxSize / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    // Logos keep transparency (PNG); photos become JPEG on a white background.
    const keepAlpha = preset === 'logo' && /png|webp/.test(file.type)
    if (!keepAlpha) {
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    if ('close' in source) source.close()

    const type = keepAlpha ? 'image/png' : 'image/jpeg'
    const blob = await canvasToBlob(canvas, type, quality)
    if (!blob || blob.size >= file.size) return file
    return new File([blob], renamed(file.name, keepAlpha ? 'png' : 'jpg'), { type, lastModified: Date.now() })
}

/** Same compression, as a data URL (for places that store the image inline). */
export async function compressToDataUrl(file: File, preset: Preset = 'photo'): Promise<string> {
    const compressed = await compressImage(file, preset)
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(compressed)
    })
}

/** File extension for the uploaded object. */
export function extensionOf(file: File) {
    return file.name.split('.').pop()?.toLowerCase() || 'jpg'
}
