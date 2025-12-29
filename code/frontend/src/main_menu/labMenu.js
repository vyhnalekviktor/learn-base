document.addEventListener('DOMContentLoaded', async () => {
    if (window.BaseCampTheme) {
        await window.BaseCampTheme.ensureDataLoaded();
    }
    renderPracticeMenu();
});

function renderPracticeMenu() {
    if (!window.BaseCampTheme) return;
    const isDisabled = false;

    const userData = window.BaseCampTheme.getUserData();
    const progress = userData ? userData.progress : {};

    const labs = [
        { key: 'launch', htmlId: 'item-launch' },
        { key: 'faucet', htmlId: 'item-faucet' },
        { key: 'receive', htmlId: 'item-receive' },
        { key: 'mint',   htmlId: 'item-mint' },
        { key: 'send',   htmlId: 'item-send' }
    ];

    let completedCount = 0;

    labs.forEach(lab => {
        const card = document.getElementById(lab.htmlId);
        const statusIcon = card?.querySelector('.status-icon') || card?.querySelector('.icon-state');
        const subtitle = card?.querySelector('p') || card?.querySelector('.subtitle');

        const isRealDone = progress[lab.key] === true;

        if (isRealDone || isDisabled) {
            completedCount++;

            if (card) card.classList.add('completed');

            if (statusIcon) {
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