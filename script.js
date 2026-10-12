let names = [];
let assignments = {};
let drawOrder = [];
let currentIndex = 0;

// DOM Elements
const nameInput = document.getElementById('name-input');
const addBtn = document.getElementById('add-btn');
const namesList = document.getElementById('names-list');
const startBtn = document.getElementById('start-btn');

const phaseInput = document.getElementById('phase-input');
const phaseDraw = document.getElementById('phase-draw');
const phaseEnd = document.getElementById('phase-end');

const drawerName = document.getElementById('drawer-name');
const drawerNameInline = document.getElementById('drawer-name-inline');
const targetName = document.getElementById('target-name');
const cardInner = document.getElementById('card-inner');

const revealBtn = document.getElementById('reveal-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const resultsTbody = document.getElementById('results-tbody');
// --- Phase 1: Input Names ---

function updateList() {
    namesList.innerHTML = '';
    names.forEach((name, index) => {
        const li = document.createElement('li');
        li.textContent = name;
        
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '&times;';
        delBtn.classList.add('delete-btn');
        delBtn.onclick = () => {
            names.splice(index, 1);
            updateList();
        };
        
        li.appendChild(delBtn);
        namesList.appendChild(li);
    });

    if (names.length >= 3) {
        startBtn.classList.remove('hidden');
    } else {
        startBtn.classList.add('hidden');
    }
}

addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name && !names.includes(name)) {
        names.push(name);
        nameInput.value = '';
        updateList();
    } else if (names.includes(name)) {
        alert("Questo nome è già stato inserito!");
    }
});

nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBtn.click();
});

// --- Phase 2: Generating Assignments ---

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function generateAssignments() {
    let isValid = false;
    let shuffled = [];
    
    // Derangement algorithm (nessuno pesca se stesso)
    while (!isValid) {
        shuffled = shuffle([...names]);
        isValid = true;
        for (let i = 0; i < names.length; i++) {
            if (names[i] === shuffled[i]) {
                isValid = false;
                break;
            }
        }
    }

    assignments = {};
    for (let i = 0; i < names.length; i++) {
        assignments[names[i]] = shuffled[i];
    }
    
    // Ordine casuale in cui le persone andranno a pescare
    drawOrder = shuffle([...names]);
}

startBtn.addEventListener('click', () => {
    generateAssignments();
    currentIndex = 0;
    showPhase(phaseDraw);
    setupTurn();
});

// --- Phase 3: Drawing Process ---

function showPhase(phaseToShow) {
    phaseInput.classList.add('hidden');
    phaseDraw.classList.add('hidden');
    phaseEnd.classList.add('hidden');
    phaseToShow.classList.remove('hidden');
}

function setupTurn() {
    if (currentIndex >= drawOrder.length) {
        renderResultsTable();
        showPhase(phaseEnd);
        return;
    }
    
    const currentPerson = drawOrder[currentIndex];
    drawerName.textContent = currentPerson;
    drawerNameInline.textContent = currentPerson;
    targetName.textContent = assignments[currentPerson];
    
    // Reset card state
    cardInner.classList.remove('is-flipped');
}

revealBtn.addEventListener('click', () => {
    cardInner.classList.add('is-flipped');
});

nextBtn.addEventListener('click', () => {
    cardInner.classList.remove('is-flipped');
    // Aspetta l'animazione prima di cambiare i nomi
    setTimeout(() => {
        currentIndex++;
        setupTurn();
    }, 600);
});

restartBtn.addEventListener('click', () => {
    names = [];
    assignments = {};
    drawOrder = [];
    updateList();
    showPhase(phaseInput);
});


function renderResultsTable() {
    resultsTbody.innerHTML = '';
    for (const [person, target] of Object.entries(assignments)) {
        const tr = document.createElement('tr');
        
        const tdPerson = document.createElement('td');
        tdPerson.textContent = person;
        
        const tdTarget = document.createElement('td');
        tdTarget.textContent = target;
        tdTarget.classList.add('highlight');
        
        tr.appendChild(tdPerson);
        tr.appendChild(tdTarget);
        resultsTbody.appendChild(tr);
    }
}
