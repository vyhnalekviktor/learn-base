import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
let currentWallet = null;
let debugLogs = [];

// Debug Console Functions
function createDebugConsole() {
    const debugHTML = `
        <div id="debug-console" style="position: fixed; bottom: 20px; right: 20px; width: 400px; max-height: 500px; background: #1e293b; border: 2px solid #0052FF; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,82,255,0.3); z-index: 999999; font-family: monospace; font-size: 11px; display: none; flex-direction: column;">
            <div style="background: #0052FF; color: white; padding: 12px 16px; cursor: move; user-select: none; display: flex; justify-content: space-between; align-items: center; border-radius: 10px 10px 0 0;">
                <strong>🐛 Theory Debug Console</strong>
                <button onclick="clearDebugConsole()" style="background: #ef4444; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">Clear</button>
            </div>
            <div id="debug-logs" style="padding: 12px; max-height: 400px; overflow-y: auto; background: #0f172a; color: #e2e8f0; border-radius: 0 0 10px 10px;"></div>
        </div>
        <button id="debug-toggle" style="position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: linear-gradient(135deg, #0052FF 0%, #0041CC 100%); border: none; border-radius: 50%; color: white; font-size: 24px; cursor: pointer; z-index: 1000000; box-shadow: 0 8px 20px rgba(0,82,255,0.4);">🐛</button>
    `;

    document.body.insertAdjacentHTML('beforeend', debugHTML);

    const toggleBtn = document.getElementById('debug-toggle');
    const console = document.getElementById('debug-console');

    toggleBtn.onclick = () => {
        const isVisible = console.style.display === 'flex';
        console.style.display = isVisible ? 'none' : 'flex';
        toggleBtn.style.display = isVisible ? 'block' : 'none';
    };

    makeDraggable();
}

function makeDraggable() {
    const console = document.getElementById('debug-console');
    const header = console.querySelector('div');
    let isDragging = false;
    let startX, startY, startRight, startBottom;

    header.onmousedown = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startRight = parseInt(window.getComputedStyle(console).right);
        startBottom = parseInt(window.getComputedStyle(console).bottom);

        document.onmousemove = (e) => {
            if (!isDragging) return;
            const dx = startX - e.clientX;
            const dy = startY - e.clientY;
            console.style.right = (startRight + dx) + 'px';
            console.style.bottom = (startBottom + dy) + 'px';
        };

        document.onmouseup = () => {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
        info: '#3b82f6',
        success: '#10b981',
        warn: '#f59e0b',
        error: '#ef4444'
    };

    const logEntry = {
        time: timestamp,
        message: message,
        type: type
    };

    debugLogs.push(logEntry);
    console.log(`[${timestamp}] ${message}`);

    const logsContainer = document.getElementById('debug-logs');
    if (logsContainer) {
        const logEl = document.createElement('div');
        logEl.style.cssText = `margin-bottom: 8px; padding: 8px; border-left: 4px solid ${colors[type]}; background: rgba(255,255,255,0.05); border-radius: 4px; word-wrap: break-word;`;
        logEl.innerHTML = `<strong style="color: #94a3b8;">[${timestamp}]</strong> <span style="color: ${colors[type]};">${type.toUpperCase()}</span><br/>${message}`;
        logsContainer.insertBefore(logEl, logsContainer.firstChild);
    }
}

window.clearDebugConsole = function() {
    const logsContainer = document.getElementById('debug-logs');
    if (logsContainer) {
        logsContainer.innerHTML = '';
        debugLogs = [];
    }
    debugLog('Console cleared', 'info');
};

// Initialize Debug Console
window.addEventListener('load', () => {
    createDebugConsole();
    debugLog('Debug console initialized', 'success');
});

// Main Functions with Debug Logging
async function initWallet() {
    try {
        debugLog('Theory page loaded, calling sdk.actions.ready...', 'info');
        await sdk.actions.ready();
        debugLog('BaseCamp mini app is ready!', 'success');

        const ethProvider = await sdk.wallet.ethProvider;
        const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
        const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

        if (!wallet) {
            debugLog('Wallet address not found from ethProvider.request', 'warn');
            return;
        }

        debugLog(`Connected wallet: ${wallet.substring(0, 10)}...${wallet.substring(wallet.length - 8)}`, 'success');
        currentWallet = wallet;

        const span = document.getElementById('wallet-address');
        if (span) span.textContent = wallet;

        await ensureUserExists();
        await getTheoryProgress();

    } catch (error) {
        debugLog(`Error during wallet init: ${error.message}`, 'error');
        console.error('Error during MiniApp wallet init:', error);
    }
}

async function ensureUserExists() {
    if (!currentWallet) return;

    try {
        debugLog(`Checking if user exists: ${currentWallet.substring(0, 10)}...`, 'info');

        const res = await fetch(`${API_BASE}/api/database/init-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: currentWallet })
        });

        if (!res.ok) {
            debugLog(`Failed to init user. Status: ${res.status}`, 'error');
            return;
        }

        const data = await res.json();
        debugLog(`User ${data.created ? 'created' : 'already exists'}`, 'success');

    } catch (error) {
        debugLog(`ensureUserExists error: ${error.message}`, 'error');
        console.error('ensureUserExists error:', error);
    }
}

async function getTheoryProgress() {
    if (!currentWallet) {
        debugLog('Wallet not available yet', 'warn');
        return;
    }

    try {
        debugLog('Fetching theory progress from API...', 'info');

        const res = await fetch(`${API_BASE}/api/database/get-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: currentWallet })
        });

        debugLog(`API Response Status: ${res.status}`, res.ok ? 'success' : 'error');

        if (!res.ok) {
            const errorText = await res.text();
            debugLog(`Could not load progress: ${errorText}`, 'error');
            return;
        }

        const data = await res.json();

        if (!data.success) {
            debugLog('API returned success=false', 'error');
            return;
        }

        const progress = data.progress;
        if (!progress) {
            debugLog('No progress object in response', 'error');
            return;
        }

        const theoryFields = ['theory1', 'theory2', 'theory3', 'theory4', 'theory5'];
        let completed = 0;

        theoryFields.forEach(field => {
            if (progress[field] === true) {
                completed++;
                debugLog(`✓ ${field} completed`, 'success');
            }
        });

        const percent = Math.round((completed / theoryFields.length) * 100);
        updateProgressBar(percent);
        debugLog(`Theory progress: ${percent}% (${completed}/5 sections)`, 'success');

    } catch (error) {
        debugLog(`getTheoryProgress error: ${error.message}`, 'error');
        console.error('getTheoryProgress error:', error);
    }
}

function updateProgressBar(percent) {
    const percentEl = document.getElementById('theory-progress-percent');
    const barEl = document.getElementById('theory-progress-bar-fill');

    if (percentEl) {
        percentEl.textContent = `${percent}%`;
        debugLog(`Progress bar text updated to ${percent}%`, 'success');
    } else {
        debugLog('Element theory-progress-percent not found!', 'error');
    }

    if (barEl) {
        barEl.style.width = `${percent}%`;
        debugLog(`Progress bar width set to ${percent}%`, 'success');
    } else {
        debugLog('Element theory-progress-bar-fill not found!', 'error');
    }
}

async function updateTheoryProgress(sectionNumber) {
    if (!currentWallet) {
        debugLog('Wallet not available, cannot update progress', 'warn');
        return false;
    }

    try {
        debugLog(`Updating theory${sectionNumber} for wallet...`, 'info');

        const payload = {
            wallet: currentWallet,
            table_name: 'USER_PROGRESS',
            field_name: `theory${sectionNumber}`,
            value: true
        };

        const res = await fetch(`${API_BASE}/api/database/update_field`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        debugLog(`Update API Status: ${res.status}`, res.ok ? 'success' : 'error');

        if (!res.ok) {
            const errorText = await res.text();
            debugLog(`Update failed: ${errorText}`, 'error');
            return false;
        }

        const result = await res.json();
        debugLog(`Theory section ${sectionNumber} saved successfully!`, 'success');

        await getTheoryProgress();
        return true;

    } catch (error) {
        debugLog(`updateTheoryProgress error: ${error.message}`, 'error');
        console.error('updateTheoryProgress error:', error);
        return false;
    }
}

function toggleAccordion(sectionId) {
    const content = document.getElementById('content-' + sectionId);
    const icon = document.getElementById('icon-' + sectionId);

    if (!content || !icon) {
        debugLog(`Accordion elements not found for: ${sectionId}`, 'error');
        return;
    }

    const header = icon.parentElement;
    const isOpen = content.classList.contains('active');

    document.querySelectorAll('.accordion-content').forEach(c => {
        c.classList.remove('active');
        c.style.maxHeight = null;
    });
    document.querySelectorAll('.accordion-icon').forEach(i => {
        i.textContent = '▼';
        i.classList.remove('active');
    });
    document.querySelectorAll('.accordion-header').forEach(h => {
        h.style.background = '#f8fafc';
        h.style.color = 'inherit';
    });

    if (!isOpen) {
        content.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.textContent = '▲';
        icon.classList.add('active');
        header.style.background = 'linear-gradient(135deg, #0052FF 0%, #0041CC 100%)';
        header.style.color = 'white';

        const sectionMap = {
            'core-blockchain': 1,
            'wallet-security': 2,
            'tokens-standards': 3,
            'base-network': 4,
            'smart-contracts': 5
        };

        const sectionNumber = sectionMap[sectionId];
        if (sectionNumber) {
            debugLog(`Opened section: ${sectionId} → updating theory${sectionNumber}`, 'info');
            updateTheoryProgress(sectionNumber);
        }
    }
}

window.addEventListener('load', initWallet);
window.toggleAccordion = toggleAccordion;
