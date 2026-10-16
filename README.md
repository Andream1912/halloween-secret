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

### Metodo 1: Render.com (Consigliato, 100% Gratuito)
1. Vai su [render.com](https://render.com) e accedi con GitHub.
2. Collega il repository `halloween-secret` come **Web Service** (`npm install` e `node server.js`).
3. **Per rendere i dati persistenti (evitare reset):**
   - Nella dashboard di Render clicca su **New +** ➔ **PostgreSQL**.
   - Dai un nome al database (es. `halloween-db`) e scegli il piano **Free**.
   - Clicca **Create Database**.
   - Una volta creato, copia il valore di **Internal Database URL** (oppure External Database URL).
   - Torna nel tuo Web Service `halloween-secret` ➔ scheda **Environment**.
   - Aggiungi una variabile d'ambiente:
     - Chiave: `DATABASE_URL`
     - Valore: incollaci l'URL copiato del database.
   - Clicca **Save Changes**: da questo momento le registrazioni e i sorteggi saranno salvati per sempre nel database cloud protetto!

### Metodo 2: Glitch.com (Ancora più veloce, senza Git)
1. Vai su [glitch.com](https://glitch.com).
2. Clicca su **New Project** ➔ **glitch-hello-node**.
3. Trascina dentro o copia/incolla i file (`package.json`, `server.js`, cartella `public`).
4. Avrai istantaneamente un link pubblico attivo (es. `https://mio-halloween.glitch.me`)!
