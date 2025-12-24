import { useEffect, useRef } from 'react';

interface BarcodeScannerHookOptions {
    onScan: (barcode: string) => void;
    minLength?: number;
    timeout?: number;
}

/**
 * Hook to detect barcode scanner input
 * Barcode scanners typically input characters very quickly and end with Enter
 */
export function useBarcodeScanner({
    onScan,
    minLength = 3,
    timeout = 100
}: BarcodeScannerHookOptions) {
    const buffer = useRef<string>('');
    const lastInputTime = useRef<number>(0);
    const timeoutRef = useRef<number>();

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            const currentTime = Date.now();

            // If too much time has passed since last input, reset buffer
            if (currentTime - lastInputTime.current > timeout) {
                buffer.current = '';
            }

            lastInputTime.current = currentTime;

            // Ignore if input is focused (manual typing)
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA'
            )) {
                return;
            }

            // Enter key triggers the scan
            if (e.key === 'Enter') {
                e.preventDefault();
                const scannedCode = buffer.current.trim();

                if (scannedCode.length >= minLength) {
                    console.log('Barcode scanned:', scannedCode);
                    onScan(scannedCode);
                }

                buffer.current = '';
                return;
            }

            // Ignore special keys
            if (e.key.length > 1 && e.key !== 'Enter') {
                return;
            }

            // Add character to buffer
            buffer.current += e.key;

            // Clear buffer after timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                buffer.current = '';
            }, timeout * 3);
        };

        window.addEventListener('keypress', handleKeyPress);

        return () => {
            window.removeEventListener('keypress', handleKeyPress);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [onScan, minLength, timeout]);
}
