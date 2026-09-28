import { addDays } from '@/lib/tasks/dates'

/**
 * Same idea as the Routines streak (lib/tasks/dates + streakOf in
 * components/tasks/Routines.tsx), applied to days with at least one post
 * marked "publicado": consecutive days counting back from today (or
 * yesterday, if today has no publish yet).
 */
export function publishStreak(publishedDays: Set<string>, today: string) {
    let day = publishedDays.has(today) ? today : addDays(today, -1)
    let streak = 0
    for (let i = 0; i < 365; i++) {
        if (!publishedDays.has(day)) break
        streak++
        day = addDays(day, -1)
    }
    return streak
}
