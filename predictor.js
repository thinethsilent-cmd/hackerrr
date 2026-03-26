// Predictor UI App
(function() {
    // Inject Predictor Styles
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        #predictor-widget {
            position: fixed;
            top: 20px;
            right: 20px;
            width: clamp(280px, 90vw, 320px);
            max-height: 90vh;
            background: rgba(10, 10, 15, 0.95);
            border: 1px solid #00ff00;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.2), inset 0 0 20px rgba(0, 255, 0, 0.05);
            z-index: 9999;
            font-family: 'Share Tech Mono', monospace;
            color: #00ff00;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            backdrop-filter: blur(10px);
            user-select: none;
        }
        
        #predictor-header {
            background: linear-gradient(90deg, rgba(0,255,0,0.2) 0%, rgba(0,0,0,0) 100%);
            padding: 12px 15px;
            border-bottom: 1px solid rgba(0, 255, 0, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }

        #predictor-header h3 {
            margin: 0;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 5px #00ff00;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #predictor-header span.live-dot {
            width: 8px;
            height: 8px;
            background: #00ff00;
            border-radius: 50%;
            animation: blink 1s infinite alternate;
            box-shadow: 0 0 10px #00ff00;
        }

        @keyframes blink {
            from { opacity: 1; }
            to { opacity: 0.3; }
        }

        .predictor-body {
            padding: 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .signal-container {
            border: 1px dashed rgba(0, 255, 0, 0.4);
            background: rgba(0, 255, 0, 0.05);
            padding: 25px 15px;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
        }

        .scanning-line {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: #00ff00;
            box-shadow: 0 0 10px 2px #00ff00;
            animation: scan 2s linear infinite;
            display: none;
        }

        @keyframes scan {
            0% { top: -10px; }
            100% { top: 100%; }
        }

        .prediction-value {
            font-size: clamp(2.5rem, 10vw, 3.5rem);
            font-weight: bold;
            text-shadow: 0 0 15px #00ff00;
            margin: 0;
            line-height: 1;
        }

        .prediction-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 3px;
            opacity: 0.7;
            margin-top: 10px;
        }

        .btn-predict {
            background: transparent;
            color: #00ff00;
            border: 1px solid #00ff00;
            padding: 12px;
            font-family: inherit;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }

        .btn-predict:hover:not(:disabled) {
            background: rgba(0, 255, 0, 0.2);
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
        }

        .btn-predict:disabled {
            border-color: #333;
            color: #555;
            cursor: not-allowed;
            background: rgba(0,0,0,0.5);
        }

        .status-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            border-top: 1px solid rgba(0, 255, 0, 0.2);
            padding-top: 10px;
        }

        .status-val {
            font-weight: bold;
            color: #fff;
        }
        
        .toggle-btn {
            background: transparent;
            border: none;
            color: #00ff00;
            cursor: pointer;
            font-size: 1rem;
        }
    `;
    document.head.appendChild(style);

    // Predictor State
    let signalsLeft = 5;
    const STATE_KEY = 'CRASH_PREDICTOR_STATE';
    
    // Load state from local storage securely
    try {
        const saved = JSON.parse(localStorage.getItem(STATE_KEY));
        if (saved && saved.date === new Date().toDateString()) {
            signalsLeft = saved.signalsLeft;
        } else {
            // New day reset
            localStorage.setItem(STATE_KEY, JSON.stringify({
                date: new Date().toDateString(),
                signalsLeft: 5
            }));
        }
    } catch(e) {}

    // Inject Widget HTML
    const widget = document.createElement('div');
    widget.id = 'predictor-widget';
    widget.innerHTML = `
        <div id="predictor-header">
            <h3><span class="live-dot"></span> ODDS BY APEX SCRIPTS</h3>
            <button class="toggle-btn" id="hide-predictor"><i class="fas fa-times"></i></button>
        </div>
        <div class="predictor-body" style="overflow-y: auto;">
            <div class="signal-container" id="signal-box">
                <div class="scanning-line" id="scan-line"></div>
                <div class="prediction-value" id="pred-val">???</div>
                <div class="prediction-label">Next Target Multiplier</div>
            </div>
            <button class="btn-predict" id="btn-generate">
                <i class="fas fa-satellite-dish"></i> Intercept Signal
            </button>
            <div class="status-row">
                <span>Daily Limits:</span>
                <span class="status-val text-[12px]"><span id="signals-count">${signalsLeft}</span>/5 Signals Left</span>
            </div>
            <div class="status-row" style="margin-top:-5px; border:none; padding-top:0;">
                <span>Server Sync:</span>
                <span class="status-val text-[10px] text-emerald-400">CONNECTED</span>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // Draggable Logic
    const header = document.getElementById('predictor-header');
    let isDragging = false;
    let startX, startY, initialX, initialY;

    // Mouse Events
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch Events
    header.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        if (e.target.closest('#hide-predictor')) return; // Don't drag if clicking close button
        
        isDragging = true;
        
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            // Prevent scrolling while dragging on mobile
            if (e.cancelable) e.preventDefault();
        } else {
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault();
        }
        
        const rect = widget.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        widget.style.transition = 'none';
        
        // Remove bottom/right positioning to rely solely on left/top during drag
        widget.style.bottom = 'auto';
        widget.style.right = 'auto';
    }

    function drag(e) {
        if (!isDragging) return;
        
        let clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        let clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        
        if (e.type === 'touchmove' && e.cancelable) {
            e.preventDefault(); // Prevent scrolling
        }
        
        const dx = clientX - startX;
        const dy = clientY - startY;
        
        let newX = initialX + dx;
        let newY = initialY + dy;
        
        // Boundaries
        newX = Math.max(0, Math.min(newX, window.innerWidth - widget.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - widget.offsetHeight));
        
        widget.style.left = `${newX}px`;
        widget.style.top = `${newY}px`;
    }

    function dragEnd() {
        isDragging = false;
    }

    // Prediction Logic
    const btnGenerate = document.getElementById('btn-generate');
    const predVal = document.getElementById('pred-val');
    const scanLine = document.getElementById('scan-line');
    const signalsCount = document.getElementById('signals-count');
    
    // Update initial button state
    if (signalsLeft <= 0) {
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = '<i class="fas fa-ban"></i> LIMIT REACHED';
        predVal.innerText = 'MAX';
        predVal.style.color = '#ff4444';
    }

    btnGenerate.addEventListener('click', () => {
        if (signalsLeft <= 0) return;
        
        // Check if round is already running
        // Using localStorage since main script sets it, or window.secretCrashPoint
        const targetOdd = window.secretCrashPoint || parseFloat(localStorage.getItem('CRASH_PREDICTION'));
        
        if (!targetOdd) {
            predVal.style.fontSize = '1.5rem';
            predVal.innerText = 'NO SIGNAL';
            setTimeout(() => {
                predVal.style.fontSize = '3.5rem';
                predVal.innerText = '???';
            }, 2000);
            return;
        }

        // Animation state
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = '<i class="fas fa-sync fa-spin"></i> INTERCEPTING...';
        scanLine.style.display = 'block';
        predVal.innerText = '0.00x';
        
        let scrambleInterval = setInterval(() => {
            predVal.innerText = (Math.random() * 5 + 1).toFixed(2) + 'x';
        }, 50);

        setTimeout(() => {
            clearInterval(scrambleInterval);
            
            // Generate EXACT odd that engine will crash on
            predVal.innerText = targetOdd.toFixed(2) + 'x';
            predVal.style.textShadow = '0 0 20px #fff';
            
            setTimeout(() => {
                predVal.style.textShadow = '0 0 15px #00ff00';
            }, 300);

            scanLine.style.display = 'none';
            btnGenerate.innerHTML = '<i class="fas fa-check"></i> SIGNAL ACQUIRED';
            
            // Decrease signal count
            signalsLeft--;
            signalsCount.innerText = signalsLeft;
            localStorage.setItem(STATE_KEY, JSON.stringify({
                date: new Date().toDateString(),
                signalsLeft: signalsLeft
            }));

            if (signalsLeft <= 0) {
                btnGenerate.disabled = true;
                setTimeout(() => {
                    btnGenerate.innerHTML = '<i class="fas fa-ban"></i> LIMIT REACHED';
                }, 2000);
            } else {
                setTimeout(() => {
                    btnGenerate.disabled = false;
                    btnGenerate.innerHTML = '<i class="fas fa-satellite-dish"></i> Intercept Signal';
                }, 3000);
            }
            
        }, 1500); // 1.5s intercept animation
    });

    // Hide functionality
    document.getElementById('hide-predictor').addEventListener('click', () => {
        widget.style.display = 'none';
    });

    // Auto reset prediction when new round starts
    // We can monitor DOM mutations on the round status to detect new rounds, or just let users click
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.innerText.includes('Syncing Liquidity')) {
                // Round reset, ready for next prediction
                if (predVal.innerText !== '???' && predVal.innerText !== 'MAX') {
                    predVal.style.fontSize = '3.5rem';
                    predVal.innerText = '???';
                }
            }
        });
    });
    
    const roundStatusEl = document.getElementById('round-status');
    if (roundStatusEl) {
        observer.observe(roundStatusEl, { characterData: true, childList: true, subtree: true });
    }

})();
