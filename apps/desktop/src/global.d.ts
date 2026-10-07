export {};

declare global {
    interface Window {
        electronAPI?: {
            onShortcut?: (callback: (command: string) => void) => void;
            openExternal?: (url: string) => Promise<void>;
        };
    }
}
