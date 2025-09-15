document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const statusSpan = document.getElementById('status');
    const messagesDiv = document.getElementById('messages');
    const addCardBtn = document.getElementById('addCardBtn');
    const cardTypeSelect = document.getElementById('cardType');
    const uidInput = document.getElementById('uid');
    const key0bInput = document.getElementById('key0b');
    const key2bInput = document.getElementById('key2b');
    const key6bInput = document.getElementById('key6b');
    const cardListDiv = document.getElementById('cardList');
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');

    let port;
    let reader;
    let keepReading = true;

    async function connectSerial() {
        if ('serial' in navigator) {
            try {
                port = await navigator.serial.requestPort();
                await port.open({ baudRate: 115200 });
                statusSpan.textContent = 'Connesso';
                statusSpan.style.color = '#2ecc71';
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                
                startReading();
                listCards(); // Richiedi la lista delle card all'inizio

            } catch (error) {
                showMessage('Errore di connessione: ' + error.message, 'error');
                statusSpan.textContent = 'Disconnesso';
                statusSpan.style.color = '#e74c3c';
            }
        } else {
            showMessage('Web Serial API non supportata in questo browser.', 'error');
        }
    }

    async function disconnectSerial() {
        if (port) {
            keepReading = false;
            if (reader) {
                await reader.cancel();
            }
            await port.close();
            statusSpan.textContent = 'Disconnesso';
            statusSpan.style.color = '#e74c3c';
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
        }
    }

    async function startReading() {
        while (port && keepReading) {
            reader = port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        break;
                    }
                    const text = new TextDecoder().decode(value).trim();
                    if (text.startsWith('{')) {
                        try {
                            const data = JSON.parse(text);
                            if (data.status) {
                                showMessage(data.message, data.status);
                                listCards();
                            } else if (data.comesteroCards || data.treaCards) {
                                renderCardList(data);
                            } else {
                                console.log(data);
                            }
                        } catch (e) {
                            console.error('Failed to parse JSON:', text);
                        }
                    } else {
                        console.log('Serial:', text);
                    }
                }
            } catch (error) {
                showMessage('Errore di lettura: ' + error.message, 'error');
            } finally {
                reader.releaseLock();
            }
        }
    }

    function sendCommand(command) {
        if (port && port.writable) {
            const writer = port.writable.getWriter();
            writer.write(new TextEncoder().encode(JSON.stringify(command) + '\n'));
            writer.releaseLock();
        } else {
            showMessage('Dispositivo non connesso.', 'error');
        }
    }

    function listCards() {
        sendCommand({ action: 'getCards' });
    }

    function renderCardList(data) {
        let html = '';
        if (data.comesteroCards && data.comesteroCards.length > 0) {
            html += '<h3>Comestero Cards</h3>';
            data.comesteroCards.forEach(card => {
                html += `
                    <div class="card-item">
                        <span>UID: ${card.uid} | KEY 0B: ${card.key0B} | KEY 2B: ${card.key2B}</span>
                        <button onclick="deleteCard('comestero', '${card.uid}')">Elimina</button>
                    </div>
                `;
            });
        }
        if (data.treaCards && data.treaCards.length > 0) {
            html += '<h3>Trea Cards</h3>';
            data.treaCards.forEach(card => {
                html += `
                    <div class="card-item">
                        <span>UID: ${card.uid} | KEY 6B: ${card.key6B}</span>
                        <button onclick="deleteCard('trea', '${card.uid}')">Elimina</button>
                    </div>
                `;
            });
        }
        if (html === '') {
            html = '<p>Nessuna card salvata.</p>';
        }
        cardListDiv.innerHTML = html;
    }

    window.deleteCard = (type, uid) => {
        if (confirm(`Sei sicuro di voler eliminare la card con UID ${uid}?`)) {
            sendCommand({ action: 'deleteCard', type, uid });
        }
    };
    
    function showMessage(msg, type) {
        messagesDiv.textContent = msg;
        messagesDiv.className = `messages ${type}`;
        messagesDiv.style.display = 'block';
        setTimeout(() => {
            messagesDiv.style.display = 'none';
        }, 5000);
    }

    cardTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'comestero') {
            document.querySelectorAll('.comestero-fields').forEach(el => el.style.display = 'block');
            document.querySelectorAll('.trea-fields').forEach(el => el.style.display = 'none');
        } else {
            document.querySelectorAll('.comestero-fields').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.trea-fields').forEach(el => el.style.display = 'block');
        }
    });

    addCardBtn.addEventListener('click', () => {
        const type = cardTypeSelect.value;
        const uid = uidInput.value.trim().toUpperCase();
        if (!uid || uid.length !== 8) {
            showMessage('UID non valido. Deve essere di 8 caratteri esadecimali.', 'error');
            return;
        }

        if (type === 'comestero') {
            const key0B = key0bInput.value.trim().toUpperCase();
            const key2B = key2bInput.value.trim().toUpperCase();
            if (!key0B || key0B.length !== 12 || !key2B || key2B.length !== 12) {
                showMessage('KEY 0B e KEY 2B devono essere di 12 caratteri esadecimali.', 'error');
                return;
            }
            sendCommand({ action: 'addComesteroCard', uid, key0B, key2B });
        } else if (type === 'trea') {
            const key6B = key6bInput.value.trim().toUpperCase();
            if (!key6B || key6B.length !== 12) {
                showMessage('KEY 6B deve essere di 12 caratteri esadecimali.', 'error');
                return;
            }
            sendCommand({ action: 'addTreaCard', uid, key6B });
        }
        // Pulisci i campi input
        uidInput.value = '';
        key0bInput.value = '';
        key2bInput.value = '';
        key6bInput.value = '';
    });

    exportBtn.addEventListener('click', () => {
        if (port) {
            sendCommand({ action: 'getCards' });
            // Ascolta la risposta per creare il file
            const tempReader = port.readable.getReader();
            let receivedData = '';
            const readChunk = async () => {
                const { value, done } = await tempReader.read();
                const text = new TextDecoder().decode(value);
                receivedData += text;
                if (!done) {
                    await readChunk();
                } else {
                    try {
                        const data = JSON.parse(receivedData.trim());
                        const jsonString = JSON.stringify(data, null, 2);
                        const blob = new Blob([jsonString], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'cards.json';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showMessage('File cards.json esportato con successo!', 'success');
                    } catch (e) {
                        showMessage('Errore nell\'esportazione del file.', 'error');
                    } finally {
                        tempReader.releaseLock();
                    }
                }
            };
            readChunk();
        } else {
            showMessage('Connettiti al dispositivo prima di esportare.', 'error');
        }
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.comesteroCards && data.treaCards) {
                    // Prepara i comandi per l'importazione
                    // Nota: Per l'importazione, il firmware deve essere ri-flashato con il file system, quindi questa funzione non è immediata via WebSerial.
                    // Sarà necessario copiare il contenuto del file .json nella cartella 'data' e caricarlo tramite il plugin.
                    showMessage('Funzione di importazione via WebSerial non supportata direttamente per motivi di sicurezza e stabilità. Si prega di caricare il file cards.json tramite il plugin "ESP32 Sketch Data Upload" dopo averlo inserito nella cartella "data" del progetto.', 'info');
                } else {
                    showMessage('Il file selezionato non è un file JSON di card valido.', 'error');
                }
            } catch (error) {
                showMessage('Errore durante la lettura del file JSON.', 'error');
            }
        };
        reader.readAsText(file);
    });

    connectBtn.addEventListener('click', connectSerial);
    disconnectBtn.addEventListener('click', disconnectSerial);
});
