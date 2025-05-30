
# ESP32-C3 Web Flasher

Questa repo contiene una pagina web per flashare automaticamente il tuo ESP32-C3 usando **ESP Web Tools** e la **Web Serial API**, protetta da password.

## File inclusi

- **index.html** – interfaccia utente con tema scuro, overlay di login, logo e changelog.
- **manifest.json** – definizione del firmware (`firmware.bin`).
- **log.png** – logo del progetto.
- **firmware.bin** – file binario unificato (bootloader + partizioni + app).
- **.gitignore** – esclude `firmware.bin` se non vuoi tenerlo in repo.
- **README.md** – questa documentazione.

## Password

La password per accedere all'interfaccia è **Maco2025**.

## Deploy su GitHub Pages

1. Crea un nuovo repository su GitHub.
2. Clona il repo e copia i file nella cartella locale.
3. `git add . && git commit -m "Initial commit" && git push origin main`
4. Vai su **Settings → Pages**, seleziona branch `main` e cartella `root`.
5. Apri l'URL generato (`https://<tuo-username>.github.io/esp32-web-flasher/`).
