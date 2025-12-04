document.addEventListener('DOMContentLoaded', () => {
    // Variabili DOM
    const photo = document.getElementById('background-photo');
    const patternDisplay = document.getElementById('pattern-display');
    const feedbackMessage = document.getElementById('feedback-message');
    const startButton = document.getElementById('start-button');
    const colorButtons = document.querySelectorAll('.color-button');
    const beepSound = document.getElementById('beep-sound');
    
    // VARIABILE PER IL COUNTDOWN SONORO
    let countdownInterval = null; 

    // Mappa per associare il colore all'ID del pulsante
    const colorToBtnId = {
        'Rosso': 'btn-red',
        'Verde': 'btn-green',
        'Blu': 'btn-blue'
    };

    // Variabili di Gioco
    const COLORS = ['Rosso', 'Verde', 'Blu'];
    const MAX_ATTEMPTS = 5;             
    const MIN_WINS = 3;                 
    const WIN_KEY = "1520";             
    const FAIL_KEY = "2202";            
    
    // Sequenza di tempi in millisecondi (per i 5 tentativi: 3.5s, 3.0s, 2.5s, 2.0s, 1.5s)
    const TIME_LIMITS_MS = [3500, 3000, 2500, 2000, 1500]; 

    let requiredPattern = [];
    let userAttempt = [];
    let gameActive = false;
    let attemptsLeft = MAX_ATTEMPTS;
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
        // 1. Sblocco Vibrazione (immediato)
        triggerHapticFeedback();
        
        // 2. Sblocco Audio: prova a creare e riprodurre un nuovo elemento audio
        try {
            const tempAudio = new Audio('beep.mp3');
            tempAudio.volume = 0; 
            
            tempAudio.play().then(() => {
                tempAudio.pause();
                tempAudio.remove(); 
                beepSound.load(); 
            }).catch(e => {
                // Fallback all'audio principale con volume basso per tentare lo sblocco
                beepSound.volume = 0.05; 
                beepSound.play().then(() => beepSound.pause()).catch(e => {});
                beepSound.volume = 1; 
            });
        } catch (e) {
             console.error("Errore costruttore Audio:", e);
        }
    }
    
    /** Avvia il countdown sonoro con 5 beep distribuiti nel tempo limite */
    function startCountdownBeeps(limitMs) {
        stopCountdownBeeps(); 
        
        const totalBeeps = 5;
        const totalIntervals = totalBeeps - 1; 
        
        // Calcola l'intervallo esatto tra i beep
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
                // Reset del tempo per garantire la riproduzione del beep
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
        triggerHapticFeedback(); // Feedback tattile
        // NESSUN BEEP QUI
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

    /** Mostra la sequenza luminosa dei pulsanti (DURATA MODIFICATA) */
    function flashPattern(patternArray) {
        let delay = 0;
        colorButtons.forEach(btn => btn.disabled = true);
        
        patternArray.forEach((color) => {
            const btn = document.getElementById(colorToBtnId[color]);
            
            // 1. Aggiungi il flash (ON time: 800ms)
            setTimeout(() => {
                btn.classList.add('flash');
                // BEEP RIMOSSO: SOLO LUCE DURANTE LA SEQUENZA
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

    /** Avvia il gioco dopo il click su INIZIA. */
    function startGame() {
        unlockMedia(); 

        if (attemptsLeft <= 0) {
            checkEndState();
            return; 
        }

        const currentAttemptIndex = MAX_ATTEMPTS - attemptsLeft;
        
        // Determina il tempo limite corrente e lo converte in secondi per la transizione
        const currentLimitMs = TIME_LIMITS_MS[currentAttemptIndex] || 1000;
        const currentLimitSec = currentLimitMs / 1000;

        startButton.style.display = 'none';
        userAttempt = [];
        
        feedbackMessage.textContent = `Tentativo ${currentAttemptIndex + 1} di ${MAX_ATTEMPTS}. Tempo: ${currentLimitSec}s. Concentrati!`;
        patternDisplay.textContent = 'Preparati...';
        
        setTimeout(() => {
            const pattern = generatePattern();
            const flashDuration = flashPattern(pattern);
            
            setTimeout(() => {
                gameActive = true;
                
                // Imposta la transizione CSS per il nuovo tempo e avvia la dissolvenza
                photo.style.transitionDuration = `${currentLimitSec.toFixed(1)}s`; 
                photo.style.opacity = '0'; 
                
                colorButtons.forEach(btn => btn.disabled = false);
                patternDisplay.textContent = 'AGISCI SUBITO!';
                feedbackMessage.textContent = 'Vai!';
                
                startCountdownBeeps(currentLimitMs); // AVVIA I BEEP CADENZATI 

                const gameTimeout = setTimeout(handleLoss, currentLimitMs); 

                colorButtons.forEach(btn => btn.onclick = (e) => {
                    flashInputButton(btn); // Solo flash e vibrazione
                    
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
            clearTimeout(timeoutId);
            handleLoss(false); 
        }
    }

    /** Gestisce il singolo successo (SILENTE) */
    function handleWin() {
        gameActive = false;
        attemptsLeft--;
        successCount++;
        stopCountdownBeeps(); 
        endAttemptCleanup();
    }

    /** Gestisce il singolo fallimento (SILENTE) */
    function handleLoss(isTimeout = true) {
        gameActive = false;
        attemptsLeft--;
        stopCountdownBeeps(); 
        endAttemptCleanup();
    }
    
    /** Logica eseguita alla fine di ogni tentativo */
    function endAttemptCleanup() {
        colorButtons.forEach(btn => btn.onclick = null);
        colorButtons.forEach(btn => btn.disabled = true);

        patternDisplay.textContent = 'Risultato registrato.';
        feedbackMessage.textContent = `Tentativi completati: ${MAX_ATTEMPTS - attemptsLeft}/${MAX_ATTEMPTS}.`;
        
        if (attemptsLeft <= 0) {
            setTimeout(checkEndState, 2000); 
        } else {
            setTimeout(() => {
                photo.style.transitionDuration = '1.0s'; 
                photo.style.opacity = '1'; 
                startButton.style.display = 'block';
                patternDisplay.textContent = 'Premi INIZIA';
                colorButtons.forEach(btn => btn.disabled = false); 
            }, 2000); 
        }

        requiredPattern = [];
        userAttempt = [];
    }
    
    /** Controlla il risultato finale dopo 5 tentativi */
    function checkEndState() {
        photo.style.opacity = '1'; 
        startButton.style.display = 'none';

        if (successCount >= MIN_WINS) {
            patternDisplay.textContent = WIN_KEY; 
        } else {
            patternDisplay.textContent = FAIL_KEY;
        }
        
        feedbackMessage.textContent = 'Questo è il codice. Buona fortuna.'; 
        
        colorButtons.forEach(btn => btn.disabled = true);
    }

    // ----------------------------------------------------
    // INIZIALIZZAZIONE
    // ----------------------------------------------------

    feedbackMessage.textContent = `Tentativi totali: ${MAX_ATTEMPTS}.`;
    startButton.addEventListener('click', startGame);

    colorButtons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault(); 
            const clickEvent = new Event('click');
            btn.dispatchEvent(clickEvent); 
        });
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
});