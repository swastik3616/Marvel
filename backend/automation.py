import subprocess
import os

ALLOWED_APPS = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "browser": "start chrome",
    "explorer": "explorer.exe",
}

def open_app(app_name: str) -> str:
    app = ALLOWED_APPS.get(app_name.lower())
    if app:
        subprocess.Popen(app, shell=True)
        return f"Opening {app_name}"
    return f"App '{app_name}' is not in the allowed list."