const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3005;
const ADMIN_PIN = process.env.ADMIN_PIN || '1770';
const DATA_FILE = path.join(__dirname, 'data.json');
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database PostgreSQL Pool (se configurato su Render / Cloud)
let dbPool = null;
if (DATABASE_URL) {
    console.log('[Database] Rilevato DATABASE_URL, connessione a PostgreSQL in corso...');
    dbPool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
} else {
    console.log('[Database] Nessun DATABASE_URL trovato, uso archiviazione locale su file (data.json).');
}

// Stato iniziale
let state = {
    status: 'registration', // 'registration' | 'drawn'
    participants: [],
    assignments: {} // { [participantId]: targetParticipantId }
};

// Inizializza e carica stato (da PostgreSQL o file)
async function initState() {
    // 1. Prova prima da file locale come baseline
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            state = JSON.parse(raw);
            console.log(`[Storage File] Caricati ${state.participants.length} partecipanti da data.json`);
        }
    } catch (err) {
        console.error('[Storage File] Errore lettura data.json:', err.message);
    }

    // 2. Se è presente PostgreSQL, inizializza la tabella e carica i dati persistenti
    if (dbPool) {
        try {
            await dbPool.query(`
                CREATE TABLE IF NOT EXISTS halloween_state (
                    key VARCHAR(50) PRIMARY KEY,
                    data JSONB NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('[Database] Tabella halloween_state verificata/creata con successo.');

            const res = await dbPool.query('SELECT data FROM halloween_state WHERE key = $1', ['current']);
            if (res.rows.length > 0 && res.rows[0].data) {
                state = res.rows[0].data;
                console.log(`[Database] Stato recuperato da PostgreSQL: ${state.participants.length} partecipanti, stato: ${state.status}`);
            } else {
                console.log('[Database] Nessun dato precedente trovato in PostgreSQL, inizializzo record corrente...');
                await dbPool.query(
                    'INSERT INTO halloween_state (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data',
                    ['current', JSON.stringify(state)]
                );
            }
        } catch (dbErr) {
            console.error('[Database] Errore connessione/inizializzazione PostgreSQL:', dbErr.message);
        }
    }
}

// Salva lo stato in modo asincrono (sia su file che su PostgreSQL)
async function saveState() {
    // Backup su file
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
        console.error('[Storage File] Errore salvataggio data.json:', err.message);
    }

    // Salvataggio permanente su Database PostgreSQL
    if (dbPool) {
        try {
            await dbPool.query(
                `INSERT INTO halloween_state (key, data, updated_at) 
                 VALUES ($1, $2, NOW()) 
                 ON CONFLICT (key) 
                 DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
                ['current', JSON.stringify(state)]
            );
            console.log(`[Database] Stato salvato su PostgreSQL (${state.participants.length} iscritti, status: ${state.status})`);
        } catch (dbErr) {
            console.error('[Database] Errore salvataggio su PostgreSQL:', dbErr.message);
        }
    }
}

// Algoritmo di Catena ad Anello (Hamiltonian Cycle)
// Garantisce al 100% una corrispondenza 1:1 sia per numeri PARI che DISPARI:
// 1. Ognuno fa il regalo a esattamente 1 persona
// 2. Ognuno riceve il regalo da esattamente 1 persona
// 3. Nessuno pesca mai se stesso
function generateDerangement(items) {
    if (items.length < 2) return null;

    // Fisher-Yates shuffle per mescolare in modo equo e casuale
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const map = {};
    for (let i = 0; i < shuffled.length; i++) {
        const nextIndex = (i + 1) % shuffled.length;
        map[shuffled[i].id] = shuffled[nextIndex].id;
    }
    return map;
}

// --- API ENDPOINTS ---

// 1. Stato pubblico (per tutti i telefoni)
app.get('/api/status', (req, res) => {
    res.json({
        status: state.status,
        participantsCount: state.participants.length,
        participants: state.participants.map(p => ({
            id: p.id,
            nome: p.nome,
            cognome: p.cognome
        }))
    });
});

// 2. Registrazione partecipante
app.post('/api/register', async (req, res) => {
    if (state.status !== 'registration') {
        return res.status(400).json({ error: "Le registrazioni sono chiuse: l'estrazione è già avvenuta!" });
    }

    const { nome, cognome, tagliaMaglia, tagliaPantaloni, note, pin } = req.body;

    if (!nome || !cognome || !tagliaMaglia || !tagliaPantaloni || !pin) {
        return res.status(400).json({ error: 'Compila tutti i campi obbligatori, incluso il PIN Personale Segreto.' });
    }

    const trimmedNome = nome.trim();
    const trimmedCognome = cognome.trim();
    const trimmedPin = pin.trim();

    // Controllo duplicati
    const alreadyExists = state.participants.some(
        p => p.nome.toLowerCase() === trimmedNome.toLowerCase() &&
             p.cognome.toLowerCase() === trimmedCognome.toLowerCase()
    );

    if (alreadyExists) {
        return res.status(400).json({ error: `Un partecipante con il nome "${trimmedNome} ${trimmedCognome}" è già registrato!` });
    }

    const newParticipant = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        nome: trimmedNome,
        cognome: trimmedCognome,
        tagliaMaglia: tagliaMaglia.trim(),
        tagliaPantaloni: tagliaPantaloni.trim(),
        note: (note || '').trim(),
        pin: trimmedPin,
        createdAt: new Date().toISOString()
    };

    state.participants.push(newParticipant);
    await saveState();

    res.json({
        success: true,
        participant: {
            id: newParticipant.id,
            nome: newParticipant.nome,
            cognome: newParticipant.cognome
        }
    });
});

// 3. Recupera la propria vittima (solo se l'estrazione è avvenuta e con PIN valido)
app.post('/api/my-victim', (req, res) => {
    if (state.status !== 'drawn') {
        return res.status(400).json({ error: "L'estrazione non è ancora stata avviata dall'amministratore!" });
    }

    const { id, nome, cognome, pin } = req.body;

    let participant = null;
    // 1. Cerca per ID
    if (id) {
        participant = state.participants.find(p => p.id === id);
    }
    // 2. Se non trovato per ID (es. id resettato o obsoleto), cerca per Nome e Cognome
    if (!participant && nome && cognome) {
        participant = state.participants.find(
            p => p.nome.toLowerCase() === nome.trim().toLowerCase() &&
                 p.cognome.toLowerCase() === cognome.trim().toLowerCase()
        );
    }

    if (!participant) {
        return res.status(404).json({ error: 'Partecipante non trovato. Verifica di aver inserito correttamente Nome e Cognome.' });
    }

    // Se l'utente accede dal dispositivo originale con cui si è registrato (id coincide),
    // oppure se non aveva un PIN registrato, consentiamo l'accesso.
    // Altrimenti (accesso manuale da un altro dispositivo o PIN impostato), verifichiamo il PIN.
    const isOwnerDevice = (id && participant.id === id);
    if (!isOwnerDevice && participant.pin) {
        if (!pin || participant.pin !== pin.trim()) {
            return res.status(401).json({ error: 'PIN Personale non corretto! Non puoi sbirciare la vittima di un altro partecipante.' });
        }
    }

    const targetId = state.assignments[participant.id];
    const victim = state.participants.find(p => p.id === targetId);

    if (!victim) {
        return res.status(500).json({ error: 'Vittima non trovata nel sistema. Contatta l’organizzatore.' });
    }

    res.json({
        success: true,
        participant: {
            nome: participant.nome,
            cognome: participant.cognome
        },
        victim: {
            nome: victim.nome,
            cognome: victim.cognome,
            tagliaMaglia: victim.tagliaMaglia,
            tagliaPantaloni: victim.tagliaPantaloni,
            note: victim.note
        }
    });
});

// --- ADMIN ENDPOINTS ---

function checkAdmin(req, res) {
    const { pin } = req.body;
    if (pin !== ADMIN_PIN) {
        res.status(401).json({ error: 'PIN Amministratore non valido!' });
        return false;
    }
    return true;
}

// 4. Verifica PIN Admin & Ottieni lista iscritti con taglie
app.post('/api/admin/data', (req, res) => {
    if (!checkAdmin(req, res)) return;

    res.json({
        status: state.status,
        participantsCount: state.participants.length,
        participants: state.participants // include taglie e note, ma MAI gli abbinamenti
    });
});

// 5. Rimuovi partecipante prima del sorteggio
app.post('/api/admin/remove-participant', async (req, res) => {
    if (!checkAdmin(req, res)) return;
    if (state.status === 'drawn') {
        return res.status(400).json({ error: "Impossibile rimuovere partecipanti dopo che l'estrazione è avvenuta!" });
    }

    const { id } = req.body;
    state.participants = state.participants.filter(p => p.id !== id);
    await saveState();

    res.json({ success: true, participantsCount: state.participants.length });
});

// 6. Esegui il sorteggio (TUTTI PRONTI)
app.post('/api/admin/start-draw', async (req, res) => {
    if (!checkAdmin(req, res)) return;

    if (state.status === 'drawn') {
        return res.status(400).json({ error: "L'estrazione è già stata effettuata!" });
    }

    if (state.participants.length < 3) {
        return res.status(400).json({ error: 'Servono almeno 3 partecipanti registrati per fare l’estrazione!' });
    }

    const assignments = generateDerangement(state.participants);
    if (!assignments) {
        return res.status(500).json({ error: 'Errore durante la generazione dell’abbinamento casuale. Riprova.' });
    }

    state.assignments = assignments;
    state.status = 'drawn';
    await saveState();

    // NOTA: NON restituiamo la mappa degli abbinamenti all'admin!
    // Così l'admin non vede chi è abbinato a chi nemmeno per sbaglio.
    res.json({
        success: true,
        message: `Estrazione completata con successo per ${state.participants.length} persone!`
    });
});

// 7. Recupero SELETTIVO per una singola persona dimenticata
// Visualizza SOLO E SOLTANTO la vittima della persona selezionata, senza rivelare la tabella intera
app.post('/api/admin/recover-single', (req, res) => {
    if (!checkAdmin(req, res)) return;

    if (state.status !== 'drawn') {
        return res.status(400).json({ error: "L'estrazione non è ancora avvenuta." });
    }

    const { participantId } = req.body;
    const participant = state.participants.find(p => p.id === participantId);

    if (!participant) {
        return res.status(404).json({ error: 'Partecipante selezionato non trovato.' });
    }

    res.json({
        success: true,
        giver: `${participant.nome} ${participant.cognome}`,
        userPin: participant.pin || 'Nessun PIN impostato'
    });
});

// 8. Reset completo evento
app.post('/api/admin/reset', async (req, res) => {
    if (!checkAdmin(req, res)) return;

    state = {
        status: 'registration',
        participants: [],
        assignments: {}
    };
    await saveState();

    res.json({ success: true, message: 'Evento azzerato con successo.' });
});

// Fallback su index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Avvio server con inizializzazione stato DB
async function startServer() {
    await initState();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🎃 Server Halloween in ascolto su porta ${PORT}`);
        console.log(`🔐 PIN Amministratore predefinito: ${ADMIN_PIN}`);
    });
}

startServer();
