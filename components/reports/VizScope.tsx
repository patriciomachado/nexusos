'use client'

import { useTheme } from 'next-themes'

/** Chart colors (validated palette) set inline, like on Relatórios. */
const VIZ = {
    light: { '--viz-s1': '#2a78d6', '--viz-s2': '#eb6834', '--viz-grid': '#e1e0d9', '--viz-axis': '#898781', '--viz-good': '#006300', '--viz-bad': '#d03b3b' },
    dark: { '--viz-s1': '#3987e5', '--viz-s2': '#d95926', '--viz-grid': '#2c2c2a', '--viz-axis': '#898781', '--viz-good': '#0ca30c', '--viz-bad': '#e66767' },
}

export default function VizScope({ children, className }: { children: React.ReactNode; className?: string }) {
    const { resolvedTheme } = useTheme()
    return <div className={className} style={(resolvedTheme === 'dark' ? VIZ.dark : VIZ.light) as React.CSSProperties}>{children}</div>
}
