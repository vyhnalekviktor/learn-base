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
            console.warn('Wallet address not found');
            return;
        }

        console.log('Connected wallet:', wallet);
        currentWallet = wallet;

        const span = document.getElementById('wallet-address');
        if (span) span.textContent = wallet;

        // ✅ FIX 1: Ensure user exists BEFORE reading progress
        await ensureUserExists();
        await getTheoryProgress();

    } catch (error) {
        console.error('Error during wallet init:', error);
    }
}

// ✅ FIX 2: Add missing function
async function ensureUserExists() {
    if (!currentWallet) return;

    try {
        const res = await fetch(`${API_BASE}/api/database/init-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: currentWallet })
        });

        if (!res.ok) {
            console.error('Failed to init user:', res.status);
            return;
        }

        const data = await res.json();
        console.log('User init:', data.created ? 'created' : 'exists');

    } catch (error) {
        console.error('ensureUserExists error:', error);
    }
}

async function getTheoryProgress() {
    if (!currentWallet) {
        console.warn('Wallet not available');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/database/get-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: currentWallet })
        });

        if (!res.ok) {
            console.error('Failed to load progress:', res.status);
            return;
        }

        const data = await res.json();

        // ✅ FIX 3: Check success flag
        if (!data.success) {
            console.error('API returned success=false');
            return;
        }

        // ✅ FIX 4: Correct parsing
        const progress = data.progress;
        if (!progress) {
            console.error('No progress object');
            return;
        }

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

    // ✅ FIX 5: Better logging
    if (percentEl) {
        percentEl.textContent = `${percent}%`;
        console.log('✅ Progress text updated');
    } else {
        console.error('❌ Element theory-progress-percent not found!');
    }

    if (barEl) {
        barEl.style.width = `${percent}%`;
        console.log('✅ Progress bar updated');
    } else {
        console.error('❌ Element theory-progress-bar-fill not found!');
    }
}

async function updateTheoryProgress(sectionNumber) {
    if (!currentWallet) {
        console.warn('Wallet not available');
        return false;
    }

    try {
        console.log(`Updating theory${sectionNumber}...`);

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
            const errorText = await res.text();
            console.error(`Update failed (${res.status}):`, errorText);
            return false;
        }

        console.log(`✅ Theory${sectionNumber} saved`);
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

    if (!content || !icon) {
        console.error('Accordion elements not found:', sectionId);
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
            console.log(`Opened section ${sectionId} -> theory${sectionNumber}`);
            updateTheoryProgress(sectionNumber);
        }
    }
}

window.addEventListener('load', initWallet);
window.toggleAccordion = toggleAccordion;
