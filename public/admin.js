let currentAdminPin = sessionStorage.getItem('hw_admin_pin') || '';

// DOM ELEMENTS
const adminLoginScreen = document.getElementById('admin-login-screen');
const adminDashboardScreen = document.getElementById('admin-dashboard-screen');
const adminLoginForm = document.getElementById('admin-login-form');
const adminPinInput = document.getElementById('admin-pin-input');
const adminLoginError = document.getElementById('admin-login-error');

const adminStatusBadge = document.getElementById('admin-status-badge');
const adminCount = document.getElementById('admin-count');
const btnAdminRefresh = document.getElementById('btn-admin-refresh');
const adminDrawNotice = document.getElementById('admin-draw-notice');
const adminDrawActions = document.getElementById('admin-draw-actions');
const btnStartDraw = document.getElementById('btn-start-draw');
const drawReqTip = document.getElementById('draw-req-tip');
const adminParticipantsTbody = document.getElementById('admin-participants-tbody');

// Recovery
const recoveryNotDrawnMsg = document.getElementById('recovery-not-drawn-msg');
const recoveryActiveBox = document.getElementById('recovery-active-box');
const recoverySelectUser = document.getElementById('recovery-select-user');
const btnRequestRecover = document.getElementById('btn-request-recover');

// Modal
const recoveryModal = document.getElementById('recovery-modal');
const modalGiverName = document.getElementById('modal-giver-name');
const modalVictimFullname = document.getElementById('modal-victim-fullname');
const modalVictimMaglia = document.getElementById('modal-victim-maglia');
const modalVictimPantaloni = document.getElementById('modal-victim-pantaloni');
const modalVictimNote = document.getElementById('modal-victim-note');
const blurZone = document.getElementById('blur-zone');
const blurOverlayBtn = document.getElementById('blur-overlay-btn');
const btnCloseModal = document.getElementById('btn-close-modal');

// Reset
const btnAdminReset = document.getElementById('btn-admin-reset');

// INIZIALIZZAZIONE
async function initAdmin() {
    if (currentAdminPin) {
        const ok = await loadAdminDashboard();
        if (ok) {
            showScreen(adminDashboardScreen);
            return;
        }
    }
    showScreen(adminLoginScreen);
}

function showScreen(screen) {
    adminLoginScreen.classList.remove('active');
    adminLoginScreen.classList.add('hidden');
    adminDashboardScreen.classList.remove('active');
    adminDashboardScreen.classList.add('hidden');

    screen.classList.remove('hidden');
    screen.classList.add('active');
}

// LOGIN ADMIN
adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminLoginError.classList.add('hidden');
    const pin = adminPinInput.value.trim();

    try {
        const res = await fetch('/api/admin/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });

        if (!res.ok) {
            adminLoginError.textContent = 'PIN non corretto. Riprova.';
            adminLoginError.classList.remove('hidden');
            return;
        }

        currentAdminPin = pin;
        sessionStorage.setItem('hw_admin_pin', pin);
        await loadAdminDashboard();
        showScreen(adminDashboardScreen);
    } catch (err) {
        adminLoginError.textContent = 'Errore di connessione al server.';
        adminLoginError.classList.remove('hidden');
    }
});

// CARICAMENTO DATI DASHBOARD
async function loadAdminDashboard() {
    try {
        const res = await fetch('/api/admin/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: currentAdminPin })
        });

        if (!res.ok) {
            sessionStorage.removeItem('hw_admin_pin');
            showScreen(adminLoginScreen);
            return false;
        }

        const data = await res.json();
        renderDashboard(data);
        return true;
    } catch (err) {
        console.error('Errore caricamento dashboard:', err);
        return false;
    }
}

// RENDER DASHBOARD
function renderDashboard(data) {
    adminCount.textContent = data.participantsCount;

    const isDrawn = data.status === 'drawn';

    // Badge di stato
    if (isDrawn) {
        adminStatusBadge.textContent = '🔮 SORTEGGIO COMPLETATO';
        adminStatusBadge.style.color = '#ff6a00';
        adminStatusBadge.style.borderColor = '#ff6a00';
        adminStatusBadge.style.background = 'rgba(255, 106, 0, 0.15)';

        adminDrawNotice.classList.remove('hidden');
        adminDrawActions.classList.add('hidden');

        // Attiva recupero mirato
        recoveryNotDrawnMsg.classList.add('hidden');
        recoveryActiveBox.classList.remove('hidden');
        populateRecoverySelect(data.participants);
    } else {
        adminStatusBadge.textContent = '📝 REGISTRAZIONI APERTE';
        adminStatusBadge.style.color = '#39ff14';
        adminStatusBadge.style.borderColor = '#39ff14';
        adminStatusBadge.style.background = 'rgba(57, 255, 20, 0.15)';

        adminDrawNotice.classList.add('hidden');
        adminDrawActions.classList.remove('hidden');

        // Disabilita tasto se < 3 partecipanti
        if (data.participantsCount >= 3) {
            btnStartDraw.disabled = false;
            btnStartDraw.style.opacity = '1';
            drawReqTip.textContent = `✅ Pronti all'estrazione! ${data.participantsCount} persone registrate.`;
            drawReqTip.style.color = '#39ff14';
        } else {
            btnStartDraw.disabled = true;
            btnStartDraw.style.opacity = '0.5';
            drawReqTip.textContent = `⚠️ Servono almeno 3 partecipanti (attualmente: ${data.participantsCount}).`;
            drawReqTip.style.color = '#ff9999';
        }

        recoveryNotDrawnMsg.classList.remove('hidden');
        recoveryActiveBox.classList.add('hidden');
    }

    // Tabella partecipanti
    renderParticipantsTable(data.participants, isDrawn);
}

// POPOLA TABELLA PARTECIPANTI (senza mostrare abbinamenti per zero spoiler)
function renderParticipantsTable(participants, isDrawn) {
    adminParticipantsTbody.innerHTML = '';

    if (!participants || participants.length === 0) {
        adminParticipantsTbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 20px; color: #888;">Nessun partecipante ancora registrato</td></tr>';
        return;
    }

    participants.forEach(p => {
        const tr = document.createElement('tr');

        // Nome
        const tdName = document.createElement('td');
        tdName.innerHTML = `<strong>${escapeHtml(p.nome)} ${escapeHtml(p.cognome)}</strong>`;
        tr.appendChild(tdName);

        // Maglia
        const tdMaglia = document.createElement('td');
        tdMaglia.innerHTML = `<span class="highlight">${escapeHtml(p.tagliaMaglia)}</span>`;
        tr.appendChild(tdMaglia);

        // Pantaloni
        const tdPantaloni = document.createElement('td');
        tdPantaloni.innerHTML = `<span class="highlight">${escapeHtml(p.tagliaPantaloni)}</span>`;
        tr.appendChild(tdPantaloni);

        // Note
        const tdNote = document.createElement('td');
        tdNote.style.fontSize = '0.82rem';
        tdNote.style.color = '#ccc';
        tdNote.textContent = p.note ? p.note : '-';
        tr.appendChild(tdNote);

        // Azione (Elimina prima dell'estrazione)
        const tdAction = document.createElement('td');
        if (!isDrawn) {
            const btnDel = document.createElement('button');
            btnDel.className = 'btn-del-user';
            btnDel.innerHTML = '🗑️ Elimina';
            btnDel.onclick = () => deleteParticipant(p.id, `${p.nome} ${p.cognome}`);
            tdAction.appendChild(btnDel);
        } else {
            tdAction.innerHTML = '<span style="color: #666; font-size: 0.8rem;">Bloccato</span>';
        }
        tr.appendChild(tdAction);

        adminParticipantsTbody.appendChild(tr);
    });
}

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

// ELIMINA UN PARTECIPANTE PRIMA DEL SORTEGGIO
async function deleteParticipant(id, fullname) {
    if (!confirm(`Sei sicuro di voler rimuovere "${fullname}" dal sorteggio?`)) return;

    try {
        const res = await fetch('/api/admin/remove-participant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: currentAdminPin, id })
        });
        const data = await res.json();
        if (res.ok) {
            await loadAdminDashboard();
        } else {
            alert(data.error || 'Errore durante la rimozione');
        }
    } catch (err) {
        alert('Errore di connessione');
    }
}

// AVVIO SORTEGGIO (TUTTI PRONTI)
btnStartDraw.addEventListener('click', async () => {
    const ok = confirm("Sei sicuro che tutti si siano registrati? Cliccando OK, il sorteggio segreto verrà generato e tutti i telefoni si sbloccheranno!");
    if (!ok) return;

    try {
        const res = await fetch('/api/admin/start-draw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: currentAdminPin })
        });

        const data = await res.json();

        if (res.ok) {
            alert("🎃 " + data.message);
            await loadAdminDashboard();
        } else {
            alert("Errore: " + (data.error || 'Impossibile completare il sorteggio'));
        }
    } catch (err) {
        alert('Errore di connessione con il server');
    }
});

// POPOLA IL MENU RECUPERO MIRATO
function populateRecoverySelect(participants) {
    recoverySelectUser.innerHTML = '<option value="" disabled selected>Seleziona partecipante...</option>';
    participants.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.nome} ${p.cognome}`;
        recoverySelectUser.appendChild(opt);
    });
}

// RECUPERO PIN PERSONALE (ZERO SPOILER ASSOLUTO)
btnRequestRecover.addEventListener('click', async () => {
    const participantId = recoverySelectUser.value;
    if (!participantId) {
        alert('Seleziona prima un partecipante dal menu!');
        return;
    }

    try {
        const res = await fetch('/api/admin/recover-single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: currentAdminPin, participantId })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Impossibile recuperare');
            return;
        }

        // Popola la modale mostrando solo il PIN del partecipante
        modalGiverName.textContent = data.giver;
        const modalUserPin = document.getElementById('modal-user-pin');
        if (modalUserPin) {
            modalUserPin.textContent = data.userPin;
        }

        recoveryModal.classList.remove('hidden');
    } catch (err) {
        alert('Errore di connessione');
    }
});

// CHIUDI MODALE
btnCloseModal.addEventListener('click', () => {
    recoveryModal.classList.add('hidden');
});

// REFRESH PULSANTE
btnAdminRefresh.addEventListener('click', async () => {
    await loadAdminDashboard();
});

// RESET COMPLETO
btnAdminReset.addEventListener('click', async () => {
    const pass1 = confirm("⚠️ ATTENZIONE: Questo cancellerà TUTTI i partecipanti registrati e l'estrazione. Vuoi davvero azzerare tutto?");
    if (!pass1) return;

    const pass2 = prompt("Digita 'RESET' per confermare la cancellazione completa:");
    if (pass2 !== 'RESET') {
        alert("Operazione annullata.");
        return;
    }

    try {
        const res = await fetch('/api/admin/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: currentAdminPin })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            await loadAdminDashboard();
        } else {
            alert(data.error || 'Errore');
        }
    } catch (err) {
        alert('Errore di connessione');
    }
});

initAdmin();
