// ==========================================
// Guitar Chord Helper - script.js - COMPLET
// ==========================================

// --- State Variables & Constants ---
const LOCAL_STORAGE_KEY = 'currentGuitarSong'; // Clé pour localStorage
const SAVED_SONGS_KEY = 'guitarAppSavedSongs'; // Clé pour les chansons nommées
const noteFrequencies = {
    // Fréquences en Hz pour quelques octaves (simplifié)
    // On suppose une notation anglaise (C, C#, D...)
    // Idéalement, il faudrait une fonction plus robuste calculant depuis A4=440Hz
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
    // Alias (pour simplifier la recherche si on n'a que la lettre)
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
};

// Playback State
let chordDatabase = []; // Sera peuplé depuis chords.json
let isPlaying = false;
let tempoBPM = 100;
let timeSignature = "4/4";
let beatsPerMeasure = 4;
let beatDurationMs = 600;
let timerId = null;
let sequenceToPlay = []; // Pointer to the sequence being played (usually userSequence)
let currentStepInSequence = 0;
let currentBeatInChord = 0;
let previouslyHighlightedStepIndex = -1;
let previousVoicingInPlayback = null;

// User Sequence State
let userSequence = []; // Holds the actual sequence created by the user
let validatedChordId = null;
let proposedVoicing = null;

let audioCtx = null; // Le contexte audio global
let isAudioEnabled = false; // Pour l'interrupteur Audio On/Off
let beatCountSinceStart = 0; // Compteur global de battements pour le métronome


// SVG Drawing Constants
const SVG_NS = "http://www.w3.org/2000/svg";
// Diagram settings
const DIAGRAM_WIDTH = 180; // Increased for left margin
const DIAGRAM_HEIGHT = 180;
const DIAGRAM_STRINGS = 6;
const DIAGRAM_FRETS_TO_SHOW = 4;
const DIAGRAM_STRING_SPACING = (DIAGRAM_WIDTH * 0.75) / (DIAGRAM_STRINGS - 1); // Adjusted
const DIAGRAM_FRET_SPACING = (DIAGRAM_HEIGHT * 0.6) / DIAGRAM_FRETS_TO_SHOW;
const DIAGRAM_START_X = DIAGRAM_WIDTH * 0.18; // Increased margin
const DIAGRAM_START_Y = DIAGRAM_HEIGHT * 0.25;
const DIAGRAM_DOT_RADIUS = DIAGRAM_STRING_SPACING * 0.3;
const DIAGRAM_NUT_HEIGHT = 6;
// Fretboard settings
const FRETBOARD_WIDTH = 350;
const FRETBOARD_HEIGHT = 150;
const FRETBOARD_STRINGS = 6;
const FRETBOARD_FRETS_TO_SHOW = 12;
const FRETBOARD_STRING_SPACING = (FRETBOARD_HEIGHT * 0.8) / (FRETBOARD_STRINGS - 1);
const FRETBOARD_FRET_SPACING = (FRETBOARD_WIDTH * 0.9) / FRETBOARD_FRETS_TO_SHOW;
const FRETBOARD_START_X = FRETBOARD_WIDTH * 0.05;
const FRETBOARD_START_Y = FRETBOARD_HEIGHT * 0.1;
const FRETBOARD_DOT_RADIUS = FRETBOARD_STRING_SPACING * 0.3;
const FRETBOARD_NUT_WIDTH = 8;

// --- UI Element References ---
const tempoInput = document.getElementById('tempo');
const timeSignatureSelect = document.getElementById('time-signature');
const playPauseButton = document.getElementById('sequence-play-pause-btn');
const chordInputElement = document.getElementById('chord-input');
const suggestionsElement = document.getElementById('chord-suggestions');
const durationInputElement = document.getElementById('chord-duration');
const addChordButton = document.getElementById('add-chord-btn');
const sequenceListElement = document.getElementById('sequence-list');
const clearSequenceButton = document.getElementById('clear-sequence-btn');
const voicingDownButton = document.getElementById('voicing-down-btn');
const voicingUpButton = document.getElementById('voicing-up-btn');
const diagramContainer = document.getElementById('chord-diagram');
const fretboardContainer = document.getElementById('fretboard-visualization');
const chordNameElement = document.getElementById('displayed-chord-name');
// ACTION: Ajoutez cette ligne avec les autres références UI (getElementById)
const audioEnabledCheckbox = document.getElementById('audio-enabled');
// ACTION: Ajoutez cette ligne avec les autres références UI (getElementById)
const metroIndicator = document.getElementById('metronome-indicator');
// ACTION: Ajoutez ces lignes avec les autres références UI (getElementById)
const songNameInput = document.getElementById('song-name-input');
const saveSongButton = document.getElementById('save-song-btn');
const savedSongsSelect = document.getElementById('saved-songs-select');
const loadSongButton = document.getElementById('load-song-btn');
const deleteSongButton = document.getElementById('delete-song-btn');

// ==========================================
// PHASE 2: Chord Data Representation
// ==========================================

/**
 * Trouve les données complètes d'un accord par son nom ou alias.
 * @param {string} chordIdentifier - Nom ou alias de l'accord (ex: "C Major", "Am").
 * @returns {object | null} - L'objet accord complet ou null si non trouvé.
 */
function getChordData(chordIdentifier) {
    // Log l'identifiant reçu
    console.log(`--- getChordData: Recherche pour '${chordIdentifier}'`);
    if (!chordIdentifier) return null;
    const identifierLower = chordIdentifier.toLowerCase();
    const foundChord = chordDatabase.find(chord =>
        chord.name.toLowerCase() === identifierLower ||
        (chord.aliases && chord.aliases.some(alias => alias.toLowerCase() === identifierLower))
    );
    // Log le résultat trouvé (ou null) en affichant le nom pour clarté
    console.log(`--- getChordData: Trouvé -> ${foundChord ? foundChord.name : 'null'}`);
    return foundChord || null;
}

function getVoicingsForChord(chordIdentifier) {
    const chordData = getChordData(chordIdentifier);
    return chordData ? chordData.voicings : [];
}

/** Charge la base de données d'accords depuis le fichier chords.json */
async function loadChordDatabase() {
    const filePath = 'chords.json'; // Nom du fichier JSON local
    console.log(`Chargement de la base d'accords depuis ${filePath}...`);
    try {
        const response = await fetch(filePath); // Utilise fetch pour lire le fichier local
        if (!response.ok) {
            // Si le fichier n'est pas trouvé (404) ou autre erreur HTTP
            throw new Error(`Erreur HTTP! Statut: ${response.status}`);
        }
        const data = await response.json(); // Parse le contenu JSON
        chordDatabase = data; // Assigne les données chargées à la variable globale
        console.log(`Base d'accords chargée avec succès (${chordDatabase.length} accords trouvés).`);
        onDatabaseLoaded(); // Appelle une fonction pour signaler que c'est prêt (si besoin)
    } catch (error) {
        console.error(`Impossible de charger ou parser ${filePath}:`, error);
        alert(`Erreur critique : Impossible de charger la bibliothèque d'accords.\nAssurez-vous que le fichier '${filePath}' existe dans le même dossier et que son format JSON est correct.`);
        // Que faire en cas d'erreur? L'appli est peu utilisable... On pourrait désactiver certaines parties.
        chordInputElement.disabled = true;
        chordInputElement.placeholder = "Erreur chargement accords";
    }
}

/** Fonction appelée une fois que la base de données est chargée (peut être étendue) */
function onDatabaseLoaded() {
    console.log("La base de données est prête.");
    // Si des initialisations dépendent de la base de données, faites-les ici.
    // Par exemple, valider les accords de la chanson chargée depuis localStorage ?
}

function calculateVoicingPosition(voicing) {
    // ... (Fonction inchangée) ...
     if (!voicing || !voicing.frets) return 0;
    let minFret = 99; let foundFrettedNote = false;
    for (const fret of voicing.frets) { if (fret > 0) { foundFrettedNote = true; minFret = Math.min(minFret, fret); } }
    return foundFrettedNote ? minFret : 0;
}

function calculateTransitionCost(voicing1, voicing2) {
    // ... (Fonction inchangée) ...
    if (!voicing1) return 0; let cost = 0;
    for (let i = 0; i < DIAGRAM_STRINGS; i++) {
        const fret1 = voicing1.frets[i]; const finger1 = voicing1.fingers[i]; const fret2 = voicing2.frets[i]; const finger2 = voicing2.fingers[i];
        if (fret1 === -1 && fret2 === -1) continue;
        if (finger1 > 0 && finger1 === finger2 && fret1 === fret2) { cost += 0; }
        else if (fret1 !== -1 && fret2 === -1) { cost += 3; }
        else if (fret1 === -1 && fret2 !== -1) { cost += 3; }
        else { cost += Math.abs(fret1 - fret2); if (finger1 !== finger2 || fret1 === 0 || fret2 === 0) { cost += 2; } }
    } return cost;
}

function findBestNextVoicing(previousVoicing, nextChordId) {
    // ... (Fonction inchangée) ...
    const candidateVoicings = getVoicingsForChord(nextChordId);
    if (!candidateVoicings || candidateVoicings.length === 0) {
        return null;
    }
    if (!previousVoicing || candidateVoicings.length === 1) {
        return candidateVoicings[0];
    }
    let bestVoicing = null;
    let minCost = Infinity;
    candidateVoicings.forEach(candidate => {
        const cost = calculateTransitionCost(previousVoicing, candidate);
        if (cost < minCost) {
            minCost = cost;
            bestVoicing = candidate;
        }
    });
    console.log(`Best voicing found for ${nextChordId} (cost ${minCost}):`, bestVoicing);
    return bestVoicing;
}

function findAlternateVoicing(currentVoicing, currentChordId, direction) {
    // ... (Fonction inchangée) ...
    if (!currentVoicing || !currentChordId) return null;
    
    const allVoicings = getVoicingsForChord(currentChordId);
    if (!allVoicings || allVoicings.length <= 1) return null;
    
    const currentPosition = calculateVoicingPosition(currentVoicing);
    const alternatives = allVoicings
        .map(v => ({ ...v, position: calculateVoicingPosition(v) }))
        .filter(v => JSON.stringify(v.frets) !== JSON.stringify(currentVoicing.frets))
        .sort((a, b) => a.position - b.position);
    
    if (alternatives.length === 0) return null; // No other voicings exist besides current one
    
    let targetVoicing = null;
    if (direction === 1) {
        targetVoicing = alternatives.find(v => v.position > currentPosition);
        if (!targetVoicing) targetVoicing = alternatives[0];
    } else {
        const lowerVoicings = alternatives.filter(v => v.position < currentPosition);
        if (lowerVoicings.length > 0) {
            targetVoicing = lowerVoicings[lowerVoicings.length - 1];
        }
        if (!targetVoicing) targetVoicing = alternatives[alternatives.length - 1];
    }
    
    if (targetVoicing) {
        const { position, ...originalVoicing } = targetVoicing;
        console.log(`Alternate voicing found (direction ${direction}):`, originalVoicing);
        return originalVoicing;
    }
    
    return null;
}

function identifyPivotFingers(voicing1, voicing2) {
    // ... (Fonction inchangée) ...
     const pivotIndices = new Set(); if (!voicing1 || !voicing2 || !voicing1.fingers || !voicing2.fingers || !voicing1.frets || !voicing2.frets) { return pivotIndices; }
     for (let i = 0; i < DIAGRAM_STRINGS; i++) { if (voicing1.fingers[i] > 0 && voicing1.fingers[i] === voicing2.fingers[i] && voicing1.frets[i] === voicing2.frets[i]) { pivotIndices.add(i); } } return pivotIndices;
}

// ==========================================
// PHASE 3: Drawing Functions & Display
// ==========================================
function createSvgElement(tag, attributes) {
    // ... (Fonction inchangée) ...
    const element = document.createElementNS(SVG_NS, tag); for (const key in attributes) { element.setAttribute(key, attributes[key]); } return element;
}

function drawChordDiagram(voicingData, parentElement, pivotIndices = new Set()) {
    // ... (Fonction inchangée - Version avec rect pour barré et fixes visuels) ...
    parentElement.innerHTML = ''; if (!voicingData || !voicingData.frets) { parentElement.innerHTML = '<p>Voicing non disponible</p>'; return; }
    const svg = createSvgElement('svg', { width: DIAGRAM_WIDTH, height: DIAGRAM_HEIGHT, viewBox: `0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}` });
    let minFret = 0, maxFret = 0, hasFrettedNotes = false; voicingData.frets.forEach(fret => { if (fret > 0) { if (!hasFrettedNotes || fret < minFret) { minFret = fret; } maxFret = Math.max(maxFret, fret); hasFrettedNotes = true; } else if (fret === 0) { maxFret = Math.max(maxFret, 0); } });
    let startFretNum = 0, topIsNut = true; if (hasFrettedNotes && maxFret > DIAGRAM_FRETS_TO_SHOW) { topIsNut = false; startFretNum = minFret - 1; if (startFretNum < 1) startFretNum = 1; } else { topIsNut = true; startFretNum = 0; }
    const topLineWidth = (DIAGRAM_STRINGS - 1) * DIAGRAM_STRING_SPACING; const topLeftX = DIAGRAM_START_X;
    if (!topIsNut) { const fretIndicator = createSvgElement('text', { x: DIAGRAM_START_X - 8, y: DIAGRAM_START_Y + DIAGRAM_FRET_SPACING * 0.7, 'font-size': '12px', fill: '#555', 'text-anchor': 'end' }); fretIndicator.textContent = `${startFretNum + 1}fr`; svg.appendChild(fretIndicator); }
    svg.appendChild(createSvgElement('rect', { x: topLeftX, y: DIAGRAM_START_Y - (topIsNut ? DIAGRAM_NUT_HEIGHT / 2 : 1), width: topLineWidth, height: topIsNut ? DIAGRAM_NUT_HEIGHT : 2, fill: '#666' }));
    for (let i = 1; i <= DIAGRAM_FRETS_TO_SHOW; i++) { const y = DIAGRAM_START_Y + i * DIAGRAM_FRET_SPACING; svg.appendChild(createSvgElement('line', { x1: DIAGRAM_START_X, y1: y, x2: DIAGRAM_START_X + topLineWidth, y2: y, stroke: '#ccc', 'stroke-width': 1 })); }
    for (let i = 0; i < DIAGRAM_STRINGS; i++) { const x = DIAGRAM_START_X + i * DIAGRAM_STRING_SPACING; svg.appendChild(createSvgElement('line', { x1: x, y1: DIAGRAM_START_Y, x2: x, y2: DIAGRAM_START_Y + DIAGRAM_FRETS_TO_SHOW * DIAGRAM_FRET_SPACING, stroke: '#aaa', 'stroke-width': 1 })); const markerY = DIAGRAM_START_Y - (topIsNut ? DIAGRAM_NUT_HEIGHT : 5) - 5; let markerText = ''; const actualFret = voicingData.frets[i]; if (actualFret === 0 && topIsNut) { markerText = 'O'; } else if (actualFret === -1) { markerText = 'X'; } if (markerText) { const textElement = createSvgElement('text', { x: x, y: markerY, 'font-size': '14px', fill: '#555', 'text-anchor': 'middle' }); textElement.textContent = markerText; svg.appendChild(textElement); } }
    let barreInfo = null; const firstPossibleBarreFret = topIsNut ? 1 : startFretNum + 1; if (voicingData.fingers) { const barreFinger = 1; let barreStrings = []; for(let i=0; i < DIAGRAM_STRINGS; i++) { if(voicingData.frets[i] === firstPossibleBarreFret && voicingData.fingers[i] === barreFinger) { barreStrings.push(i); } } if (barreStrings.length >= 2) { barreInfo = { fret: firstPossibleBarreFret, finger: barreFinger, startStringIndex: Math.min(...barreStrings), endStringIndex: Math.max(...barreStrings) }; const barreXStartCoord = DIAGRAM_START_X + barreInfo.startStringIndex * DIAGRAM_STRING_SPACING; const barreXEndCoord = DIAGRAM_START_X + barreInfo.endStringIndex * DIAGRAM_STRING_SPACING; const barreWidth = barreXEndCoord - barreXStartCoord; const barreHeight = DIAGRAM_DOT_RADIUS * 1.8; const barreCenterY = DIAGRAM_START_Y + (1 - 0.5) * DIAGRAM_FRET_SPACING; const barreTopY = barreCenterY - (barreHeight / 2); svg.appendChild(createSvgElement('rect', { x: barreXStartCoord, y: barreTopY, width: barreWidth, height: barreHeight, fill: '#333', rx: barreHeight / 2, ry: barreHeight / 2 })); } }
    for (let i = 0; i < DIAGRAM_STRINGS; i++) { const fretNumber = voicingData.frets[i]; const fingerNumber = voicingData.fingers ? voicingData.fingers[i] : 0; if (barreInfo && fingerNumber === barreInfo.finger && fretNumber === barreInfo.fret && i >= barreInfo.startStringIndex && i <= barreInfo.endStringIndex) { continue; } if (fretNumber > startFretNum && fretNumber <= startFretNum + DIAGRAM_FRETS_TO_SHOW) { const dotX = DIAGRAM_START_X + i * DIAGRAM_STRING_SPACING; const dotY = DIAGRAM_START_Y + (fretNumber - startFretNum - 0.5) * DIAGRAM_FRET_SPACING; const isPivot = pivotIndices.has(i); const dotFillColor = isPivot ? '#28a745' : '#333'; svg.appendChild(createSvgElement('circle', { cx: dotX, cy: dotY, r: DIAGRAM_DOT_RADIUS, fill: dotFillColor })); if (fingerNumber > 0) { const fingerText = createSvgElement('text', { x: dotX, y: dotY + DIAGRAM_DOT_RADIUS * 0.4, 'font-size': `${DIAGRAM_DOT_RADIUS * 1.2}px`, fill: '#fff', 'text-anchor': 'middle', 'font-weight': 'bold' }); fingerText.textContent = fingerNumber; svg.appendChild(fingerText); } } }
    parentElement.appendChild(svg);
}

function drawFretboardVisualization(voicingData, parentElement, pivotIndices = new Set()) {
    // ... (Fonction inchangée - Version avec fix 12e frette et pivots) ...
    parentElement.innerHTML = ''; if (!voicingData) { parentElement.innerHTML = '<p>Voicing non disponible</p>'; return; } const svg = createSvgElement('svg', { width: FRETBOARD_WIDTH, height: FRETBOARD_HEIGHT, viewBox: `0 0 ${FRETBOARD_WIDTH} ${FRETBOARD_HEIGHT}` }); const backgroundX = FRETBOARD_START_X - FRETBOARD_NUT_WIDTH; const backgroundY = FRETBOARD_START_Y; const backgroundWidth = (FRETBOARD_START_X + FRETBOARD_FRETS_TO_SHOW * FRETBOARD_FRET_SPACING + 5) - backgroundX; const backgroundHeight = (FRETBOARD_STRINGS - 1) * FRETBOARD_STRING_SPACING; svg.appendChild(createSvgElement('rect',{ x: backgroundX, y: backgroundY, width: backgroundWidth, height: backgroundHeight, fill: '#f0e1c1' })); svg.appendChild(createSvgElement('rect', { x: FRETBOARD_START_X - FRETBOARD_NUT_WIDTH, y: FRETBOARD_START_Y, width: FRETBOARD_NUT_WIDTH, height: backgroundHeight, fill: '#555' }));
    for (let i = 1; i <= FRETBOARD_FRETS_TO_SHOW; i++) { const x = FRETBOARD_START_X + i * FRETBOARD_FRET_SPACING; svg.appendChild(createSvgElement('line', { x1: x, y1: FRETBOARD_START_Y, x2: x, y2: FRETBOARD_START_Y + backgroundHeight, stroke: '#aaa', 'stroke-width': 1 })); }
    for (let i = 0; i < FRETBOARD_STRINGS; i++) { const y = FRETBOARD_START_Y + (FRETBOARD_STRINGS - 1 - i) * FRETBOARD_STRING_SPACING; svg.appendChild(createSvgElement('line', { x1: backgroundX, y1: y, x2: backgroundX + backgroundWidth, y2: y, stroke: '#777', 'stroke-width': 1 + (FRETBOARD_STRINGS - 1 - i) * 0.2 })); const fretNumber = voicingData.frets[i]; if (fretNumber > 0 && fretNumber <= FRETBOARD_FRETS_TO_SHOW) { const dotX = FRETBOARD_START_X + (fretNumber - 0.5) * FRETBOARD_FRET_SPACING; const dotY = y; const isPivot = pivotIndices.has(i); const dotFillColor = isPivot ? '#28a745' : '#333'; const dotStrokeColor = isPivot ? '#0f5132' : '#fff'; svg.appendChild(createSvgElement('circle', { cx: dotX, cy: dotY, r: FRETBOARD_DOT_RADIUS, fill: dotFillColor, stroke: dotStrokeColor, 'stroke-width': 1 })); } }
    const markerFrets = [3, 5, 7, 9]; const doubleMarkerFret = 12; const markerRadius = FRETBOARD_STRING_SPACING * 0.2; markerFrets.forEach(fret => { if(fret <= FRETBOARD_FRETS_TO_SHOW) { const markerX = FRETBOARD_START_X + (fret - 0.5) * FRETBOARD_FRET_SPACING; const markerY = FRETBOARD_START_Y + backgroundHeight / 2; svg.appendChild(createSvgElement('circle', { cx: markerX, cy: markerY, r: markerRadius, fill: '#adadad' })); } }); if(doubleMarkerFret <= FRETBOARD_FRETS_TO_SHOW) { const markerX = FRETBOARD_START_X + (doubleMarkerFret - 0.5) * FRETBOARD_FRET_SPACING; const y_Si = FRETBOARD_START_Y + (FRETBOARD_STRINGS - 1 - 4) * FRETBOARD_STRING_SPACING; const y_Sol = FRETBOARD_START_Y + (FRETBOARD_STRINGS - 1 - 3) * FRETBOARD_STRING_SPACING; const y_La = FRETBOARD_START_Y + (FRETBOARD_STRINGS - 1 - 1) * FRETBOARD_STRING_SPACING; const y_Re = FRETBOARD_START_Y + (FRETBOARD_STRINGS - 1 - 2) * FRETBOARD_STRING_SPACING; const markerY_Top = (y_Si + y_Sol) / 2; const markerY_Bottom = (y_La + y_Re) / 2; svg.appendChild(createSvgElement('circle', { cx: markerX, cy: markerY_Top, r: markerRadius, fill: '#adadad' })); svg.appendChild(createSvgElement('circle', { cx: markerX, cy: markerY_Bottom, r: markerRadius, fill: '#adadad' })); }
    parentElement.appendChild(svg);
}

/**
 * Met à jour l'affichage principal (nom, diagramme, manche).
 * @param {string | null} chordName - Nom de l'accord.
 * @param {object | null} voicingObject - L'objet voicing à afficher.
 * @param {Set<number>} [pivotIndices=new Set()] - Set des indices de cordes où il y a un pivot.
 */
function displayChord(chordName, voicingObject, pivotIndices = new Set()) {
    // ... (Fonction inchangée - Version acceptant pivotIndices) ...
     if (chordName && voicingObject) { chordNameElement.textContent = chordName; drawChordDiagram(voicingObject, diagramContainer, pivotIndices); drawFretboardVisualization(voicingObject, fretboardContainer, pivotIndices); const alternativesExist = (getVoicingsForChord(chordName)?.length || 0) > 1; voicingDownButton.disabled = !alternativesExist; voicingUpButton.disabled = !alternativesExist; }
     else { chordNameElement.textContent = "--"; diagramContainer.innerHTML = '<p>...</p>'; fretboardContainer.innerHTML = '<p>...</p>'; voicingDownButton.disabled = true; voicingUpButton.disabled = true; }
}

// ==========================================
// PHASE 4: Playback Logic
// ==========================================

//function updateTempo() { /* ... (inchangée) ... */ tempoBPM = parseInt(tempoInput.value, 10); if (isNaN(tempoBPM) || tempoBPM < 40 || tempoBPM > 240) { tempoBPM = 100; tempoInput.value = tempoBPM; } beatDurationMs = (60 * 1000) / tempoBPM; console.log(`Tempo updated: ${tempoBPM} BPM, Beat Duration: ${beatDurationMs.toFixed(2)} ms`); if (isPlaying) { stopPlayback(false); startPlayback(); } }
//function updateTimeSignature() { /* ... (inchangée) ... */ timeSignature = timeSignatureSelect.value; const parts = timeSignature.split('/'); beatsPerMeasure = parseInt(parts[0], 10) || 4; console.log(`Time Signature updated: ${timeSignature}, Beats/Measure: ${beatsPerMeasure}`); }

/** Met à jour UNIQUEMENT les variables internes liées au tempo */
function _updateTempoInternal() {
    tempoBPM = parseInt(tempoInput.value, 10);
    if (isNaN(tempoBPM) || tempoBPM < 40 || tempoBPM > 240) {
        tempoBPM = 100;
        tempoInput.value = tempoBPM; // Met à jour l'UI si valeur invalide
    }
    beatDurationMs = (60 * 1000) / tempoBPM;
    console.log(`Internal Tempo updated: ${tempoBPM} BPM, Beat Duration: ${beatDurationMs.toFixed(2)} ms`);
}

/** Met à jour UNIQUEMENT les variables internes liées à la mesure */
function _updateTimeSignatureInternal() {
    timeSignature = timeSignatureSelect.value;
    const parts = timeSignature.split('/');
    beatsPerMeasure = parseInt(parts[0], 10) || 4;
    console.log(`Internal Time Signature updated: ${timeSignature}, Beats/Measure: ${beatsPerMeasure}`);
     // Si on joue, il faut recalculer le beat courant dans la nouvelle mesure ?
     // Pour l'instant, on ne le fait pas, changement pris en compte au prochain temps 1.
     // beatCountSinceStart n'est PAS réinitialisé ici.
}


// ACTION: Ajoutez cette NOUVELLE fonction (par exemple avant playTick)

// ACTION: REMPLACEZ la fonction updateMetronomeVisual existante par celle-ci

/** Met à jour l'indicateur visuel du métronome (couleur ET numéro) */
function updateMetronomeVisual(beatCount) {
    if (!metroIndicator) return;

    const currentBeatInMeasure = beatCount % beatsPerMeasure; // Temps 0, 1, 2, 3...
    const beatNumberToDisplay = currentBeatInMeasure + 1; // Temps 1, 2, 3, 4...

    // --- AJOUT: Affiche le numéro du temps ---
    metroIndicator.textContent = beatNumberToDisplay;
    // --- Fin Ajout ---

    // Applique la classe de couleur
    metroIndicator.classList.remove('strong-beat', 'weak-beat');
    if (currentBeatInMeasure === 0) { // Beat 1
        metroIndicator.classList.add('strong-beat');
    } else {
        metroIndicator.classList.add('weak-beat');
    }
}


// ACTION: REMPLACEZ la fonction playTick existante par celle-ci
function playTick() {
    if (sequenceToPlay.length === 0) {
        console.warn("Sequence empty, stopping.");
        stopPlayback();
        return;
    }

    const currentChordInfoForSound = sequenceToPlay[currentStepInSequence];
    const rootNote = getChordData(currentChordInfoForSound.chordId)?.root; // Trouve la note racine
    if (rootNote) {
        playNoteSound(rootNote); // Joue le son si l'audio est activé
    }

    // --- AJOUT: Mise à jour du métronome VISUEL ---
    updateMetronomeVisual(beatCountSinceStart);
    // --- Fin Ajout ---

    const currentChordInfo = sequenceToPlay[currentStepInSequence];
    const currentVoicing = currentChordInfo.voicing;

    // Affichage accord / highlight / pivots (uniquement au début de l'accord)
    if (currentBeatInChord === 0) {
        console.log(`Displaying: ${currentChordInfo.chordId} (Step <span class="math-inline">\{currentStepInSequence \+ 1\}/</span>{sequenceToPlay.length})`);
        const chordData = getChordData(currentChordInfo.chordId);
        const pivotIndices = identifyPivotFingers(previousVoicingInPlayback, currentVoicing);
        displayChord(chordData ? chordData.name : currentChordInfo.chordId, currentVoicing, pivotIndices);

        if (previouslyHighlightedStepIndex >= 0) {
            const previousLi = sequenceListElement.querySelector(`li[data-index="${previouslyHighlightedStepIndex}"]`);
            if (previousLi) {
                previousLi.classList.remove('playing-step');
            }
        }        
        const currentLi = sequenceListElement.querySelector(`li[data-index="${currentStepInSequence}"]`);
        if (currentLi) { currentLi.classList.add('playing-step'); }
        previouslyHighlightedStepIndex = currentStepInSequence;
    }

    previousVoicingInPlayback = currentVoicing; // Mémorise pour prochain tick

    // Avance les compteurs
    currentBeatInChord++;
    beatCountSinceStart++; // Incrémente le compteur global de battements

    // Vérifie si on change d'accord
    if (currentBeatInChord >= currentChordInfo.duration) {
         currentStepInSequence++;
        if (currentStepInSequence >= sequenceToPlay.length) {
            currentStepInSequence = 0; console.log("--- Sequence Loop ---");
        }
        currentBeatInChord = 0;
         // Reset beatCount? Non, il doit continuer globalement.
    }
}



function startPlayback() {
    console.log(">>> startPlayback APPELÉE. timerId:", timerId, "sequenceToPlay.length:", sequenceToPlay.length);
    if (timerId !== null || sequenceToPlay.length === 0) {
         console.log(">>> startPlayback: Condition sortie précoce rencontrée (déjà en lecture ou séquence vide).");
         return;
    }

    // Met à jour l'état et le bouton -> Pause
    isPlaying = true;
    console.log("   startPlayback: Mise à jour état isPlaying=true. Mise à jour bouton -> 'Pause'"); // DEBUG
    playPauseButton.textContent = '⏸️ Pause';
    playPauseButton.classList.add('playing');

    // Réinitialise les compteurs SEULEMENT si on repart de zéro (pas une reprise)
    if (currentStepInSequence === 0 && currentBeatInChord === 0) {
        console.log("   startPlayback: Réinitialisation complète (début séquence).");
        previouslyHighlightedStepIndex = -1;
        previousVoicingInPlayback = null;
    } else {
        console.log("   startPlayback: Reprise (pas de réinitialisation majeure).");
    }
    beatCountSinceStart = currentStepInSequence * beatsPerMeasure + currentBeatInChord; // Recalcule beatCountSinceStart pour reprise correcte du métronome


    // Affichage initial / Mise à jour métronome au démarrage/reprise
    if (sequenceToPlay.length > 0) {
        const currentChordInfo = sequenceToPlay[currentStepInSequence];
        const chordData = getChordData(currentChordInfo.chordId);
        const pivotIndices = identifyPivotFingers(previousVoicingInPlayback, currentChordInfo.voicing); // Calcule pivots même si pas le 1er temps ? Oui pour affichage correct si on reprend au milieu.
        displayChord(chordData ? chordData.name : currentChordInfo.chordId, currentChordInfo.voicing, pivotIndices);

        // Highlight (attention si on reprend au milieu d'un accord)
         if (previouslyHighlightedStepIndex !== currentStepInSequence) {
             if (previouslyHighlightedStepIndex >= 0) { /* remove old highlight */ }
             const currentLi = sequenceListElement.querySelector(`li[data-index="${currentStepInSequence}"]`);
             if (currentLi) { currentLi.classList.add('playing-step'); }
             previouslyHighlightedStepIndex = currentStepInSequence;
         }
         // Met à jour le métronome pour le temps actuel
         updateMetronomeVisual(beatCountSinceStart); // Update visual beat immediately
         previousVoicingInPlayback = currentChordInfo.voicing; // MAJ pour prochain tick
    }

    // Lance le timer
    timerId = setInterval(playTick, beatDurationMs);
    console.log(">>> startPlayback: Lecture DEMARREE/REPRISE. Timer ID:", timerId);
}

function stopPlayback(resetButtonText = true) {
    console.log(">>> stopPlayback APPELÉE. timerId:", timerId, "resetButtonText:", resetButtonText); // DEBUG
    if (timerId === null) {
        console.log("   stopPlayback: Déjà arrêté, sortie."); // DEBUG
        return; // Déjà arrêté
    }

    // Arrête le timer et met à jour l'état isPlaying
    clearInterval(timerId);
    timerId = null;
    isPlaying = false; // <<< Important: Mettre à jour AVANT de tester resetButtonText
    console.log("   stopPlayback: Timer arrêté. isPlaying=false"); // DEBUG

    // Reset compteurs/états liés à la lecture continue
    // previousVoicingInPlayback = null; // Gardons le dernier pour info ? Non, reset pour clarté.
    // beatCountSinceStart = 0; // Reset pour que le prochain start reparte bien à 0 pour le métronome

    // Nettoie le métronome
    if (metroIndicator) {
        metroIndicator.classList.remove('strong-beat', 'weak-beat');
        metroIndicator.textContent = '';
        console.log("   stopPlayback: Indicateur métronome nettoyé."); // DEBUG
    }

    // Nettoie le highlight de la liste (seulement si on arrête vraiment, pas juste pour changer tempo)
    if (resetButtonText && previouslyHighlightedStepIndex >= 0) {
        const previousLi = sequenceListElement.querySelector(`li[data-index="${previouslyHighlightedStepIndex}"]`);
        if (previousLi) {
            previousLi.classList.remove('playing-step');
             console.log("   stopPlayback: Highlight retiré de l'étape", previouslyHighlightedStepIndex); // DEBUG
        }
    }
     if (resetButtonText) { // Reset index seulement si arrêt complet
          previouslyHighlightedStepIndex = -1;
     }


    // Réinitialise le bouton Play/Pause si demandé
    if (resetButtonText) {
        console.log("   stopPlayback: Mise à jour bouton -> 'Jouer'"); // DEBUG
        playPauseButton.textContent = '▶️ Jouer la Chanson';
        playPauseButton.classList.remove('playing');
    } else {
         console.log("   stopPlayback: resetButtonText=false, apparence bouton inchangée."); // DEBUG
    }
    console.log(">>> stopPlayback FINIE. isPlaying:", isPlaying, "timerId:", timerId);
}


// ==========================================
// PHASE 5: User Input & Sequence Management
// ==========================================
function renderSequenceList() {
    // ... (Fonction inchangée - Version CORRIGÉE avec backticks) ...
    sequenceListElement.innerHTML = '';
    if (userSequence.length === 0) {
        sequenceListElement.innerHTML = '<li>(Séquence vide)</li>';
        return;
    }
    
    userSequence.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${index + 1}. ${item.chordId} (${item.duration} temps)`;
        listItem.dataset.index = index;
        sequenceListElement.appendChild(listItem);
    });
}


function validateAndDisplayChordInput() {
    const chordIdentifier = chordInputElement.value.trim();
    console.log(`>>> validateAndDisplayChordInput: Validation pour input='${chordIdentifier}'`); // Log Input

    const chordData = getChordData(chordIdentifier); // Appel de la fonction loggée ci-dessus

    // Log détaillé de ce que getChordData a retourné
    console.log(`>>> validateAndDisplayChordInput: getChordData a retourné -> ${chordData ? `Name='${chordData.name}', Root='${chordData.root}', Quality='${chordData.quality}'` : 'null'}`);

    if(chordData) {
        validatedChordId = chordData.aliases ? chordData.aliases[0] || chordData.name : chordData.name;

        const lastSequenceItem = userSequence.length > 0 ? userSequence[userSequence.length - 1] : null;
        const lastVoicingInSequence = lastSequenceItem ? lastSequenceItem.voicing : null;

        // Appel à la logique de voicing (vient après ce log)
        proposedVoicing = findBestNextVoicing(lastVoicingInSequence, validatedChordId);
        console.log(`>>> validateAndDisplayChordInput: Voicing proposé pour '${validatedChordId}': Frettes=`, JSON.stringify(proposedVoicing?.frets));

        if(proposedVoicing) {
            displayChord(chordData.name, proposedVoicing); // L'affichage utilise chordData.name
            // console.log(`Input validated: ${validatedChordId}, Proposed Voicing:`, proposedVoicing);
            // Les boutons +/- sont activés/désactivés dans displayChord maintenant
        } else {
            console.warn(`Aucun voicing trouvé pour ${validatedChordId}`);
            displayChord(chordData.name, null); // Affiche le nom mais pas de diagramme
            validatedChordId = null; // Invalide si pas de voicing
            proposedVoicing = null;
        }

    } else {
        validatedChordId = null;
        proposedVoicing = null;
        displayChord(null, null); // Efface l'affichage
        console.log(`Input invalid: ${chordIdentifier}`);
    }
}
// ==========================================
// Event Listeners & Initialization
// ==========================================

// Tempo & Time Signature Listeners
//tempoInput.addEventListener('change', updateTempo);
//timeSignatureSelect.addEventListener('change', updateTimeSignature);
// ACTION: REMPLACEZ les listeners existants pour tempoInput et timeSignatureSelect

// Update tempo/time signature when changed by user AND save
tempoInput.addEventListener('change', () => {
    _updateTempoInternal(); // Met à jour les variables internes
    // Si on joue, redémarre avec le nouveau tempo
     if (isPlaying) {
        stopPlayback(false); // Arrête sans reset bouton
        startPlayback();     // Redémarre avec nouvelle vitesse
    }
    saveCurrentSongState(); // Sauvegarde le nouvel état
});

timeSignatureSelect.addEventListener('change', () => {
    _updateTimeSignatureInternal(); // Met à jour les variables internes
    // Pas besoin de redémarrer la lecture ici, playTick utilisera la nouvelle valeur de beatsPerMeasure
    saveCurrentSongState(); // Sauvegarde le nouvel état
});


// Chord Input Listener
chordInputElement.addEventListener('input', () => {
    // ... (Listener inchangé - Version avec suggestions et validation) ...
    const inputText = chordInputElement.value.trim();
    suggestionsElement.innerHTML = '';
    validatedChordId = null;
    proposedVoicing = null;
    voicingDownButton.disabled = true;
    voicingUpButton.disabled = true;
    suggestionsElement.style.display = 'none';

    if (inputText.length < 1) {
        displayChord(null, null);
        return;
    }

    const matches = chordDatabase.filter(chord => {
        const inputLower = inputText.toLowerCase();
        return chord.name.toLowerCase().startsWith(inputLower) ||
               (chord.aliases && chord.aliases.some(alias => alias.toLowerCase().startsWith(inputLower)));
    });

    if (matches.length > 0) {
        suggestionsElement.style.display = 'block';
        matches.slice(0, 10).forEach(match => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.textContent = match.name;
            suggestionDiv.classList.add('suggestion-item');
            suggestionDiv.onclick = () => {
                chordInputElement.value = match.name;
                suggestionsElement.innerHTML = '';
                suggestionsElement.style.display = 'none';
                validateAndDisplayChordInput();
            };
            suggestionsElement.appendChild(suggestionDiv);
        });

        const exactMatch = matches.find(m => 
            m.name.toLowerCase() === inputText.toLowerCase() ||
            (m.aliases && m.aliases.some(a => a.toLowerCase() === inputText.toLowerCase()))
        );

        if (exactMatch) {
            validateAndDisplayChordInput();
        } else {
            displayChord(null, null);
        }
    } else {
        suggestionsElement.innerHTML = '<small>Aucun accord trouvé</small>';
        suggestionsElement.style.display = 'block';
        displayChord(null, null);
    }
});
// Add Chord Button Listener
addChordButton.addEventListener('click', () => {
    // ... (Listener inchangé - Version stockant le proposedVoicing) ...
    const duration = parseInt(durationInputElement.value, 10);
    
    if (validatedChordId && proposedVoicing && duration > 0) {
        userSequence.push({
            chordId: validatedChordId,
            duration: duration,
            voicing: proposedVoicing
        });
        console.log("Ajouté à la séquence:", userSequence[userSequence.length - 1]);
        renderSequenceList();
        saveCurrentSongState(); // <<< AJOUT: Sauvegarde après ajout
        chordInputElement.value = '';
        validatedChordId = null;
        proposedVoicing = null;
        suggestionsElement.innerHTML = '';
        suggestionsElement.style.display = 'none';
        displayChord(null, null);
        chordInputElement.focus();
    } else if (!validatedChordId || !proposedVoicing) {
        alert("Veuillez saisir ou sélectionner un accord valide (un voicing doit être affiché).");
        chordInputElement.focus();
    } else {
        alert("Veuillez saisir une durée valide (nombre de temps > 0).");
        durationInputElement.focus();
    }
});

// Clear Sequence Button Listener
clearSequenceButton.addEventListener('click', () => {
    // ... (Listener inchangé - Version réinitialisant highlight) ...
    if (confirm("Êtes-vous sûr de vouloir la chanson ?")) {
        stopPlayback();
        userSequence = [];
        renderSequenceList();
        saveCurrentSongState(); // <<< AJOUT: Sauvegarde après effacement
        console.log("Séquence effacée.");
    }
});

// Voicing +/- Button Listeners
voicingDownButton.addEventListener('click', () => {
    // ... (Listener inchangé - Version fonctionnelle) ...
    if (!validatedChordId || !proposedVoicing) return;

    const alternate = findAlternateVoicing(proposedVoicing, validatedChordId, -1);
    if (alternate) {
        proposedVoicing = alternate;
        const chordData = getChordData(validatedChordId);
        displayChord(chordData ? chordData.name : validatedChordId, proposedVoicing);
    } else {
        console.log("Pas d'autre voicing trouvé vers le bas.");
    }
});

voicingUpButton.addEventListener('click', () => {
    // ... (Listener inchangé - Version fonctionnelle) ...
    if (!validatedChordId || !proposedVoicing) return;
    
    const alternate = findAlternateVoicing(proposedVoicing, validatedChordId, +1);
    if (alternate) {
        proposedVoicing = alternate;
        const chordData = getChordData(validatedChordId);
        displayChord(chordData ? chordData.name : validatedChordId, proposedVoicing);
    } else {
        console.log("Pas d'autre voicing trouvé vers le haut.");
    }
});

playPauseButton.addEventListener('click', () => {
    console.log(">>> Bouton Play/Pause CLIQUE. Etat AVANT action - isPlaying:", isPlaying); // DEBUG
    if (isPlaying) {
        console.log("   -> Appelle stopPlayback()"); // DEBUG
        stopPlayback(); // Utilise resetButtonText = true par défaut
    } else {
        initAudio();
        sequenceToPlay = userSequence;
        console.log("   -> Prépare pour lecture. Longueur séquence:", sequenceToPlay.length); // DEBUG
        if (sequenceToPlay.length > 0) {
            console.log("   -> Appelle startPlayback()"); // DEBUG
            startPlayback();
        } else {
             alert("La chanson est vide. Ajoutez des accords avant de jouer.");
             console.warn("Tentative de lecture d'une chanson vide.");
        }
    }
    // ATTENTION: isPlaying est modifié *dans* start/stop, donc ce log peut être trompeur s'il s'exécute avant la fin de la fonction appelée.
    // console.log(">>> Bouton Play/Pause FIN. Etat APRES action - isPlaying:", isPlaying);
});

// --- Audio Toggle Listener ---
audioEnabledCheckbox.addEventListener('change', () => {
    isAudioEnabled = audioEnabledCheckbox.checked;
    console.log("Audio Enabled state:", isAudioEnabled);
    // Pour l'instant, ça ne fait que logguer l'état.
    // Plus tard, on activera/désactivera le moteur audio ici.
});


// Initialization on Load (devient async pour attendre la BDD)
document.addEventListener('DOMContentLoaded', async () => { // <<< Ajout de async
    console.log("DOM chargé initialisation...");

    await loadChordDatabase(); // <<< Attend que le JSON soit chargé

    // Le reste de l'initialisation (qui peut maintenant utiliser chordDatabase via les fonctions getChordData etc.)
    loadCurrentSongState();
    audioEnabledCheckbox.checked = isAudioEnabled;
    voicingDownButton.disabled = true;
    voicingUpButton.disabled = true;

    console.log("Initialisation terminée.");
});


// --- Song Management Button Listeners ---

saveSongButton.addEventListener('click', () => {
    const songName = songNameInput.value.trim();
    if (!songName) {
        alert("Veuillez entrer un nom pour la chanson avant de sauvegarder.");
        songNameInput.focus();
        return;
    }

    let savedSongs = {};
    try {
        const storedData = localStorage.getItem(SAVED_SONGS_KEY);
        if (storedData) {
            savedSongs = JSON.parse(storedData);
        }
    } catch (error) {
        console.error("Erreur lecture chansons sauvegardées:", error);
        savedSongs = {};
    }

    // Crée l'objet état de la chanson actuelle
    const currentSongState = {
        tempo: tempoBPM,
        timeSig: timeSignature,
        song: userSequence
    };

    // Ajoute ou met à jour la chanson dans l'objet
    savedSongs[songName] = currentSongState;

    // Sauvegarde l'objet complet
    try {
        localStorage.setItem(SAVED_SONGS_KEY, JSON.stringify(savedSongs));
        console.log(`Chanson "${songName}" sauvegardée.`);
        alert(`Chanson "${songName}" sauvegardée avec succès !`);
        populateSavedSongsList(); // Met à jour la liste déroulante
    } catch (error) {
        console.error("Erreur sauvegarde chanson nommée:", error);
        alert("Erreur lors de la sauvegarde de la chanson.");
    }
});

loadSongButton.addEventListener('click', () => {
    const selectedSongName = savedSongsSelect.value;
    if (!selectedSongName) {
        alert("Veuillez sélectionner une chanson à charger.");
        return;
    }

    try {
        const storedData = localStorage.getItem(SAVED_SONGS_KEY);
        if (storedData) {
            const savedSongs = JSON.parse(storedData);
            if (savedSongs[selectedSongName]) {
                console.log(`Chargement de la chanson "${selectedSongName}"...`);
                applyLoadedState(savedSongs[selectedSongName], selectedSongName); // Applique l'état chargé
                // La chanson chargée devient la chanson courante (et sera auto-sauvegardée)
                saveCurrentSongState();
            } else {
                alert(`Erreur: Chanson "${selectedSongName}" non trouvée dans les données sauvegardées.`);
                 populateSavedSongsList(); // Rafraîchit la liste au cas où
            }
        } else {
             alert("Aucune chanson sauvegardée n'a été trouvée.");
        }
    } catch (error) {
        console.error("Erreur chargement chanson nommée:", error);
        alert("Erreur lors du chargement de la chanson.");
    }
});

deleteSongButton.addEventListener('click', () => {
    const selectedSongName = savedSongsSelect.value;
    if (!selectedSongName) {
        alert("Veuillez sélectionner une chanson à supprimer.");
        return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la chanson "${selectedSongName}" ?`)) {
        try {
            const storedData = localStorage.getItem(SAVED_SONGS_KEY);
            if (storedData) {
                let savedSongs = JSON.parse(storedData);
                if (savedSongs[selectedSongName]) {
                    delete savedSongs[selectedSongName]; // Supprime l'entrée
                    localStorage.setItem(SAVED_SONGS_KEY, JSON.stringify(savedSongs)); // Re-sauvegarde l'objet modifié
                    console.log(`Chanson "${selectedSongName}" supprimée.`);
                    alert(`Chanson "${selectedSongName}" supprimée.`);
                    populateSavedSongsList(); // Met à jour la liste déroulante
                    // Optionnel: Effacer l'espace de travail si la chanson supprimée était chargée?
                    if(songNameInput.value === selectedSongName) {
                        songNameInput.value = "";
                        // applyLoadedState({ tempo: 100, timeSig: "4/4", song: [] }); // Reset workspace
                        // saveCurrentSongState();
                    }
                } else {
                     alert(`Erreur: Chanson "${selectedSongName}" non trouvée.`);
                }
            }
        } catch (error) {
            console.error("Erreur suppression chanson nommée:", error);
            alert("Erreur lors de la suppression de la chanson.");
        }
    }
});

/** Sauvegarde l'état actuel (tempo, mesure, chanson) dans localStorage */
function saveCurrentSongState() {
    const state = {
        tempo: tempoBPM,
        timeSig: timeSignature,
        song: userSequence // Utilise la séquence utilisateur actuelle
    };
    try {
        // Convertit l'objet en chaîne JSON et sauvegarde
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        // console.log("Chanson sauvegardée dans localStorage."); // Optionnel: pour débugger
    } catch (error) {
        console.error("Erreur lors de la sauvegarde dans localStorage:", error);
        // Pourrait arriver si le stockage est plein ou non supporté
    }
}
// ACTION: Ajoutez cette NOUVELLE fonction dans script.js

/** Charge le dernier état sauvegardé depuis localStorage au démarrage */
function loadCurrentSongState() {
    console.log("Tentative de chargement depuis localStorage...");
    try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const loadedState = JSON.parse(savedData);
            console.log("Données chargées:", loadedState);

            // Restaure l'état (avec valeurs par défaut si invalide/manquant)
            tempoBPM = parseInt(loadedState.tempo, 10) || 100;
            timeSignature = loadedState.timeSig || "4/4";
            userSequence = Array.isArray(loadedState.song) ? loadedState.song : [];

            // --- Met à jour l'interface utilisateur ---
            tempoInput.value = tempoBPM;
            timeSignatureSelect.value = timeSignature;
            renderSequenceList(); // Affiche la chanson chargée

            // --- Met à jour les variables calculées (SANS SAUVEGARDER) ---
             _updateTempoInternal(); // Recalcule beatDurationMs etc.
             _updateTimeSignatureInternal(); // Recalcule beatsPerMeasure etc.

            // Affiche le premier accord si la chanson n'est pas vide
            if (userSequence.length > 0 && userSequence[0].voicing) {
               const firstChordData = getChordData(userSequence[0].chordId);
               // Affiche sans info de pivot initialement
               displayChord(firstChordData ? firstChordData.name : userSequence[0].chordId, userSequence[0].voicing, new Set());
            } else {
               displayChord(null, null); // Efface si vide
            }
            console.log("Chanson chargée avec succès.");

        } else {
            console.log("Aucune chanson sauvegardée trouvée, utilise les valeurs par défaut.");
            // Assure que l'UI reflète les valeurs par défaut si rien n'est chargé
             tempoInput.value = tempoBPM;
             timeSignatureSelect.value = timeSignature;
             renderSequenceList(); // Affiche "(Séquence vide)" renommé en "(Chanson vide)" si renderSequenceList est à jour
             displayChord(null,null);
        }
    } catch (error) {
        console.error("Erreur lors du chargement depuis localStorage:", error);
        // En cas d'erreur (ex: JSON corrompu), on réinitialise
        userSequence = [];
        tempoBPM = 100;
        timeSignature = "4/4";
        tempoInput.value = tempoBPM;
        timeSignatureSelect.value = timeSignature;
        renderSequenceList();
        displayChord(null, null);
    }
}

/** Récupère les chansons sauvegardées et peuple la liste déroulante */
function populateSavedSongsList() {
    let savedSongs = {};
    try {
        const storedData = localStorage.getItem(SAVED_SONGS_KEY);
        if (storedData) {
            savedSongs = JSON.parse(storedData);
        }
    } catch (error) {
        console.error("Erreur lors de la lecture des chansons sauvegardées:", error);
        savedSongs = {}; // Reset en cas d'erreur
    }

    // Vide la liste actuelle (sauf la première option)
    savedSongsSelect.innerHTML = '<option value="">-- Charger une chanson --</option>';

    // Ajoute chaque chanson sauvegardée comme une option
    const songNames = Object.keys(savedSongs).sort(); // Trie par nom
    songNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        savedSongsSelect.appendChild(option);
    });
    console.log("Liste des chansons chargées dans le select:", songNames);
}

// ACTION: Ajoutez cette NOUVELLE fonction interne

/** Met à jour l'état global et l'UI à partir d'un objet état chargé */
function applyLoadedState(loadedState, songName = "") {
    console.log(`Application de l'état pour: ${songName || 'Session Actuelle'}`);
    stopPlayback(); // Arrête la lecture avant de charger

    tempoBPM = parseInt(loadedState.tempo, 10) || 100;
    timeSignature = loadedState.timeSig || "4/4";
    userSequence = Array.isArray(loadedState.song) ? loadedState.song : [];

    // Met à jour l'UI
    tempoInput.value = tempoBPM;
    timeSignatureSelect.value = timeSignature;
    songNameInput.value = songName; // Met le nom de la chanson chargée dans l'input
    renderSequenceList();

    // Met à jour les variables calculées
     _updateTempoInternal();
     _updateTimeSignatureInternal();

    // Affiche le premier accord si la chanson n'est pas vide
    if (userSequence.length > 0 && userSequence[0].voicing) {
       const firstChordData = getChordData(userSequence[0].chordId);
       displayChord(firstChordData ? firstChordData.name : userSequence[0].chordId, userSequence[0].voicing, new Set());
    } else {
       displayChord(null, null);
    }
}

// ACTION: REMPLACEZ la fonction loadCurrentSongState existante par celle-ci
// Elle charge maintenant UNIQUEMENT l'auto-sauvegarde de la session
function loadCurrentSongState() {
   console.log("Chargement de l'auto-sauvegarde (session)...");
   let loadedSuccessfully = false;
   try {
       const savedData = localStorage.getItem(LOCAL_STORAGE_KEY); // Auto-save key
       if (savedData) {
           const loadedState = JSON.parse(savedData);
           applyLoadedState(loadedState); // Applique l'état chargé
           loadedSuccessfully = true;
           console.log("Session précédente restaurée.");
       }
   } catch (error) {
       console.error("Erreur lors du chargement de la session:", error);
   }

   if (!loadedSuccessfully) {
        console.log("Aucune session précédente trouvée ou erreur, utilise les valeurs par défaut.");
        // Assure que l'UI et l'état sont par défaut si le chargement échoue
        applyLoadedState({ tempo: 100, timeSig: "4/4", song: [] });
   }

   // Peuple aussi la liste des chansons sauvegardées (celles nommées)
   populateSavedSongsList();
}

/** Initialise l'AudioContext (doit être appelé après une interaction utilisateur) */
function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext initialisé.");
        } catch (e) {
            console.error("API Web Audio non supportée par ce navigateur.", e);
            alert("Votre navigateur ne supporte pas l'API Web Audio nécessaire pour le son.");
            // Désactive l'option audio si l'initialisation échoue
            isAudioEnabled = false;
            audioEnabledCheckbox.checked = false;
            audioEnabledCheckbox.disabled = true;
        }
    }
}

// ACTION: Ajoutez cette NOUVELLE fonction (par exemple après initAudio)

/** Joue un son synthétisé simple pour une note donnée */
function playNoteSound(noteName) {
    // Vérifie si l'audio est activé et initialisé
    if (!isAudioEnabled || !audioCtx || audioCtx.state === 'suspended') {
        // Si suspendu (arrive parfois), essaie de reprendre
        if(audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return;
    }

    // Trouve la fréquence (simplifié: prend octave 4 par défaut)
    const frequency = noteFrequencies[noteName] || noteFrequencies[noteName.toUpperCase()] || noteFrequencies['A4']; // Prend A4 si inconnu

    if (!frequency) {
        console.warn(`Fréquence non trouvée pour la note: ${noteName}`);
        return;
    }

    // Crée les noeuds audio
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Configure l'oscillateur
    oscillator.type = 'triangle'; // 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Configure le gain (volume et enveloppe très simple pour éviter clic)
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime); // Commence à 0
    gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.01); // Rapide montée (Attack)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5); // Descente (Decay/Release)

    // Connecte les noeuds : oscillator -> gain -> sortie
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Démarre et arrête l'oscillateur
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.55); // Arrête après la descente
}

// ==========================================
// PWA Service Worker Registration
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js') // Chemin relatif au script.js
        .then(registration => {
          console.log('Service Worker enregistré avec succès ! Scope:', registration.scope);
        })
        .catch(err => {
          console.error('Échec de l\'enregistrement du Service Worker:', err);
        });
    });
  } else {
      console.log('Service Worker non supporté par ce navigateur.');
  }
  
  // ==========================================
  // FIN DU SCRIPT
  // ==========================================