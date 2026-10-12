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

        if (data.status === 'drawn') {
            // Se il sorteggio è avvenuto, proviamo a recuperare la vittima
            const gotVictim = await fetchMyVictim();
            if (gotVictim) return;
        }

        // Se non è ancora avvenuto o non è stato ancora associato
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
            chip.textContent = `${p.nome} ${p.cognome}`;
            waitListChips.appendChild(chip);
        });
    }
}

// RECUPERA LA PROPRIA VITTIMA
async function fetchMyVictim() {
    try {
        const payload = {};
        if (currentParticipant.id) payload.id = currentParticipant.id;
        else if (currentParticipant.nome && currentParticipant.cognome) {
            payload.nome = currentParticipant.nome;
            payload.cognome = currentParticipant.cognome;
        } else {
            return false;
        }

        if (currentParticipant.pin) {
            payload.pin = currentParticipant.pin;
        }

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
        } else if (res.status === 401) {
            return { error: data.error || 'PIN Personale non corretto!' };
        }
        return false;
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

// GESTIONE REGISTRAZIONE
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.classList.add('hidden');

    const pinVal = regPin.value.trim();
    if (!pinVal) {
        registerError.textContent = 'Inserisci un PIN personale segreto.';
        registerError.classList.remove('hidden');
        return;
    }

    const payload = {
        nome: regNome.value.trim(),
        cognome: regCognome.value.trim(),
        tagliaMaglia: regMaglia.value,
        tagliaPantaloni: regPantaloni.value.trim(),
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

    currentParticipant.nome = nome;
    currentParticipant.cognome = cognome;
    currentParticipant.pin = pinVal;
    currentParticipant.id = null; // Cerchiamo per nome, cognome e PIN

    const result = await fetchMyVictim();
    if (result === true) {
        // Salviamo se valido
        localStorage.setItem('hw_participant_nome', nome);
        localStorage.setItem('hw_participant_cognome', cognome);
        localStorage.setItem('hw_participant_pin', pinVal);
        return;
    } else if (result && result.error) {
        lookupError.textContent = result.error;
        lookupError.classList.remove('hidden');
        return;
    }

    // Se l'estrazione non è ancora avvenuta, verifichiamo che esista nei partecipanti
    const statusRes = await fetch('/api/status');
    const statusData = await statusRes.json();

    const exists = statusData.participants.some(
        p => p.nome.toLowerCase() === nome.toLowerCase() && p.cognome.toLowerCase() === cognome.toLowerCase()
    );

    if (exists) {
        localStorage.setItem('hw_participant_nome', nome);
        localStorage.setItem('hw_participant_cognome', cognome);
        localStorage.setItem('hw_participant_pin', pinVal);
        updateWaitingScreen(statusData);
        showScreen(screenWaiting);
    } else {
        lookupError.textContent = 'Nessun partecipante trovato con questo Nome e Cognome. Controlla e riprova.';
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

// ANIMAZIONE CARTA 3D
btnFlipReveal.addEventListener('click', () => {
    victimFlipCard.classList.add('is-flipped');
});

btnFlipHide.addEventListener('click', () => {
    victimFlipCard.classList.remove('is-flipped');
});

// Avvia all'apertura della pagina
initApp();
