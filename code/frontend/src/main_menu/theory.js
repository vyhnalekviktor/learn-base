import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
let currentWallet = null;

async function initWallet() {
    try {
        console.log('Theory page loaded, calling sdk.actions.ready...');
        await sdk.actions.ready();
        console.log('BaseCamp mini app is ready!');

        const ethProvider = await sdk.wallet.ethProvider();
        const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
        const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

        if (!wallet) {
            console.warn('Wallet address not found from ethProvider.request');
            return;
        }

        console.log('Connected wallet from SDK:', wallet);
        currentWallet = wallet;

        // Optional: display wallet if element exists
        const span = document.getElementById('wallet-address');
        if (span) span.textContent = wallet;

        // Load initial progress
        await getTheoryProgress();

    } catch (error) {
        console.error('Error during MiniApp wallet init:', error);
    }
}

async function getTheoryProgress() {
    if (!currentWallet) {
        console.warn('Wallet not available yet');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/database/get-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: currentWallet })
        });

        if (!res.ok) {
            console.warn('Could not load theory progress');
            return;
        }

        const data = await res.json();
        const progress = data.progress;
        if (!progress) return;

        // Count completed theory sections (theory1-theory5)
        const theoryFields = ['theory1', 'theory2', 'theory3', 'theory4', 'theory5'];
        let completed = 0;

        theoryFields.forEach(field => {
            if (progress[field] === true) {
                completed++;
            }
        });

        const percent = Math.round((completed / theoryFields.length) * 100);
        updateProgressBar(percent);
        console.log(`Theory progress: ${percent}% (${completed}/5)`);

    } catch (error) {
        console.error('getTheoryProgress error:', error);
    }
}

function updateProgressBar(percent) {
    const percentEl = document.getElementById('theory-progress-percent');
    const barEl = document.getElementById('theory-progress-bar-fill');

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (barEl) barEl.style.width = `${percent}%`;
}

async function updateTheoryProgress(sectionNumber) {
    if (!currentWallet) {
        console.warn('Wallet not available yet');
        return false;
    }

    try {
        const res = await fetch(`${API_BASE}/api/database/update_field`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet: currentWallet,
                table_name: 'USER_PROGRESS',
                field_name: `theory${sectionNumber}`,
                value: true
            })
        });

        if (!res.ok) {
            let msg = 'Unknown backend error';
            try {
                const err = await res.json();
                msg = err.detail || JSON.stringify(err);
            } catch {
                // ignore
            }
            console.error(`updatefield theory${sectionNumber} error:`, msg);
            return false;
        }

        console.log(`Theory section ${sectionNumber} progress saved for wallet:`, currentWallet);

        // Refresh progress bar after update
        await getTheoryProgress();
        return true;

    } catch (error) {
        console.error('updateTheoryProgress error:', error);
        return false;
    }
}

function toggleAccordion(sectionId) {
    const content = document.getElementById('content-' + sectionId);
    const icon = document.getElementById('icon-' + sectionId);
    const header = icon.parentElement;

    const isOpen = content.classList.contains('active');

    // Close all others
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

    // Open current if it was closed
    if (!isOpen) {
        content.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.textContent = '▲';
        icon.classList.add('active');
        header.style.background = 'linear-gradient(135deg, #0052FF 0%, #0041CC 100%)';
        header.style.color = 'white';

        // Map sectionId to theory number and update progress
        const sectionMap = {
            'core-blockchain': 1,
            'wallet-security': 2,
            'tokens-standards': 3,
            'base-network': 4,
            'smart-contracts': 5
        };
        const sectionNumber = sectionMap[sectionId];
        if (sectionNumber) {
            updateTheoryProgress(sectionNumber);
        }
    }
}

// Initialize wallet on page load
window.addEventListener('load', initWallet);

// Export functions for HTML
window.toggleAccordion = toggleAccordion;
