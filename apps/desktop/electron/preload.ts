import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    onShortcut: (callback: (command: string) => void) => {
        ipcRenderer.on('shortcut:f1', () => callback('F1'))
        ipcRenderer.on('shortcut:f2', () => callback('F2'))
        ipcRenderer.on('shortcut:f3', () => callback('F3'))
    },
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
})
