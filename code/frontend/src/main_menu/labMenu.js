document.addEventListener('DOMContentLoaded', async () => {
    // Počkáme na načtení dat z common.js
    if (window.BaseCampTheme) {
        await window.BaseCampTheme.ensureDataLoaded();
    }
    renderPracticeMenu();
});

function renderPracticeMenu() {
    if (!window.BaseCampTheme) return;

    // 1. Zjistíme, jestli je prostředí rozbité (Farcaster/Sepolia issue)
    const isDisabled = window.BaseCampTheme.isPracticeDisabled();

    // 2. Načteme reálná data
    const userData = window.BaseCampTheme.getUserData();
    const progress = userData ? userData.progress : {};

    // DŮLEŽITÉ: Tady jsou správná ID elementů podle tvého kódu
    const labs = [
        { key: 'practice_launch', htmlId: 'item-launch' },
        { key: 'practice_faucet', htmlId: 'item-faucet' },
        { key: 'practice_receive', htmlId: 'item-receive' },
        { key: 'practice_mint',   htmlId: 'item-mint' },
        { key: 'practice_send',   htmlId: 'item-send' }
    ];

    let completedCount = 0;

    labs.forEach(lab => {
        const card = document.getElementById(lab.htmlId);
        // Zkusíme najít status ikonu uvnitř karty
        const statusIcon = card?.querySelector('.status-icon') || card?.querySelector('.icon-state');
        const subtitle = card?.querySelector('p') || card?.querySelector('.subtitle');

        const isRealDone = progress[lab.key] === true;

        // PODMÍNKA SPLNĚNÍ: Buď je hotovo v DB, nebo je prostředí nekompatibilní (darujeme to)
        if (isRealDone || isDisabled) {
            completedCount++;

            if (card) card.classList.add('completed');

            if (statusIcon) {
                // Pokud je to darované, dáme žlutý warning, jinak zelenou fajfku
                statusIcon.innerHTML = (isDisabled && !isRealDone) ? '⚠️' : '✅';
            }

            // Pokud darujeme progress, napíšeme to do popisku
            if (isDisabled && !isRealDone && subtitle) {
                subtitle.textContent = "Auto-completed (Device limitation)";
                subtitle.style.color = "#eab308";
                subtitle.style.fontWeight = "bold";
            }
        } else {
            // Nesplněno
            if (statusIcon) statusIcon.innerHTML = '➡️';
        }
    });

    // 3. Aktualizace velkého progress baru nahoře
    updateProgressBar(completedCount, labs.length);

    // 4. Zobrazení žlutého banneru nahoře, pokud jsme v omezeném režimu
    if (isDisabled) {
        showTopWarning();
    }
}

function updateProgressBar(completed, total) {
    const percent = Math.round((completed / total) * 100);
    const barFill = document.getElementById('progress-bar-fill');
    const barText = document.getElementById('progress-percent');

    if (barFill) barFill.style.width = `${percent}%`;
    if (barText) barText.textContent = `${percent}%`;
}

function showTopWarning() {
    const container = document.querySelector('.container') || document.body;
    // Abychom to nevkládali dvakrát
    if (document.getElementById('compatibility-warning')) return;

    const warn = document.createElement('div');
    warn.id = 'compatibility-warning';
    warn.style.cssText = `
        background: rgba(234, 179, 8, 0.15);
        border: 1px solid #eab308;
        color: #eab308;
        padding: 15px;
        margin: 15px;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    warn.innerHTML = `
        <span style="font-size: 20px">⚠️</span>
        <div>
            <strong>Limited Functionality Detected</strong><br>
            Your wallet doesn't fully support Base Sepolia testnet.
            We have <strong>auto-completed</strong> the practice labs for you.
        </div>
    `;

    // Vložíme hned na začátek kontejneru
    container.prepend(warn);
}