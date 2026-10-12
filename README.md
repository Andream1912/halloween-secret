# 🎃 Secret Halloween - Sorteggio Segreto con Taglie

Web application interattiva a tema Halloween (stile Secret Santa / Babbo Natale Segreto) per organizzare un sorteggio di regali/scherzi a distanza, accessibile via smartphone da chiunque.

---

## 🌟 Funzionalità Principali

1. **Iscrizione Partecipanti (Mobile-First):**
   - **Nome**
   - **Cognome**
   - **Taglia Maglia** (*XS, S, M, L, XL, XXL*)
   - **Taglia Pantaloni** (*40, 42, 44, M, L, ecc.*)
   - **Note / Desideri** (*facoltativo*)

2. **Sala d'Attesa in Tempo Reale:**
   - I giocatori attendono con contatore e lista di chi si è già iscritto.
   - Non appena l'organizzatore avvia l'estrazione, la schermata si aggiorna da sola su tutti i telefoni!

3. **La Rivelazione Segreta (Carta 3D):**
   - Ogni giocatore tocca la carta animata per scoprire la propria vittima e le sue taglie.
   - Tasto "Copri la carta" per evitare sbirciate.
   - Se un giocatore ricarica la pagina o rientra il giorno dopo, la carta viene recuperata automaticamente!

4. **Pannello Organizzatore (Admin):**
   - Accesso protetto da PIN segreto dell'organizzatore.
   - Visualizza l'elenco dei registrati e le loro taglie.
   - Possibilità di rimuovere un iscritto prima dell'avvio.
   - Pulsante: **"🎃 AVVIA IL SORTEGGIO (TUTTI PRONTI!)"** (algoritmo matematico di derangement che assicura che nessuno peschi se stesso).

5. **🛡️ Sistema Anti-Spoiler per l'Organizzatore:**
   - **Nessuna tabella aperta con tutti gli abbinamenti**: l'organizzatore non rischia mai di vedere chi fa il regalo a chi (nemmeno a se stesso)!
   - **Recupero d'emergenza singolo**: se un amico dimentica chi ha pescato, l'organizzatore può selezionare *solo quel partecipante* ed aprire una modale protetta da sfocatura (blur) per leggere solo quell'abbinamento.

---

## 🚀 Come testarlo in locale sul tuo Mac

```bash
cd /Users/andreamarino/Desktop/halloween
npm start
```
- App Partecipanti: `http://localhost:3000`
- Pannello Admin: `http://localhost:3005/admin.html`

---

## 🌐 Come pubblicarlo GRATIS su Internet (per gli amici da casa loro)

### Metodo 1: Render.com (Consigliato, 100% Gratuito per sempre)
1. Vai su [render.com](https://render.com) e crea un account gratuito.
2. Crea un repository GitHub privato o pubblico e carica questa cartella `halloween`.
3. Su Render clicca su **New +** ➔ **Web Service**.
4. Collega il tuo repository GitHub.
5. Imposta:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. Clicca **Deploy**: in 1 minuto avrai un link pubblico HTTPS (es. `https://secret-halloween.onrender.com`) da inviare a tutti su WhatsApp!

### Metodo 2: Glitch.com (Ancora più veloce, senza Git)
1. Vai su [glitch.com](https://glitch.com).
2. Clicca su **New Project** ➔ **glitch-hello-node**.
3. Trascina dentro o copia/incolla i file (`package.json`, `server.js`, cartella `public`).
4. Avrai istantaneamente un link pubblico attivo (es. `https://mio-halloween.glitch.me`)!
