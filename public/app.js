// STATO LOCALE PARTECIPANTE
let currentParticipant = {
    id: localStorage.getItem('hw_participant_id') || null,
    nome: localStorage.getItem('hw_participant_nome') || null,
    cognome: localStorage.getItem('hw_participant_cognome') || null,
    pin: localStorage.getItem('hw_participant_pin') || null
};

let pollingInterval = null;

// DOM ELEMENTS
const screenRegister = document.getElementById('screen-register');
const screenLookup = document.getElementById('screen-lookup');
const screenWaiting = document.getElementById('screen-waiting');
const screenReveal = document.getElementById('screen-reveal');

// Registrazione
const registerForm = document.getElementById('register-form');
const regNome = document.getElementById('reg-nome');
const regCognome = document.getElementById('reg-cognome');
const regMaglia = document.getElementById('reg-maglia');
const regPantaloni = document.getElementById('reg-pantaloni');
const regNote = document.getElementById('reg-note');
const regPin = document.getElementById('reg-pin');
const registerError = document.getElementById('register-error');
const btnShowLookup = document.getElementById('btn-show-lookup');

// Lookup
const lookupForm = document.getElementById('lookup-form');
const lookupNome = document.getElementById('lookup-nome');
const lookupCognome = document.getElementById('lookup-cognome');
const lookupPin = document.getElementById('lookup-pin');
const lookupError = document.getElementById('lookup-error');
const btnBackToReg = document.getElementById('btn-back-to-reg');

// Sala d'attesa
const waitPlayerName = document.getElementById('wait-player-name');
const waitCount = document.getElementById('wait-count');
const waitListChips = document.getElementById('wait-list-chips');
const btnRefreshStatus = document.getElementById('btn-refresh-status');

// Rivelazione
const victimFlipCard = document.getElementById('victim-flip-card');
const btnFlipReveal = document.getElementById('btn-flip-reveal');
const btnFlipHide = document.getElementById('btn-flip-hide');
const victimFullname = document.getElementById('victim-fullname');
const victimMaglia = document.getElementById('victim-maglia');
const victimPantaloni = document.getElementById('victim-pantaloni');
const victimNote = document.getElementById('victim-note');

// CAMBIO SCHERMATA
function showScreen(screen) {
    [screenRegister, screenLookup, screenWaiting, screenReveal].forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    screen.classList.remove('hidden');
    screen.classList.add('active');
}

// INIZIALIZZAZIONE APP
async function initApp() {
    // Se l'utente ha già salvato i suoi dati, verifichiamo lo stato attuale
    if (currentParticipant.id || (currentParticipant.nome && currentParticipant.cognome)) {
        await checkCurrentStatus();
    } else {
        showScreen(screenRegister);
        await checkGeneralStatus();
    }

    startPolling();
}

// Controlla lo stato generale e lo stato dell'utente
async function checkCurrentStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();

        // 1. Se il sorteggio è avvenuto, proviamo a recuperare la vittima
        if (data.status === 'drawn') {
            const gotVictim = await fetchMyVictim();
            if (gotVictim === true) return;
        }

        // 2. Se siamo ancora in fase di registrazione, verifichiamo che l'utente esista DAVVERO sul server!
        const existsOnServer = data.participants && data.participants.some(p => 
            (currentParticipant.id && p.id === currentParticipant.id) ||
            (currentParticipant.nome && currentParticipant.cognome &&
             p.nome.toLowerCase() === currentParticipant.nome.toLowerCase() &&
             p.cognome.toLowerCase() === currentParticipant.cognome.toLowerCase())
        );

        if (!existsOnServer && data.status === 'registration') {
            // Se non siamo presenti sul server ma abbiamo dati salvati, precompiliamo il form senza cancellare nulla
            if (currentParticipant.nome && regNome) regNome.value = currentParticipant.nome;
            if (currentParticipant.cognome && regCognome) regCognome.value = currentParticipant.cognome;
            if (currentParticipant.pin && regPin) regPin.value = currentParticipant.pin;

            showScreen(screenRegister);
            await checkGeneralStatus();
            return;
        }

        // Se l'utente è realmente iscritto sul server, mostriamo la sala d'attesa
        updateWaitingScreen(data);
        showScreen(screenWaiting);
    } catch (err) {
        console.error('Errore nel controllo dello stato:', err);
    }
}

// Controlla lo stato per la schermata di registrazione
async function checkGeneralStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();

        if (data.status === 'drawn') {
            registerError.textContent = "L'estrazione è già avvenuta! Se ti eri già iscritto, usa il link qui sotto per recuperare la tua carta.";
            registerError.classList.remove('hidden');
            document.getElementById('btn-submit-reg').disabled = true;
            document.getElementById('btn-submit-reg').style.opacity = '0.5';
        }
    } catch (err) {
        console.error(err);
    }
}

// AGGIORNA SALA D'ATTESA
function updateWaitingScreen(data) {
    if (currentParticipant.nome) {
        waitPlayerName.textContent = `${currentParticipant.nome}`;
    }
    waitCount.textContent = data.participantsCount || 0;

    waitListChips.innerHTML = '';
    if (data.participants && data.participants.length > 0) {
        data.participants.forEach(p => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.innerHTML = `<span>👻</span> ${escapeHtml(p.nome)} ${escapeHtml(p.cognome)}`;
            waitListChips.appendChild(chip);
        });
    }

    const waitBadge = document.getElementById('wait-badge');
    const waitDrawnActionBox = document.getElementById('wait-drawn-action-box');
    const waitSubTip = document.getElementById('wait-sub-tip');

    if (data.status === 'drawn') {
        if (waitBadge) {
            waitBadge.textContent = '🎉 IL SORTEGGIO È STATO EFFETTUATO!';
            waitBadge.style.color = '#39ff14';
            waitBadge.style.borderColor = '#39ff14';
            waitBadge.style.background = 'rgba(57, 255, 20, 0.2)';
        }
        if (waitDrawnActionBox) {
            waitDrawnActionBox.classList.remove('hidden');
        }
        if (waitSubTip) {
            waitSubTip.textContent = 'Tocca il pulsante sopra per scoprire chi hai pescato!';
            waitSubTip.style.color = '#ff8533';
            waitSubTip.style.fontWeight = 'bold';
        }
    } else {
        if (waitBadge) {
            waitBadge.textContent = "In attesa che l'organizzatore dia il via...";
            waitBadge.style.color = '#df9eff';
            waitBadge.style.borderColor = 'var(--spooky-purple)';
            waitBadge.style.background = 'rgba(157, 0, 255, 0.25)';
        }
        if (waitDrawnActionBox) {
            waitDrawnActionBox.classList.add('hidden');
        }
    }
}

// RECUPERA LA PROPRIA VITTIMA
async function fetchMyVictim() {
    try {
        const payload = {
            id: currentParticipant.id,
            nome: currentParticipant.nome,
            cognome: currentParticipant.cognome,
            pin: currentParticipant.pin
        };

        const res = await fetch('/api/my-victim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            // Popola i dati della carta
            victimFullname.textContent = `${data.victim.nome} ${data.victim.cognome}`;
            victimMaglia.textContent = data.victim.tagliaMaglia;
            victimPantaloni.textContent = data.victim.tagliaPantaloni;
            victimNote.textContent = data.victim.note || 'Nessuna preferenza specificata';

            showScreen(screenReveal);
            return true;
        } else {
            const waitErrorBox = document.getElementById('wait-error-box');
            if (waitErrorBox) {
                waitErrorBox.textContent = data.error || 'Errore durante lo sblocco.';
                waitErrorBox.classList.remove('hidden');
            }
            return { error: data.error };
        }
    } catch (err) {
        console.error('Errore fetch my victim:', err);
        return false;
    }
}

// POLLING PERIODICO (ogni 3.5 secondi)
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();

            // Se siamo in sala d'attesa, aggiorniamo contatori e lista
            if (screenWaiting.classList.contains('active')) {
                // Se il server è in fase di registrazione ma noi non siamo nell'elenco (es. dopo un reset)
                const exists = data.participants && data.participants.some(p =>
                    (currentParticipant.id && p.id === currentParticipant.id) ||
                    (currentParticipant.nome && currentParticipant.cognome &&
                     p.nome.toLowerCase() === currentParticipant.nome.toLowerCase() &&
                     p.cognome.toLowerCase() === currentParticipant.cognome.toLowerCase())
                );

                if (!exists && data.status === 'registration') {
                    if (currentParticipant.nome && regNome) regNome.value = currentParticipant.nome;
                    if (currentParticipant.cognome && regCognome) regCognome.value = currentParticipant.cognome;
                    if (currentParticipant.pin && regPin) regPin.value = currentParticipant.pin;
                    showScreen(screenRegister);
                    await checkGeneralStatus();
                    return;
                }

                updateWaitingScreen(data);

                // Se l'admin ha cliccato "PRONTO" e lo stato è passato a 'drawn'
                if (data.status === 'drawn') {
                    await fetchMyVictim();
                }
            }
        } catch (err) {
            console.error('Errore polling:', err);
        }
    }, 3500);
}

// Gestione Selezione Taglia Maglia tramite Chips
const sizeChips = document.querySelectorAll('.size-chip');
sizeChips.forEach(chip => {
    chip.addEventListener('click', () => {
        sizeChips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        regMaglia.value = chip.dataset.val;
    });
});

// GESTIONE REGISTRAZIONE
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.classList.add('hidden');

    if (!regMaglia.value) {
        registerError.textContent = 'Seleziona la tua taglia di maglia/felpa toccando una delle opzioni.';
        registerError.classList.remove('hidden');
        return;
    }

    if (!regPantaloni.value) {
        registerError.textContent = 'Seleziona la tua taglia italiana di pantaloni dal menu.';
        registerError.classList.remove('hidden');
        return;
    }

    const pinVal = regPin.value.trim();
    if (!pinVal) {
        registerError.textContent = 'Inserisci un PIN personale segreto per proteggere la tua carta.';
        registerError.classList.remove('hidden');
        return;
    }

    const payload = {
        nome: regNome.value.trim(),
        cognome: regCognome.value.trim(),
        tagliaMaglia: regMaglia.value,
        tagliaPantaloni: regPantaloni.value,
        note: regNote.value.trim(),
        pin: pinVal
    };

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            registerError.textContent = data.error || 'Errore durante la registrazione.';
            registerError.classList.remove('hidden');
            return;
        }

        // Salvataggio stato locale
        currentParticipant.id = data.participant.id;
        currentParticipant.nome = data.participant.nome;
        currentParticipant.cognome = data.participant.cognome;
        currentParticipant.pin = pinVal;

        localStorage.setItem('hw_participant_id', currentParticipant.id);
        localStorage.setItem('hw_participant_nome', currentParticipant.nome);
        localStorage.setItem('hw_participant_cognome', currentParticipant.cognome);
        localStorage.setItem('hw_participant_pin', currentParticipant.pin);

        await checkCurrentStatus();
    } catch (err) {
        registerError.textContent = 'Errore di connessione al server.';
        registerError.classList.remove('hidden');
    }
});

// GESTIONE RECUPERO UTENTE GIÀ REGISTRATO
lookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    lookupError.classList.add('hidden');

    const nome = lookupNome.value.trim();
    const cognome = lookupCognome.value.trim();
    const pinVal = lookupPin.value.trim();

    if (!pinVal) {
        lookupError.textContent = 'Inserisci il PIN Personale che hai scelto all\'iscrizione.';
        lookupError.classList.remove('hidden');
        return;
    }

    try {
        // 1. Verifichiamo credenziali con il server (funziona sia prima che dopo il sorteggio)
        const res = await fetch('/api/verify-participant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, cognome, pin: pinVal })
        });

        const data = await res.json();

        if (!res.ok) {
            lookupError.textContent = data.error || 'Credenziali non valide.';
            lookupError.classList.remove('hidden');
            return;
        }

        // Credenziali corrette! Salviamo nel localStorage
        currentParticipant.id = data.participant.id;
        currentParticipant.nome = data.participant.nome;
        currentParticipant.cognome = data.participant.cognome;
        currentParticipant.pin = pinVal;

        localStorage.setItem('hw_participant_id', data.participant.id);
        localStorage.setItem('hw_participant_nome', data.participant.nome);
        localStorage.setItem('hw_participant_cognome', data.participant.cognome);
        localStorage.setItem('hw_participant_pin', pinVal);

        // Se l'estrazione è già avvenuta, sveliamo la carta
        if (data.status === 'drawn') {
            await fetchMyVictim();
        } else {
            // Se siamo ancora in attesa del via dell'organizzatore, mostriamo la sala d'attesa!
            const statusRes = await fetch('/api/status');
            const statusData = await statusRes.json();
            updateWaitingScreen(statusData);
            showScreen(screenWaiting);
        }
    } catch (err) {
        lookupError.textContent = 'Errore di connessione al server.';
        lookupError.classList.remove('hidden');
    }
});

// Navigazione tra registrazione e lookup
btnShowLookup.addEventListener('click', () => {
    showScreen(screenLookup);
});

btnBackToReg.addEventListener('click', () => {
    showScreen(screenRegister);
});

btnRefreshStatus.addEventListener('click', async () => {
    await checkCurrentStatus();
});

const btnManualUnlock = document.getElementById('btn-manual-unlock');
if (btnManualUnlock) {
    btnManualUnlock.addEventListener('click', async () => {
        const res = await fetchMyVictim();
        if (res && res.error) {
            alert(res.error + "\n\nTi reindirizzo alla schermata di accesso per reinserire i tuoi dati e il PIN.");
            showScreen(screenLookup);
        }
    });
}


// ANIMAZIONE CARTA 3D
btnFlipReveal.addEventListener('click', () => {
    victimFlipCard.classList.add('is-flipped');
});

btnFlipHide.addEventListener('click', () => {
    victimFlipCard.classList.remove('is-flipped');
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// Avvia all'apertura della pagina
initApp();
