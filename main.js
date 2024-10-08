const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  globalShortcut,
} = require("electron");
const path = require("path");
const { menubar } = require("menubar");
const WordPress = require("./wordpress");
const db = require("./database");

let wp;

const mb = menubar({
  /*
   * I don't have an icon yet, but leaving this here as a reminder.
   * icon: path.join(__dirname, "icon.png"),
   */
  index: `file://${__dirname}/index.html`,
  browserWindow: {
    width: 400,
    height: 500,
    frame: false,
    transparent: true,
  },
});

mb.on("ready", () => {
  console.log("PressThat is ready!");

  // Register global shortcut
  const shortcut =
    process.platform === "darwin" ? "Command+Shift+P" : "Ctrl+Shift+P";
  globalShortcut.register(shortcut, () => {
    if (mb.window && mb.window.isVisible()) {
      mb.hideWindow();
    } else {
      mb.showWindow();
    }
  });
});

ipcMain.handle(
  "test-and-save-connection",
  async (event, { siteUrl, username, password }) => {
    wp = new WordPress(siteUrl, username, password);
    const connected = await wp.testConnection();
    if (connected) {
      await db.saveCredentials(siteUrl, username, password);
    }
    return connected;
  }
);

ipcMain.handle("get-credentials", async () => {
  return db.getCredentials();
});

ipcMain.handle("open-external", async (event, url) => {
  await shell.openExternal(url);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  // Unregister the global shortcut when the app is about to quit
  globalShortcut.unregisterAll();
});
