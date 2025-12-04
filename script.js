document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti DOM
    const photo = document.getElementById('background-photo');
    const patternDisplay = document.getElementById('pattern-display');
    const feedbackMessage = document.getElementById('feedback-message');
    const startGameButton = document.getElementById('start-game-button');
    const colorButtons = document.querySelectorAll('.color-button');
    
    // Audio (Safe mode)
    const getAudio = (id) => document.getElementById(id);
    const sounds = {
        beep: getAudio('beep-sound'),
        ding: getAudio('ding-sound'),
        crash: getAudio('crash-sound'),
        bell: getAudio('bell-sound')
    };
    
    let countdownInterval = null; 
    const colorToBtnId = { 'Rosso': 'btn-red', 'Verde': 'btn-green', 'Blu': 'btn-blue' };
    const COLORS = ['Rosso', 'Verde', 'Blu'];
    
    // CONFIGURAZIONE GIOCO AGGIORNATA
    const MIN_WINS = 3;                 
    const WIN_KEY = "1520";             
    const FAIL_KEY = "2202";            
    const MAX_ROUNDS = 5;           
    
    // NUOVA LOGICA: Tempo fisso e lunghezza sequenza variabile
    const FIXED_TIME_MS = 3000; // Sempre 3 secondi
    const PATTERN_LENGTHS = [3, 4, 4, 5, 5]; // Lunghezza per round 1, 2, 3, 4, 5

    let requiredPattern = [];
    let userAttempt = [];
    let gameActive = false;
    let roundsLeft = MAX_ROUNDS; 
    let successCount = 0;               

    // --- FUNZIONI UTILI ---

    function playSound(name) {
        try {
            const sound = sounds[name];
            if (sound) {
                sound.currentTime = 0;
                const playPromise = sound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {});
                }
            }
        } catch (e) {}
    }

    function triggerHapticFeedback() {
        if (navigator.vibrate) navigator.vibrate(50); 
    }
    
    function unlockMedia() {
        triggerHapticFeedback();
        Object.values(sounds).forEach(sound => {
            if(sound) {
                try {
                    sound.volume = 0;
                    sound.play().then(() => {
                        sound.pause();
                        sound.currentTime = 0;
                        sound.volume = 1;
                    }).catch(() => {});
                } catch(e){}
            }
        });
    }
    
    function startCountdownBeeps(limitMs) {
        stopCountdownBeeps(); 
        const totalBeeps = 5; // Beep totali nei 3 secondi
        const intervalDuration = limitMs / (totalBeeps - 1);
        let beepsLeft = totalBeeps;
        
        playSound('beep');
        beepsLeft--;

        countdownInterval = setInterval(() => {
            if (beepsLeft > 0 && gameActive) {
                playSound('beep');
                beepsLeft--;
            } else {
                clearInterval(countdownInterval);
            }
        }, intervalDuration); 
    }
    
    function stopCountdownBeeps() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    function flashInputButton(btn) {
        btn.classList.add('flash');
        triggerHapticFeedback(); 
        setTimeout(() => btn.classList.remove('flash'), 100); 
    }
    
    // --- LOGICA GIOCO ---

    // MODIFICATA: Accetta lunghezza variabile
    function generatePattern(length) {
        let p = [];
        for (let i = 0; i < length; i++) {
            p.push(COLORS[Math.floor(Math.random() * 3)]);
        }
        return p; 
    }

    function flashPattern(patternArray) {
        let delay = 0;
        colorButtons.forEach(btn => btn.disabled = true); 
        
        patternArray.forEach((color) => {
            const btn = document.getElementById(colorToBtnId[color]);
            setTimeout(() => {
                btn.classList.add('flash');
                playSound('ding');
            }, delay);
            delay += 600; // Leggermente più veloce visto che le sequenze sono lunghe
            setTimeout(() => btn.classList.remove('flash'), delay);
            delay += 200; 
        });
        return delay;
    }

    function startGame() {
        unlockMedia(); 
        if (roundsLeft <= 0) { checkEndState(); return; }

        const currentRoundIdx = MAX_ROUNDS - roundsLeft; // 0, 1, 2, 3, 4
        
        // Logica nuova: Lunghezza basata sul round, Tempo fisso
        const currentPatternLength = PATTERN_LENGTHS[currentRoundIdx];
        const limitMs = FIXED_TIME_MS; 
        
        startGameButton.style.display = 'none'; 
        userAttempt = [];
        
        feedbackMessage.textContent = `Round ${currentRoundIdx + 1} di ${MAX_ROUNDS}. Sequenza: ${currentPatternLength} colori.`;
        patternDisplay.textContent = 'Osserva...';
        
        setTimeout(() => {
            requiredPattern = generatePattern(currentPatternLength);
            const duration = flashPattern(requiredPattern);
            
            setTimeout(() => {
                gameActive = true;
                if(photo) {
                    photo.style.transitionDuration = `${limitMs/1000}s`; 
                    photo.style.opacity = '0'; 
                }
                
                colorButtons.forEach(btn => btn.disabled = false); 
                patternDisplay.textContent = 'RIPETI!';
                
                startCountdownBeeps(limitMs); 
                const failTimer = setTimeout(() => handleLoss(true), limitMs); 

                colorButtons.forEach(btn => {
                    btn.onclick = (e) => {
                        if(!gameActive) return;
                        flashInputButton(btn);
                        
                        const color = btn.dataset.color;
                        if (color === requiredPattern[userAttempt.length]) {
                            userAttempt.push(color);
                            // Se sequenza completata
                            if (userAttempt.length === requiredPattern.length) {
                                clearTimeout(failTimer); 
                                handleWin();
                            }
                        } else {
                            clearTimeout(failTimer);
                            playSound('crash');
                            handleLoss(false); 
                        }
                    };
                });

            }, duration); 
        }, 1000); 
    }

    function handleWin() {
        gameActive = false;
        roundsLeft--; 
        successCount++;
        stopCountdownBeeps(); 
        playSound('bell');
        endRound();
    }

    function handleLoss(isTimeout) {
        gameActive = false;
        roundsLeft--; 
        stopCountdownBeeps(); 
        if(isTimeout) playSound('crash');
        endRound();
    }
    
    function endRound() {
        colorButtons.forEach(btn => btn.onclick = null);
        patternDisplay.textContent = 'Stop';
        feedbackMessage.textContent = `Round completati: ${MAX_ROUNDS - roundsLeft}/${MAX_ROUNDS}`;
        
        if (roundsLeft <= 0) {
            setTimeout(checkEndState, 2000); 
        } else {
            setTimeout(() => {
                if(photo) {
                    photo.style.transitionDuration = '0.5s'; 
                    photo.style.opacity = '1'; 
                }
                startGameButton.style.display = 'block'; 
                patternDisplay.textContent = 'Premi per continuare';
            }, 2000); 
        }
    }
    
    // MODIFICATA: Mostra PASSWORD e nasconde successi
    function checkEndState() {
        if(photo) photo.style.opacity = '1'; 
        startGameButton.style.display = 'none'; 
        
        // Scrive PASSWORD sopra
        feedbackMessage.textContent = "PASSWORD";
        feedbackMessage.style.fontSize = "3vh"; 
        
        // Scrive il codice sotto
        patternDisplay.textContent = (successCount >= MIN_WINS) ? WIN_KEY : FAIL_KEY;
    }

    if(startGameButton) {
        startGameButton.addEventListener('click', startGame);
        startGameButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startGame();
        });
    }

    colorButtons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault(); 
            btn.click();
        });
    });
});