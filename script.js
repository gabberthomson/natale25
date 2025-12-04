document.addEventListener('DOMContentLoaded', () => {
    // Variabili DOM
    const photo = document.getElementById('background-photo');
    const patternDisplay = document.getElementById('pattern-display');
    const feedbackMessage = document.getElementById('feedback-message');
    
    // Elementi di scelta iniziale RIMOSSI
    // const choiceContainer = document.getElementById('choice-container');
    // const choiceInput = document.getElementById('attempt-choice');
    // const choiceButton = document.getElementById('choice-button');

    // Pulsante di avvio effettivo del gioco 
    const startGameButton = document.getElementById('start-game-button');

    const colorButtons = document.querySelectorAll('.color-button');
    
    // Elementi Audio
    const beepSound = document.getElementById('beep-sound');
    const dingSound = document.getElementById('ding-sound');
    const crashSound = document.getElementById('crash-sound');
    const bellSound = document.getElementById('bell-sound'); 
    
    let countdownInterval = null; 

    // Mappa per associare il colore all'ID del pulsante
    const colorToBtnId = {
        'Rosso': 'btn-red',
        'Verde': 'btn-green',
        'Blu': 'btn-blue'
    };

    // Variabili di Gioco
    const COLORS = ['Rosso', 'Verde', 'Blu'];
    const MIN_WINS = 3;                 
    const WIN_KEY = "1520";             
    const FAIL_KEY = "2202";            
    
    // FISSATO A 5 ROUND
    const MAX_ROUNDS = 5;           
    
    // Sequenza di tempi in millisecondi (3.5s, 3.0s, 2.5s, 2.0s, 1.5s, 1.0s)
    const TIME_LIMITS_MS = [3500, 3000, 2500, 2000, 1500, 1000]; 

    let requiredPattern = [];
    let userAttempt = [];
    let gameActive = false;
    let roundsLeft = MAX_ROUNDS; // Inizializzato a 5
    let successCount = 0;               

    // ----------------------------------------------------
    // FUNZIONI AUDIO E VISUALI
    // ----------------------------------------------------

    /** Funzione per attivare una vibrazione sul dispositivo mobile */
    function triggerHapticFeedback() {
        if (navigator.vibrate) {
            navigator.vibrate(50); 
        }
    }
    
    /** Tenta di sbloccare l'audio e la vibrazione la prima volta che si preme INIZIA */
    function unlockMedia() {
        triggerHapticFeedback();
        
        try {
            // Tenta lo sblocco per tutti gli audio necessari
            [beepSound, dingSound, crashSound, bellSound].forEach(audio => {
                const tempAudio = new Audio(audio.querySelector('source').src);
                tempAudio.volume = 0;
                tempAudio.play().then(() => {
                    tempAudio.pause();
                    tempAudio.remove();
                    audio.load();
                }).catch(e => {
                     // console.warn("Sblocco audio fallito", e);
                });
            });
        } catch (e) {
             console.error("Errore nello sblocco media:", e);
        }
    }
    
    /** Avvia il countdown sonoro con 5 beep distribuiti nel tempo limite */
    function startCountdownBeeps(limitMs) {
        stopCountdownBeeps(); 
        
        const totalBeeps = 5;
        const totalIntervals = totalBeeps - 1; 
        
        const intervalDuration = limitMs / totalIntervals;
        
        let beepsLeft = totalBeeps;
        
        // Emette il primo beep immediatamente
        if (beepsLeft > 0) {
            beepSound.currentTime = 0;
            beepSound.play().catch(e => {}); 
            beepsLeft--;
        }

        countdownInterval = setInterval(() => {
            if (beepsLeft > 0 && gameActive) {
                beepSound.currentTime = 0; 
                beepSound.play().catch(e => {});
                beepsLeft--;
            } else {
                clearInterval(countdownInterval);
            }
        }, intervalDuration); 
    }
    
    /** Resetta il countdown sonoro */
    function stopCountdownBeeps() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    /** Applica e rimuove la classe 'flash' rapidamente al click del bottone E attiva la vibrazione */
    function flashInputButton(btn) {
        btn.classList.add('flash');
        triggerHapticFeedback(); 
        setTimeout(() => {
            btn.classList.remove('flash');
        }, 80); 
    }
    
    // ----------------------------------------------------
    // FUNZIONI DI GIOCO
    // ----------------------------------------------------

    /** Genera un pattern casuale di 3 colori. */
    function generatePattern() {
        requiredPattern = [];
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * COLORS.length);
            requiredPattern.push(COLORS[randomIndex]);
        }
        return requiredPattern; 
    }

    /** Mostra la sequenza luminosa dei pulsanti (CON DING.MP3) */
    function flashPattern(patternArray) {
        let delay = 0;
        colorButtons.forEach(btn => btn.disabled = true);
        
        patternArray.forEach((color) => {
            const btn = document.getElementById(colorToBtnId[color]);
            
            // 1. Aggiungi il flash (ON time: 800ms)
            setTimeout(() => {
                btn.classList.add('flash');
                // DING per la sequenza
                dingSound.currentTime = 0;
                dingSound.play().catch(e => {});
            }, delay);
            
            // 2. Rimuovi il flash 
            delay += 800; 
            
            setTimeout(() => {
                btn.classList.remove('flash');
            }, delay);
            
            // 3. Pausa tra i flash (Pausa: 300ms)
            delay += 300; 
        });

        return delay;
    }

    /** Avvia il gioco dopo la scelta iniziale */
    function startGame() {
        unlockMedia(); 

        if (roundsLeft <= 0) {
            checkEndState();
            return; 
        }

        const currentAttemptIndex = MAX_ROUNDS - roundsLeft;
        
        // Determina il tempo limite corrente. 
        const currentLimitMs = TIME_LIMITS_MS[currentAttemptIndex]; 
        const currentLimitSec = currentLimitMs / 1000;

        startGameButton.style.display = 'none';
        userAttempt = [];
        
        // Nomenclatura aggiornata: ROUND
        feedbackMessage.textContent = `Round ${currentAttemptIndex + 1} di ${MAX_ROUNDS}. Tempo: ${currentLimitSec}s. Concentrati!`;
        patternDisplay.textContent = 'Preparati...';
        
        setTimeout(() => {
            const pattern = generatePattern();
            const flashDuration = flashPattern(pattern);
            
            setTimeout(() => {
                gameActive = true;
                
                photo.style.transitionDuration = `${currentLimitSec.toFixed(1)}s`; 
                photo.style.opacity = '0'; 
                
                colorButtons.forEach(btn => btn.disabled = false);
                patternDisplay.textContent = 'AGISCI SUBITO!';
                feedbackMessage.textContent = 'Vai!';
                
                startCountdownBeeps(currentLimitMs); 

                const gameTimeout = setTimeout(handleLoss, currentLimitMs); 

                colorButtons.forEach(btn => btn.onclick = (e) => {
                    flashInputButton(btn); 
                    
                    if (gameActive) {
                        handleInput(btn.dataset.color, gameTimeout);
                    }
                });

            }, flashDuration); 
        }, 1500); 
    }

    /** Gestisce il click su un pulsante colore (SILENTE) */
    function handleInput(color, timeoutId) {
        if (!gameActive) return;

        if (color === requiredPattern[userAttempt.length]) {
            userAttempt.push(color);

            if (userAttempt.length === requiredPattern.length) {
                clearTimeout(timeoutId); 
                handleWin();
            }
        } else {
            // ERRORE DI SEQUENZA -> Attiva il CRASH SOUND
            crashSound.currentTime = 0;
            crashSound.play().catch(e => {});
            clearTimeout(timeoutId);
            handleLoss(false); 
        }
    }

    /** Gestisce il singolo successo (CON BELL.MP3) */
    function handleWin() {
        gameActive = false;
        roundsLeft--; 
        successCount++;
        stopCountdownBeeps(); 
        
        // SUONO DI VITTORIA ROUND
        bellSound.currentTime = 0;
        bellSound.play().catch(e => {});
        
        endAttemptCleanup();
    }

    /** Gestisce il singolo fallimento (SILENTE) */
    function handleLoss(isTimeout = true) {
        gameActive = false;
        roundsLeft--; 
        stopCountdownBeeps(); 
        
        // Se è un timeout, riproduce il crash sound
        if(isTimeout) {
            crashSound.currentTime = 0;
            crashSound.play().catch(e => {});
        }
        
        endAttemptCleanup();
    }
    
    /** Logica eseguita alla fine di ogni round */
    function endAttemptCleanup() {
        colorButtons.forEach(btn => btn.onclick = null);
        colorButtons.forEach(btn => btn.disabled = true);

        patternDisplay.textContent = 'Risultato registrato.';
        // Nomenclatura aggiornata: ROUND
        feedbackMessage.textContent = `Round completati: ${MAX_ROUNDS - roundsLeft}/${MAX_ROUNDS}.`;
        
        if (roundsLeft <= 0) {
            setTimeout(checkEndState, 2000); 
        } else {
            setTimeout(() => {
                photo.style.transitionDuration = '1.0s'; 
                photo.style.opacity = '1'; 
                startGameButton.style.display = 'block';
                patternDisplay.textContent = 'Premi INIZIA GIOCO';
                colorButtons.forEach(btn => btn.disabled = false); 
            }, 2000); 
        }

        requiredPattern = [];
        userAttempt = [];
    }
    
    /** Controlla il risultato finale dopo i round */
    function checkEndState() {
        photo.style.opacity = '1'; 
        startGameButton.style.display = 'none';

        if (successCount >= MIN_WINS) {
            patternDisplay.textContent = WIN_KEY; 
        } else {
            patternDisplay.textContent = FAIL_KEY;
        }
        
        feedbackMessage.textContent = `Questo è il codice. Hai ottenuto ${successCount} sequenze corrette. Buona fortuna.`; 
        
        colorButtons.forEach(btn => btn.disabled = true);
    }

    // ----------------------------------------------------
    // INIZIALIZZAZIONE 
    // ----------------------------------------------------
    
    // NESSUNA SCELTA INIZIALE: INIZIALIZZAZIONE DIRETTA A 5 ROUND
    
    // Listener per avviare il gioco effettivo
    startGameButton.addEventListener('click', startGame);

    // Gestione input mobile
    colorButtons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault(); 
            const clickEvent = new Event('click');
            btn.dispatchEvent(clickEvent); 
        });
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
});