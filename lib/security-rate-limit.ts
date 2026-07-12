import { NextRequest } from 'next/server'

type RateLimitStore = Record<string, number[]>

const stores: Record<string, RateLimitStore> = {}

/**
 * In-memory rate limiting utility for API routes.
 * 
 * @param key Unique key for the endpoint (e.g. 'accept-terms')
 * @param limit Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds (e.g. 60000 for 1 minute)
 * @param identifier Unique identifier for the client (e.g. IP address)
 * @returns boolean true if the request is allowed, false if rate limited
 */
export function rateLimit(key: string, limit: number, windowMs: number, identifier: string): boolean {
    if (!stores[key]) {
        stores[key] = {}
    }
    
    const store = stores[key]
    const now = Date.now()
    const timestamps = store[identifier] || []
    
    // Keep only timestamps within the current window
    const activeTimestamps = timestamps.filter(time => now - time < windowMs)
    
    if (activeTimestamps.length >= limit) {
        return false
    }
    
    activeTimestamps.push(now)
    store[identifier] = activeTimestamps
    return true
}

/**
 * Extracts client IP from request headers.
 */
export function getClientIp(req: NextRequest): string {
    const xForwardedFor = req.headers.get('x-forwarded-for')
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim()
    }
    return req.headers.get('x-real-ip') || '127.0.0.1'
}
