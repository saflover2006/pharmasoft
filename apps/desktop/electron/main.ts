import { app, BrowserWindow, Menu, globalShortcut, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs'
import path from 'path'
import { pathToFileURL } from 'node:url'

// Disable Chrome's built‑in Help (F1) feature
app.commandLine.appendSwitch('disable-features', 'Help')

// Disable default menu (fixes F1 opening browser help)
Menu.setApplicationMenu(null)

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
let backendModulePromise: Promise<typeof import('../server/index.ts')> | null = null

function toSqliteFileUrl(filePath: string) {
    return `file:${path.resolve(filePath).replace(/\\/g, '/')}`
}

function resolveDevelopmentDatabasePath() {
    return path.resolve(app.getAppPath(), '../../packages/database/prisma/dev.db')
}

function resolvePackagedDatabasePath() {
    return path.join(app.getPath('userData'), 'pharmasoft.db')
}

function resolvePackagedDatabaseTemplatePath() {
    return path.join(process.resourcesPath, 'database', 'template.db')
}

function ensureDatabaseUrl() {
    if (process.env.DATABASE_URL) {
        return
    }

    if (!app.isPackaged) {
        process.env.DATABASE_URL = toSqliteFileUrl(resolveDevelopmentDatabasePath())
        return
    }

    const databasePath = resolvePackagedDatabasePath()
    const databaseDirectory = path.dirname(databasePath)
    const templatePath = resolvePackagedDatabaseTemplatePath()

    fs.mkdirSync(databaseDirectory, { recursive: true })

    if (!fs.existsSync(databasePath)) {
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Database template not found at ${templatePath}`)
        }

        fs.copyFileSync(templatePath, databasePath)
    }

    process.env.DATABASE_URL = toSqliteFileUrl(databasePath)
}

async function getBackendModule() {
    ensureDatabaseUrl()
    backendModulePromise ??= import('../server/index.ts')
    return backendModulePromise
}

async function startBackend() {
    const backend = await getBackendModule()
    return backend.startServer()
}

async function stopBackend() {
    if (!backendModulePromise) {
        return
    }

    const backend = await backendModulePromise
    return backend.stopServer()
}

ipcMain.removeHandler('shell:openExternal')
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url)
})

function sendShortcut(key: string) {
    console.log('Sending shortcut:', key)
    win?.webContents.executeJavaScript(`
        console.log('Shortcut received in renderer:', '${key}');
        window.dispatchEvent(new CustomEvent('electron-shortcut', { detail: '${key}' }));
    `)
}

function registerShortcuts() {
    globalShortcut.unregisterAll()

    const f1 = globalShortcut.register('F1', () => {
        console.log('F1 global shortcut triggered!')
        sendShortcut('F1')
    })
    const f2 = globalShortcut.register('F2', () => {
        console.log('F2 global shortcut triggered!')
        sendShortcut('F2')
    })
    const f3 = globalShortcut.register('F3', () => {
        console.log('F3 global shortcut triggered!')
        sendShortcut('F3')
    })

    console.log('Shortcut registration results: F1=' + f1 + ', F2=' + f2 + ', F3=' + f3)

    if (!f1 || !f2 || !f3) {
        dialog.showErrorBox('Shortcut Registration Failed',
            'Could not register F1/F2/F3 shortcuts. ' +
            'Another application may be using these keys.\n\n' +
            'F1: ' + (f1 ? 'OK' : 'FAILED') + '\n' +
            'F2: ' + (f2 ? 'OK' : 'FAILED') + '\n' +
            'F3: ' + (f3 ? 'OK' : 'FAILED'))
    }
}

function createWindow() {
    win = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: true,  // Start in fullscreen mode
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    win.setMenu(null)
    win.setMenuBarVisibility(false)
    win.setFullScreen(true)  // Force fullscreen
    win.webContents.openDevTools(); // Enable DevTools for debugging

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(process.env.DIST || __dirname, 'index.html'))
    }

    // Intercept keyboard events at webContents level
    win.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return

        if (input.key === 'F1' || input.key === 'F2' || input.key === 'F3') {
            console.log('before-input-event intercepted:', input.key)
            event.preventDefault()
            sendShortcut(input.key)
        }

        // F11 to toggle fullscreen
        if (input.key === 'F11') {
            event.preventDefault()
            const isFullScreen = win?.isFullScreen()
            win?.setFullScreen(!isFullScreen)
        }
    })

    win.on('focus', () => registerShortcuts())
    win.on('blur', () => globalShortcut.unregisterAll())
}

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll()
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('before-quit', () => {
    globalShortcut.unregisterAll()
    stopBackend().catch((error) => {
        console.error('Failed to stop backend server:', error)
    })
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(async () => {
    try {
        await startBackend()
    } catch (error) {
        dialog.showErrorBox(
            'Backend Startup Failed',
            `PharmaSOFT could not start its local API server.\n\n${error instanceof Error ? error.message : String(error)}`
        )
        app.quit()
        return
    }

    registerShortcuts()
    createWindow()
})
