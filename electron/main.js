const { app, BrowserWindow } = require('electron')
const serve = require('electron-serve')
const fs = require('fs')
const path = require('path')

const loadURL = serve({ directory: 'dist' })

function log(msg) {
  const logPath = path.join(app.getPath('userData'), 'lab-to-go.log')
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`)
}

function createWindow() {
  log('App starting, creating window...')
  log('App path: ' + app.getAppPath())

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.webContents.on('did-fail-load', (_event, code, desc) => {
    log(`Page failed to load: ${code} ${desc}`)
  })

  loadURL(win)
    .then(() => {
      log('Page loaded successfully')
      win.show()
    })
    .catch(err => {
      log('Failed to load: ' + err)
      win.show()
    })
}

app.whenReady().then(createWindow).catch(err => log('App ready error: ' + err))

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  app.exit(0)
})
