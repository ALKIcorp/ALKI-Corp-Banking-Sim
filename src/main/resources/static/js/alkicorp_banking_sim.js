// Banking Sim frontend wired to REST backend
const DAILY_WITHDRAWAL_LIMIT = 500;
const DAYS_PER_YEAR = 12;
const API_BASE = '/api/slots';
const POLL_INTERVAL_MS = 5000;

let currentSlot = null;
let bankState = null;
let clients = [];
let slotSummaries = {};
let selectedClientId = null;
let clientMoneyChart = null;
let activityChart = null;
let pollTimer = null;

const screens = document.querySelectorAll('.screen');
const gameHud = document.getElementById('game-hud');
const hudMode = document.getElementById('hud-mode');
const hudDate = document.getElementById('hud-date');
const saveIndicator = document.getElementById('save-indicator');
const logoutButton = document.getElementById('logout-button');
const homeLogoutButton = document.getElementById('home-logout-button');
const quitButton = document.getElementById('quit-button');
const loginForm = document.getElementById('login-form');
const loginUsernameInput = document.getElementById('login-username-input');
const loginPasswordInput = document.getElementById('login-password-input');
const loginErrorMessage = document.getElementById('login-error-message');
const showRegisterButton = document.getElementById('show-register-button');
const registerForm = document.getElementById('register-form');
const registerUsernameInput = document.getElementById('register-username-input');
const registerEmailInput = document.getElementById('register-email-input');
const registerPasswordInput = document.getElementById('register-password-input');
const registerConfirmInput = document.getElementById('register-confirm-input');
const registerErrorMessage = document.getElementById('register-error-message');
const showLoginButton = document.getElementById('show-login-button');

const clientNameInput = document.getElementById('client-name-input');
const clientViewName = document.getElementById('client-view-name');
const clientViewBalance = document.getElementById('client-view-balance');
const clientViewCardNumber = document.getElementById('client-view-card-number');
const clientViewCardExpiry = document.getElementById('client-view-card-expiry');
const clientViewCardCvv = document.getElementById('client-view-card-cvv');
const depositAmountInput = document.getElementById('deposit-amount');
const withdrawAmountInput = document.getElementById('withdraw-amount');
const clientViewWithdrawLimit = document.getElementById('client-view-withdraw-limit');
const clientErrorMessage = document.getElementById('client-error-message');
const clientLogArea = document.getElementById('client-log-area');

const bankTotalAssets = document.getElementById('bank-total-assets');
const bankLiquidCash = document.getElementById('bank-liquid-cash');
const bankInvestedAmount = document.getElementById('bank-invested-amount');
const clientListDiv = document.getElementById('client-list');
const clientMoneyChartCtx = document.getElementById('clientMoneyChart').getContext('2d');
const activityChartCtx = document.getElementById('activityChart').getContext('2d');

const investViewLiquidCash = document.getElementById('invest-view-liquid-cash');
const sp500CurrentValue = document.getElementById('sp500-current-value');
const sp500Holdings = document.getElementById('sp500-holdings');
const sp500NextDividend = document.getElementById('sp500-next-dividend');
const sp500NextGrowth = document.getElementById('sp500-next-growth');
const investAmountInput = document.getElementById('invest-amount');
const divestAmountInput = document.getElementById('divest-amount');
const investmentErrorMessage = document.getElementById('investment-error-message');

const STORAGE_KEYS = {
    slot: 'bankingSim.currentSlot',
    screen: 'bankingSim.activeScreen',
    clientId: 'bankingSim.selectedClientId',
    authToken: 'bankingSim.authToken'
};

function formatCurrency(value) {
    const amount = typeof value === 'number' ? value : Number(value || 0);
    return amount.toFixed(2);
}

function getGameDateString(dayNumber) {
    if (dayNumber === null || dayNumber === undefined || Number.isNaN(dayNumber)) {
        return '---';
    }
    const totalMonths = Math.floor(dayNumber);
    const year = Math.floor(totalMonths / DAYS_PER_YEAR) + 1;
    const month = (totalMonths % DAYS_PER_YEAR) + 1;
    return `Y${year} M${month}`;
}

function showScreen(screenId) {
    screens.forEach(screen => {
        if (screen.id === screenId) {
            screen.classList.add('active');
        } else {
            screen.classList.remove('active');
        }
    });
    const hudVisible = !['home-screen', 'login-screen'].includes(screenId);
    gameHud.style.display = hudVisible ? 'flex' : 'none';
    localStorage.setItem(STORAGE_KEYS.screen, screenId);
}

function flashSaveIndicator() {
    saveIndicator.classList.add('visible');
    setTimeout(() => saveIndicator.classList.remove('visible'), 800);
}

async function api(path, options = {}) {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(path, { ...options, headers });
    if (!response.ok) {
        if (response.status === 401) {
            handleAuthExpired();
        }
        const message = await response.text();
        throw new Error(message || 'Request failed');
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
}

function handleAuthExpired() {
    clearAuthToken();
    stopPolling();
    showLoginScreen('Session expired. Please log in again.');
}

function showLoginScreen(message) {
    if (message) {
        loginErrorMessage.textContent = message;
    } else {
        loginErrorMessage.textContent = '';
    }
    loginPasswordInput.value = '';
    if (registerPasswordInput) {
        registerPasswordInput.value = '';
    }
    if (registerConfirmInput) {
        registerConfirmInput.value = '';
    }
    showScreen('login-screen');
    showLoginForm();
}

function showLoginForm() {
    if (registerForm) {
        registerForm.classList.add('hidden');
    }
    if (loginForm) {
        loginForm.classList.remove('hidden');
    }
    if (registerErrorMessage) {
        registerErrorMessage.textContent = '';
    }
    loginUsernameInput.focus();
}

function showRegisterForm() {
    if (loginForm) {
        loginForm.classList.add('hidden');
    }
    if (registerForm) {
        registerForm.classList.remove('hidden');
    }
    if (loginErrorMessage) {
        loginErrorMessage.textContent = '';
    }
    if (registerUsernameInput) {
        registerUsernameInput.focus();
    }
}

function decodeJwtPayload(token) {
    const parts = token.split('.');
    if (parts.length < 2) {
        return null;
    }
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    try {
        return JSON.parse(atob(padded));
    } catch (error) {
        console.warn('Failed to decode auth token payload', error);
        return null;
    }
}

function getCurrentUserLabel() {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (!token) {
        return null;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.sub) {
        return null;
    }
    return payload.sub;
}

function updateUserCredentialDisplays() {
    const label = getCurrentUserLabel();
    document.querySelectorAll('.user-credential').forEach(element => {
        if (label) {
            element.textContent = `User: ${label}`;
            element.classList.remove('hidden');
        } else {
            element.textContent = '';
            element.classList.add('hidden');
        }
    });
}

function clearAuthToken() {
    localStorage.removeItem(STORAGE_KEYS.authToken);
    updateUserCredentialDisplays();
}

function logout() {
    clearAuthToken();
    stopPolling();
    quitGame();
    showLoginScreen();
}

function renderSlotInfo(slot) {
    const infoSpan = document.getElementById(`slot-${slot.slotId}-info`);
    const loadBtn = document.getElementById(`load-btn-${slot.slotId}`);
    const dateStr = getGameDateString(slot.gameDay);
    infoSpan.textContent = `Slot ${slot.slotId}: ${dateStr}, ${slot.clientCount} clients`;
    loadBtn.disabled = !slot.hasData;
}

async function updateHomeScreen() {
    const slots = await api(`${API_BASE}`);
    slotSummaries = {};
    slots.forEach(slot => {
        slotSummaries[slot.slotId] = slot;
        renderSlotInfo(slot);
    });
    showScreen('home-screen');
}

async function startGame(slotId) {
    const summary = slotSummaries[slotId];
    if (summary && summary.hasData) {
        const confirmed = confirm(`Slot ${slotId} has data. Start a new game and overwrite it?`);
        if (!confirmed) return;
    }
    await api(`${API_BASE}/${slotId}/start`, { method: 'POST' });
    currentSlot = slotId;
    selectedClientId = null;
    localStorage.setItem(STORAGE_KEYS.slot, String(slotId));
    localStorage.removeItem(STORAGE_KEYS.clientId);
    await refreshAll();
    switchToBankView();
}

async function loadGame(slotId) {
    currentSlot = slotId;
    selectedClientId = null;
    localStorage.setItem(STORAGE_KEYS.slot, String(slotId));
    localStorage.removeItem(STORAGE_KEYS.clientId);
    await refreshAll();
    switchToBankView();
}

function quitGame() {
    currentSlot = null;
    selectedClientId = null;
    clients = [];
    bankState = null;
    investAmountInput.value = '';
    divestAmountInput.value = '';
    depositAmountInput.value = '';
    withdrawAmountInput.value = '';
    clientNameInput.value = '';
    localStorage.removeItem(STORAGE_KEYS.slot);
    localStorage.removeItem(STORAGE_KEYS.clientId);
    localStorage.setItem(STORAGE_KEYS.screen, 'home-screen');
    showScreen('home-screen');
    updateHomeScreen();
}

async function refreshAll() {
    if (!currentSlot) return;
    await Promise.all([fetchBankState(), fetchClients()]);
    await refreshCharts();
}

async function fetchBankState() {
    if (!currentSlot) return;
    bankState = await api(`${API_BASE}/${currentSlot}/bank`);
    hudDate.textContent = getGameDateString(bankState.gameDay);
}

async function fetchClients() {
    if (!currentSlot) return;
    clients = await api(`${API_BASE}/${currentSlot}/clients`);
}

async function switchToAddClientView() {
    if (!currentSlot) return;
    showScreen('add-client-screen');
    hudMode.textContent = 'Bank > Add Client';
    clientNameInput.focus();
}

async function switchToClientView(clientId) {
    selectedClientId = clientId;
    localStorage.setItem(STORAGE_KEYS.clientId, String(clientId));
    hudMode.textContent = 'Client';
    await updateClientView();
    showScreen('client-view-screen');
    hudMode.textContent = `Client > ${clientViewName.textContent || ''}`;
}

async function switchToBankView() {
    if (!currentSlot) {
        showScreen('home-screen');
        return;
    }
    localStorage.removeItem(STORAGE_KEYS.clientId);
    await fetchBankState();
    await fetchClients();
    updateBankView();
    showScreen('bank-view-screen');
    hudMode.textContent = 'Bank Dashboard';
}

async function switchToInvestmentView() {
    if (!currentSlot) return;
    await fetchBankState();
    await updateInvestmentView();
    showScreen('investment-view-screen');
    hudMode.textContent = 'Bank > Investments';
}

async function createClient() {
    if (!currentSlot) return;
    try {
        await api(`${API_BASE}/${currentSlot}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: clientNameInput.value.trim() })
        });
        clientNameInput.value = '';
        flashSaveIndicator();
        await refreshAll();
        switchToBankView();
    } catch (error) {
        alert(error.message);
    }
}

function findClientById(id) {
    return clients.find(c => String(c.id) === String(id));
}

async function performDeposit() {
    if (!selectedClientId || !currentSlot) return;
    try {
        await api(`${API_BASE}/${currentSlot}/clients/${selectedClientId}/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: Number(depositAmountInput.value) })
        });
        depositAmountInput.value = '';
        clientErrorMessage.textContent = '';
        flashSaveIndicator();
        await refreshAll();
        await updateClientView();
    } catch (error) {
        showTemporaryError(clientErrorMessage, error.message);
    }
}

async function performWithdraw() {
    if (!selectedClientId || !currentSlot) return;
    try {
        await api(`${API_BASE}/${currentSlot}/clients/${selectedClientId}/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: Number(withdrawAmountInput.value) })
        });
        withdrawAmountInput.value = '';
        clientErrorMessage.textContent = '';
        flashSaveIndicator();
        await refreshAll();
        await updateClientView();
    } catch (error) {
        showTemporaryError(clientErrorMessage, error.message);
    }
}

function showTemporaryError(element, message) {
    element.textContent = message;
    setTimeout(() => {
        if (element.textContent === message) {
            element.textContent = '';
        }
    }, 3000);
}

async function updateClientView() {
    const client = findClientById(selectedClientId);
    if (!client) {
        switchToBankView();
        return;
    }
    clientViewName.textContent = client.name;
    clientViewBalance.textContent = formatCurrency(client.checkingBalance);
    clientViewCardNumber.textContent = client.cardNumber;
    clientViewCardExpiry.textContent = client.cardExpiry;
    clientViewCardCvv.textContent = client.cardCvv;
    clientViewWithdrawLimit.textContent = formatCurrency(DAILY_WITHDRAWAL_LIMIT);
    await renderClientTransactions(client.id);
}

async function renderClientTransactions(clientId) {
    const transactions = await api(`${API_BASE}/${currentSlot}/clients/${clientId}/transactions`);
    clientLogArea.innerHTML = '';
    if (!transactions.length) {
        clientLogArea.innerHTML = '<p class="text-xs text-gray-500">No transactions yet.</p>';
        return;
    }
    transactions.forEach(tx => {
        const logElement = document.createElement('div');
        logElement.className = 'log-entry';
        const dateStr = getGameDateString(tx.gameDay);
        const typeClass = tx.type === 'DEPOSIT' ? 'log-type-deposit' : 'log-type-withdrawal';
        const typeSymbol = tx.type === 'DEPOSIT' ? '➕' : '➖';
        logElement.innerHTML = `
            <span class="text-gray-500">${dateStr}:</span>
            <span class="${typeClass}">${typeSymbol} ${tx.type.charAt(0)}${tx.type.slice(1).toLowerCase()}</span>
            <span>$${formatCurrency(tx.amount)}</span>
        `;
        clientLogArea.appendChild(logElement);
    });
}

function updateBankView() {
    if (!bankState) return;
    const investedAmount = Number(bankState.investedSp500 || 0);
    const totalAssets = Number(bankState.totalAssets || 0);

    bankTotalAssets.textContent = formatCurrency(totalAssets);
    bankLiquidCash.textContent = formatCurrency(bankState.liquidCash || 0);
    bankInvestedAmount.textContent = formatCurrency(investedAmount);

    clientListDiv.innerHTML = '';
    if (!clients.length) {
        clientListDiv.innerHTML = '<p class="text-xs text-gray-500">No clients yet.</p>';
    } else {
        [...clients].sort((a, b) => a.name.localeCompare(b.name)).forEach(client => {
            const clientElement = document.createElement('div');
            clientElement.className = 'flex justify-between items-center text-xs p-2 hover:bg-gray-200 cursor-pointer rounded border border-transparent hover:border-gray-500';
            clientElement.innerHTML = `
                <span>${client.name}</span>
                <span>Bal: $${formatCurrency(client.checkingBalance)}</span>
            `;
            clientElement.onclick = () => switchToClientView(client.id);
            clientListDiv.appendChild(clientElement);
        });
    }
    updateHudDate();
}

function updateHudDate() {
    if (bankState) {
        hudDate.textContent = getGameDateString(bankState.gameDay);
    }
}

async function updateInvestmentView() {
    if (!currentSlot) return;
    const state = await api(`${API_BASE}/${currentSlot}/investments/sp500`);
    bankState = { ...bankState, ...state };
    investViewLiquidCash.textContent = formatCurrency(state.liquidCash || 0);
    sp500CurrentValue.textContent = formatCurrency(state.sp500Price || 0);
    sp500Holdings.textContent = formatCurrency(state.investedSp500 || 0);
    sp500NextDividend.textContent = getGameDateString(state.nextDividendDay);
    sp500NextGrowth.textContent = getGameDateString(state.nextGrowthDay);
    updateHudDate();
}

async function investSP500() {
    if (!currentSlot) return;
    try {
        await api(`${API_BASE}/${currentSlot}/investments/sp500/invest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: Number(investAmountInput.value) })
        });
        investAmountInput.value = '';
        investmentErrorMessage.textContent = '';
        flashSaveIndicator();
        await refreshAll();
        await updateInvestmentView();
    } catch (error) {
        showTemporaryError(investmentErrorMessage, error.message);
    }
}

async function divestSP500() {
    if (!currentSlot) return;
    try {
        await api(`${API_BASE}/${currentSlot}/investments/sp500/divest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: Number(divestAmountInput.value) })
        });
        divestAmountInput.value = '';
        investmentErrorMessage.textContent = '';
        flashSaveIndicator();
        await refreshAll();
        await updateInvestmentView();
    } catch (error) {
        showTemporaryError(investmentErrorMessage, error.message);
    }
}

function initializeCharts() {
    Chart.defaults.font.family = getComputedStyle(document.documentElement).getPropertyValue('--font-primary').trim();
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--color-text-medium').trim();
    Chart.defaults.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--color-panel-border').trim();

    const clientMoneyColors = ['#4fc3f7', '#ff7043', '#66bb6a', '#ffee58', '#ab47bc', '#ef5350', '#26a69a'];

    clientMoneyChart = new Chart(clientMoneyChartCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                label: 'Client Deposits',
                data: [],
                backgroundColor: clientMoneyColors,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-panel-bg').trim(),
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });

    activityChart = new Chart(activityChartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Deposits',
                    data: [],
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-accent-green').trim(),
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.2,
                    fill: true,
                    pointRadius: 2
                },
                {
                    label: 'Withdrawals',
                    data: [],
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-accent-red').trim(),
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    tension: 0.2,
                    fill: true,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
                x: { display: true }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

async function refreshCharts() {
    if (!currentSlot || !clientMoneyChart || !activityChart) return;
    const [clientDistribution, activityData] = await Promise.all([
        api(`${API_BASE}/${currentSlot}/charts/clients`),
        api(`${API_BASE}/${currentSlot}/charts/activity`)
    ]);
    const labels = clientDistribution.clients.map(c => c.name.substring(0, 15));
    const balances = clientDistribution.clients.map(c => c.balance);
    clientMoneyChart.data.labels = labels;
    clientMoneyChart.data.datasets[0].data = balances;
    clientMoneyChart.update();

    const dayLabels = activityData.days.map(getGameDateString);
    activityChart.data.labels = dayLabels;
    activityChart.data.datasets[0].data = activityData.cumulativeDeposits;
    activityChart.data.datasets[1].data = activityData.cumulativeWithdrawals;
    activityChart.update();
}

function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
        if (!currentSlot) return;
        try {
            await fetchBankState();
            updateHudDate();
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen && activeScreen.id === 'bank-view-screen') {
                updateBankView();
                await refreshCharts();
            } else if (activeScreen && activeScreen.id === 'investment-view-screen') {
                await updateInvestmentView();
            } else if (activeScreen && activeScreen.id === 'client-view-screen' && selectedClientId) {
                await fetchClients();
                await updateClientView();
            }
        } catch (error) {
            console.error('Auto-refresh failed', error);
        }
    }, POLL_INTERVAL_MS);
}

function stopPolling() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
}

async function attemptLogin() {
    const usernameOrEmail = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value;
    if (!usernameOrEmail || !password) {
        loginErrorMessage.textContent = 'Enter your username/email and password.';
        return;
    }
    loginErrorMessage.textContent = '';
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernameOrEmail, password })
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || 'Login failed');
        }
        const auth = await response.json();
        localStorage.setItem(STORAGE_KEYS.authToken, auth.token);
        updateUserCredentialDisplays();
        loginPasswordInput.value = '';
        await startAuthenticatedSession();
    } catch (error) {
        loginErrorMessage.textContent = error.message || 'Login failed.';
    }
}

async function attemptRegister() {
    const username = registerUsernameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirm = registerConfirmInput.value;
    if (!username || !email || !password || !confirm) {
        registerErrorMessage.textContent = 'Fill out all fields to register.';
        return;
    }
    if (password !== confirm) {
        registerErrorMessage.textContent = 'Passwords do not match.';
        return;
    }
    registerErrorMessage.textContent = '';
    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || 'Registration failed');
        }
        const auth = await response.json();
        localStorage.setItem(STORAGE_KEYS.authToken, auth.token);
        updateUserCredentialDisplays();
        registerPasswordInput.value = '';
        registerConfirmInput.value = '';
        await startAuthenticatedSession();
    } catch (error) {
        registerErrorMessage.textContent = error.message || 'Registration failed.';
    }
}

async function startAuthenticatedSession() {
    const savedSlot = localStorage.getItem(STORAGE_KEYS.slot);
    const savedScreen = localStorage.getItem(STORAGE_KEYS.screen);
    const savedClientId = localStorage.getItem(STORAGE_KEYS.clientId);
    try {
        updateUserCredentialDisplays();
        if (savedSlot) {
            const slotId = Number(savedSlot);
            await loadGame(slotId);
            if (savedScreen === 'client-view-screen' && savedClientId) {
                await switchToClientView(savedClientId);
            } else if (savedScreen === 'investment-view-screen') {
                await switchToInvestmentView();
            } else {
                await switchToBankView();
            }
        } else {
            await updateHomeScreen();
        }
        startPolling();
    } catch (error) {
        console.error('Failed to restore session', error);
        handleAuthExpired();
    }
}

function handleResize() {
    // Resize charts when window is resized
    if (clientMoneyChart) {
        clientMoneyChart.resize();
    }
    if (activityChart) {
        activityChart.resize();
    }
}

function initializeApp() {
    initializeCharts();
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    if (homeLogoutButton) {
        homeLogoutButton.addEventListener('click', logout);
    }
    quitButton.addEventListener('click', quitGame);
    if (loginForm) {
        loginForm.addEventListener('submit', event => {
            event.preventDefault();
            attemptLogin();
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', event => {
            event.preventDefault();
            attemptRegister();
        });
    }
    if (showRegisterButton) {
        showRegisterButton.addEventListener('click', () => {
            showRegisterForm();
        });
    }
    if (showLoginButton) {
        showLoginButton.addEventListener('click', () => {
            showLoginForm();
        });
    }
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (token) {
        startAuthenticatedSession();
    } else {
        showLoginScreen();
    }
    
    // Add resize handler for dynamic resizing
    window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initializeApp);
