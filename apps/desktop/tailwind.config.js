/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom dark theme colors
                'dark-bg': '#0f172a',
                'dark-surface': '#1e293b',
                'dark-elevated': '#334155',
                'dark-border': '#475569',
                'primary': '#3b82f6',
                'primary-hover': '#2563eb',
                'success': '#10b981',
                'warning': '#f59e0b',
                'danger': '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
                'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
            }
        },
    },
    plugins: [],
}
