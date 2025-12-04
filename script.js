document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti DOM
    const photo = document.getElementById('background-photo');
    const patternDisplay = document.getElementById('pattern-display');
    const feedbackMessage = document.getElementById('feedback-message');
    const startGameButton = document.getElementById('start-game-button');
    const colorButtons = document.querySelectorAll('.color-button');
    
    // Audio (con gestione errori)
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
    const MIN_WINS = 3;                 
    const WIN_KEY = "1520";             
    const FAIL_KEY = "2202";            
    const MAX_ROUNDS = 5;           
    const TIME_LIMITS_MS = [3500, 3000, 2500, 2000, 1500]; 

    let requiredPattern = [];
    let userAttempt = [];
    let gameActive = false;
    let roundsLeft = MAX_ROUNDS; 
    let successCount = 0;               

    // --- FUNZIONI UTILI ---

    // Riproduce audio in modo sicuro (non blocca il gioco se fallisce)
    function playSound(name) {
        try {
            const sound = sounds[name];
            if (sound) {
                sound.currentTime = 0;
                const playPromise = sound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        // Ignora errori audio (comuni in locale)
                        console.log("Audio non riprodotto (normale in locale):", error);
                    });
                }
            }
        } catch (e) {
            console.log("Errore audio:", e);
        }
    }

    function triggerHapticFeedback() {
        if (navigator.vibrate) navigator.vibrate(50); 
    }
    
    // Sblocco audio iniziale
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
    
    // Countdown sonoro
    function startCountdownBeeps(limitMs) {
        stopCountdownBeeps(); 
        const totalBeeps = 5;
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

    function generatePattern() {
        let p = [];
        for (let i = 0; i < 3; i++) p.push(COLORS[Math.floor(Math.random() * 3)]);
        return p; 
    }

    function flashPattern(patternArray) {
        let delay = 0;
        colorButtons.forEach(btn => btn.disabled = true); // Blocca click
        
        patternArray.forEach((color) => {
            const btn = document.getElementById(colorToBtnId[color]);
            setTimeout(() => {
                btn.classList.add('flash');
                playSound('ding');
            }, delay);
            delay += 800; 
            setTimeout(() => btn.classList.remove('flash'), delay);
            delay += 300; 
        });
        return delay;
    }

    function startGame() {
        unlockMedia(); // Tenta sblocco
        if (roundsLeft <= 0) { checkEndState(); return; }

        const idx = MAX_ROUNDS - roundsLeft;
        const limitMs = TIME_LIMITS_MS[idx]; 
        
        startGameButton.style.display = 'none'; // Nasconde bottone
        userAttempt = [];
        
        feedbackMessage.textContent = `Round ${idx + 1} di ${MAX_ROUNDS}. Tempo: ${limitMs/1000}s.`;
        patternDisplay.textContent = 'Preparati...';
        
        setTimeout(() => {
            requiredPattern = generatePattern();
            const duration = flashPattern(requiredPattern);
            
            setTimeout(() => {
                gameActive = true;
                if(photo) {
                    photo.style.transitionDuration = `${limitMs/1000}s`; 
                    photo.style.opacity = '0'; 
                }
                
                colorButtons.forEach(btn => btn.disabled = false); // Sblocca click
                patternDisplay.textContent = 'VAI!';
                
                startCountdownBeeps(limitMs); 
                const failTimer = setTimeout(() => handleLoss(true), limitMs); 

                // Gestione Click
                colorButtons.forEach(btn => {
                    // Rimuovi vecchi listener clonando il nodo (trick veloce) o riassegnando onclick
                    btn.onclick = (e) => {
                        if(!gameActive) return;
                        flashInputButton(btn);
                        
                        const color = btn.dataset.color;
                        if (color === requiredPattern[userAttempt.length]) {
                            userAttempt.push(color);
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
        patternDisplay.textContent = 'Fine Round';
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
    
    function checkEndState() {
        if(photo) photo.style.opacity = '1'; 
        startGameButton.style.display = 'none'; 
        patternDisplay.textContent = (successCount >= MIN_WINS) ? WIN_KEY : FAIL_KEY;
        feedbackMessage.textContent = `Ecco la password.`;
    }

    // Avvio
    if(startGameButton) {
        startGameButton.addEventListener('click', startGame);
        // Supporto touch
        startGameButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startGame();
        });
    }

    // Supporto touch per i colori
    colorButtons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault(); 
            btn.click();
        });
    });
});