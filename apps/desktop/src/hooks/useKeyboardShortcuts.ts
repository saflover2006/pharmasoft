import { useEffect } from 'react';

/**
 * Keyboard shortcut handler function
 */
type ShortcutHandler = () => void;

/**
 * Keyboard shortcut map
 */
interface ShortcutMap {
    [key: string]: ShortcutHandler;
}

/**
 * Custom hook for managing keyboard shortcuts
 * @param shortcuts - Map of keys to handler functions
 * @param enabled - Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts(
    shortcuts: ShortcutMap,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyPress = (event: KeyboardEvent): void => {
            // Don't trigger shortcuts when typing in input fields
            const activeElement = document.activeElement;
            const isTyping = activeElement?.tagName === 'INPUT' ||
                activeElement?.tagName === 'TEXTAREA' ||
                (activeElement as HTMLElement)?.isContentEditable;

            if (isTyping && event.key !== 'Escape') {
                return; // Let normal typing happen
            }

            // Alt+F1/F2/F3 handling (existing)
            if (event.altKey && (event.key === 'F1' || event.key === 'F2' || event.key === 'F3')) {
                event.preventDefault();
                const shortcutKey = event.key; // 'F1', 'F2', 'F3'
                const handler = shortcuts[shortcutKey];
                if (handler) handler();
                return;
            }

            // Plain number keys 1,2,3 handling (new)
            if (!event.altKey && (event.key === '1' || event.key === '2' || event.key === '3')) {
                event.preventDefault();
                const map: Record<string, string> = { '1': 'F1', '2': 'F2', '3': 'F3' };
                const shortcutKey = map[event.key];
                const handler = shortcuts[shortcutKey];
                if (handler) handler();
                return;
            }

            // Also check for Escape (always works)
            if (event.key === 'Escape' && shortcuts['Escape']) {
                event.preventDefault();
                shortcuts['Escape']();
            }
        };

        // Listen for Electron custom shortcut events (dispatched via executeJavaScript)
        const handleElectronShortcut = (event: Event) => {
            const customEvent = event as CustomEvent<string>;
            console.log('Electron shortcut received:', customEvent.detail);
            const handler = shortcuts[customEvent.detail];
            if (handler) handler();
        };

        window.addEventListener('keydown', handleKeyPress);
        window.addEventListener('electron-shortcut', handleElectronShortcut);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
            window.removeEventListener('electron-shortcut', handleElectronShortcut);
        };
    }, [shortcuts, enabled]);
}
