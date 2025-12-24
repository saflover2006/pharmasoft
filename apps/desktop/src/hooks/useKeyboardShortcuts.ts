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
            const handler = shortcuts[event.key];

            if (handler) {
                event.preventDefault();
                handler();
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [shortcuts, enabled]);
}
