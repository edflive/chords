## Documentation : Application Guitare "Gratte & Chante"

**Version :** 0.9 (État au 06/04/2025)

### 1. Introduction et Objectif

"Guitare - Gratte & Chante" est une application web progressive (PWA) conçue pour aider les guitaristes à :
* Créer et visualiser des séquences d'accords (appelées "Chansons").
* Pratiquer les enchaînements d'accords de manière fluide.
* Identifier les doigtés (voicings) optimisés pour minimiser les mouvements de doigts.
* Obtenir un retour visuel clair sur le positionnement des doigts, les cordes à jouer et le rythme.

L'application est conçue pour fonctionner sur navigateurs modernes (ordinateurs, tablettes) et peut être "installée" pour une utilisation hors ligne.

### 2. Fonctionnalités Clés Implémentées

* **Création de Chansons :**
    * Saisie intuitive d'accords avec suggestions dynamiques (`#chord-input`, `#chord-suggestions`).
    * Définition de la durée de chaque accord en nombre de temps (`#chord-duration`).
    * Ajout des accords à la liste de la chanson actuelle (`#add-chord-btn`, `#sequence-list`).
    * Possibilité d'effacer la chanson en cours (`#clear-sequence-btn`).

* **Visualisation Avancée des Accords (`chord-display-area`) :**
    * Affichage du nom de l'accord courant/proposé (`#displayed-chord-name`).
    * **Diagramme Classique (`#chord-diagram`) :** Grille standard indiquant frettes, cordes, doigts (numéros 1-4 ou "T" pour pouce), cordes à vide ('O') et cordes mutées ('X'). S'adapte pour afficher les accords plus haut sur le manche avec indication de la frette de départ et gestion des barrés.
    * **Visualisation sur Manche (`#fretboard-visualization`) :** Représentation plus réaliste du manche avec positionnement des doigts, cordes et frettes (Mi aigu en haut), incluant les repères de touche standards.

* **Optimisation et Variation des Voicings :**
    * Lors de l'ajout d'un accord, l'application propose automatiquement le voicing jugé le plus "économique" par rapport à l'accord précédent (minimisation des mouvements, basé sur `findBestNextVoicing`).
    * Les boutons **Voicing +/-** (`#voicing-down-btn`, `#voicing-up-btn`) permettent de naviguer parmi les autres voicings disponibles pour l'accord proposé (plus grave ou plus aigu sur le manche, basé sur `findAlternateVoicing`). Le voicing choisi est celui qui sera ajouté à la chanson.

* **Lecture et Métronome :**
    * Lecture de la chanson créée au **Tempo** (BPM) et selon la **Mesure** (temps par mesure) définis par l'utilisateur (`#tempo`, `#time-signature`).
    * Bouton **Play/Pause** (`#sequence-play-pause-btn`) pour démarrer et arrêter la lecture (reprend là où elle s'est arrêtée).
    * **Métronome Visuel (`#metronome-indicator`) :** Un indicateur circulaire affiche le numéro du temps courant dans la mesure et change de couleur (Rouge pour temps 1, Orange/Jaune pour les autres) en rythme.

* **Aides Visuelles pendant la Lecture :**
    * **Highlight :** L'accord en cours de lecture est mis en évidence dans la liste de la chanson (`#sequence-list`).
    * **Doigts Pivots :** Les doigts qui restent sur la même case pour le même doigt entre deux accords consécutifs sont affichés dans une couleur différente (vert) sur les diagrammes pour faciliter la transition.

* **Gestion des Chansons (Sauvegarde/Chargement) :**
    * **Auto-Sauvegarde :** La chanson en cours d'édition (incluant tempo et mesure) est automatiquement sauvegardée dans le `localStorage` du navigateur (`currentGuitarSong`). Elle est rechargée au démarrage suivant.
    * **Chansons Nommées (`song-management-area`) :**
        * Possibilité de donner un nom à la chanson actuelle (`#song-name-input`).
        * Bouton pour sauvegarder explicitement la chanson sous ce nom (`#save-song-btn`).
        * Liste déroulante (`#saved-songs-select`) affichant toutes les chansons nommées sauvegardées.
        * Bouton pour charger (`#load-song-btn`) une chanson sélectionnée dans la liste, écrasant la chanson en cours.
        * Bouton pour supprimer (`#delete-song-btn`) une chanson sauvegardée de la liste et du stockage. (Stockage dans `localStorage` sous `guitarAppSavedSongs`).

* **Progressive Web App (PWA) :**
    * Utilise un Manifest (`manifest.json`) et un Service Worker (`service-worker.js`).
    * Permet l'installation sur l'appareil ("Ajouter à l'écran d'accueil").
    * Fonctionne **hors ligne** une fois les fichiers mis en cache par le Service Worker.
    * Nécessite des icônes (`icon-192.png`, `icon-512.png`) fournies par l'utilisateur.

* **Préparation Audio :**
    * Un interrupteur Audio On/Off (`#audio-enabled`) est présent dans l'interface.
    * L'infrastructure pour l'API Web Audio (`AudioContext`) est initialisée au premier clic sur Play.
    * Une fonction `playNoteSound` existe mais ne joue qu'un son de synthèse basique pour la fondamentale (fonctionnalité audio complète à implémenter).

### 3. Structure Technique et Fonctions Principales (`script.js`)

L'application est structurée autour de plusieurs logiques clés dans `script.js` :

* **Gestion d'État :** Variables globales pour `tempoBPM`, `timeSignature`, `isPlaying`, `userSequence`, `chordDatabase`, `proposedVoicing`, `beatCountSinceStart`, `isAudioEnabled`, etc.
* **Données d'Accords :**
    * `chordDatabase` (chargé depuis `chords.json`).
    * `loadChordDatabase()`: Charge le JSON de manière asynchrone via `Workspace`.
    * `getChordData()`: Recherche un accord dans la base par nom ou alias.
    * `getVoicingsForChord()`: Récupère les voicings pour un accord donné.
* **Logique de Voicing :**
    * `calculateVoicingPosition()`: Estime la position d'un voicing sur le manche.
    * `calculateTransitionCost()`: Calcule le "coût" (effort) pour passer d'un voicing à un autre (logique simplifiée).
    * `findBestNextVoicing()`: Trouve le voicing suivant le plus "proche" du précédent.
    * `findAlternateVoicing()`: Recherche des voicings alternatifs (+/- aigus/graves).
    * `identifyPivotFingers()`: Détecte les doigts immobiles entre deux voicings.
* **Affichage / Rendu UI :**
    * `displayChord()`: Fonction centrale mettant à jour l'affichage principal (nom, diagrammes) avec un voicing et des pivots donnés.
    * `drawChordDiagram()`: Dessine le diagramme grille en SVG (gère translation, barrés, pivots...).
    * `drawFretboardVisualization()`: Dessine le manche en SVG (gère inversion, pivots...).
    * `renderSequenceList()`: Met à jour la liste `<ul>` de la chanson.
    * `updateMetronomeVisual()`: Met à jour l'indicateur de métronome (couleur, numéro).
* **Moteur de Lecture :**
    * `startPlayback()`: Démarre/Reprend la lecture (`setInterval`).
    * `stopPlayback()`: Arrête la lecture (`clearInterval`).
    * `playTick()`: Fonction exécutée à chaque battement (met à jour affichage, métronome, audio basique, highlight, pivots).
    * `_updateTempoInternal()`, `_updateTimeSignatureInternal()`: Mettent à jour les variables liées au rythme.
* **Gestion Sauvegarde/Chargement :**
    * `saveCurrentSongState()`: Sauvegarde l'état courant dans `localStorage` (auto-save).
    * `loadCurrentSongState()`: Charge l'état auto-sauvegardé au démarrage.
    * `applyLoadedState()`: Fonction interne pour appliquer un état chargé à l'application.
    * `populateSavedSongsList()`: Remplit la liste déroulante des chansons nommées.
    * Listeners pour les boutons Save/Load/Delete nommés.
* **Gestionnaires d'Événements :** Fonctions qui réagissent aux clics (`addEventListener` pour les boutons) et aux changements (`addEventListener` pour les inputs/select).
* **Initialisation :** Le listener `DOMContentLoaded` qui orchestre le démarrage (chargement BDD, chargement état, initialisation UI).
* **PWA :** Logique d'enregistrement du Service Worker.

### 4. Fichiers du Projet

* `index.html`: Structure HTML de la page.
* `style.css`: Styles CSS pour l'apparence et la mise en page.
* `script.js`: Toute la logique JavaScript de l'application.
* `chords.json`: **Fichier de données externe** contenant la bibliothèque d'accords (à enrichir par l'utilisateur).
* `manifest.json`: Fichier de configuration pour la PWA.
* `service-worker.js`: Script pour la gestion du cache et le fonctionnement hors ligne (PWA).
* `icon-192.png`, `icon-512.png`: Icônes de l'application (à fournir par l'utilisateur).

### 5. Améliorations Futures Possibles

* Implémentation complète de l'audio (lecture d'accords réalistes via samples, métronome sonore).
* Enrichissement majeur de `chords.json`.
* Ajout de l'édition de la séquence (supprimer/insérer/modifier un accord).
* Amélioration de l'algorithme de coût de transition et détection de pivots.
* Options de personnalisation (thèmes, sons...).
* Meilleure gestion des erreurs.
