const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        backgroundColor: "#000000",
        webPreferences: {
            contextIsolation: true,
        },
    });

    const startUrl =
        process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : `file://${path.join(__dirname, "build/index.html")}`;

    // Wait until React is ready
    setTimeout(() => {
        win.loadURL(startUrl);
    }, 3000);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
}