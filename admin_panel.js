document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // CONFIGURATION ET ÉLÉMENTS DU DOM
    // ===================================================================
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzgNEJcq-KWFt07w8uFmZn8iD-6qJZGul_g1ts7gD-YK0DrIisSKTVUKjQOam2-nLk7w/exec';
    const ADMIN_USER = 'admin_gala';
    const ADMIN_PASS = 'P@sswordGala2025!';

    const adminLink = document.getElementById('admin-link');
    const loginModal = document.getElementById('admin-login-modal');
    const panelModal = document.getElementById('admin-panel-modal');
    const closeBtns = document.querySelectorAll('.close-btn');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    // Panneau Admin
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const unpaidListDiv = document.getElementById('unpaid-list');
    const refreshBtn = document.getElementById('refreshBtn');

    // Scanner
    const startScanBtn = document.getElementById('start-scan-btn');
    const stopScanBtn = document.getElementById('stop-scan-btn');
    const scannerStatus = document.getElementById('scanner-status');
    const scannerView = document.getElementById('scanner-view');
    const resultOverlay = document.getElementById('result-overlay');
    let html5QrCode;
    let isScanning = true; // Initialisé à true pour le premier scan

    // ===================================================================
    // GESTION DES MODALES ET DE LA CONNEXION
    // ===================================================================
    adminLink.addEventListener('click', (e) => { e.preventDefault(); loginModal.style.display = 'block'; });

    const closeModal = () => {
        loginModal.style.display = 'none';
        panelModal.style.display = 'none';
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.error("Erreur à l'arrêt du scanner:", err));
        }
    };
    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => {
        if (e.target == loginModal || e.target == panelModal) {
            closeModal();
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (username === ADMIN_USER && password === ADMIN_PASS) {
            loginModal.style.display = 'none';
            panelModal.style.display = 'block';
            fetchUnpaidUsers(); // Appel initial au chargement
        } else {
            loginError.textContent = 'Identifiants incorrects.';
        }
    });

    // ===================================================================
    // GESTION DES ONGLETS
    // ===================================================================
    tabBtns.forEach(btn => btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }));

    // ===================================================================
    // SECTION 1 : LOGIQUE DE VALIDATION DES PAIEMENTS
    // ===================================================================
    refreshBtn.addEventListener('click', fetchUnpaidUsers);

    async function fetchUnpaidUsers() {
        unpaidListDiv.innerHTML = '<p>Chargement de la liste...</p>';
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUnpaid`);
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            renderUnpaidList(result.data);
        } catch (error) {
            unpaidListDiv.innerHTML = `<p style="color:tomato;">Erreur: ${error.message}</p>`;
        }
    }

    function renderUnpaidList(users) {
        unpaidListDiv.innerHTML = '';
        if (!users || users.length === 0) {
            unpaidListDiv.innerHTML = '<p>Aucune inscription en attente de paiement !</p>';
            return;
        }
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'unpaid-item';
            item.innerHTML = `<div><strong>${user.name}</strong><br><small>ID: ${user.id}</small></div><button class="btn-validate" data-id="${user.id}">✅ Marquer Payé</button>`;
            unpaidListDiv.appendChild(item);
        });
        document.querySelectorAll('.btn-validate').forEach(button => button.addEventListener('click', handleMarkAsPaid));
    }

    async function handleMarkAsPaid(event) {
        const button = event.target;
        const id = button.dataset.id;
        if (!confirm(`Voulez-vous vraiment marquer l'inscription ${id} comme payée ?`)) return;
        button.disabled = true; button.textContent = 'Validation...';
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=markAsPaid&id=${id}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            fetchUnpaidUsers(); // Rafraîchit la liste
        } catch (error) {
            alert(`Erreur : ${error.message}`);
            button.disabled = false; button.textContent = '✅ Marquer Payé';
        }
    }

    // ===================================================================
    // SECTION 2 : LOGIQUE DU SCANNER
    // ===================================================================
    html5QrCode = new Html5Qrcode("scanner-view");

    startScanBtn.addEventListener('click', () => {
        startScanBtn.style.display = 'none';
        stopScanBtn.style.display = 'inline-block';
        scannerStatus.textContent = 'Démarrage de la caméra...';
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
            .then(() => scannerStatus.textContent = "Caméra active. Scannez un ticket.")
            .catch(err => scannerStatus.textContent = "Erreur caméra : " + err);
    });

    stopScanBtn.addEventListener('click', () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                startScanBtn.style.display = 'inline-block';
                stopScanBtn.style.display = 'none';
                scannerStatus.textContent = 'Le scanner est arrêté.';
            }).catch(err => console.error("Erreur à l'arrêt du scanner:", err));
        }
    });

    function onScanSuccess(decodedText) {
        if (!isScanning) return;
        isScanning = false;
        try {
            const data = JSON.parse(decodedText);
            if (data.id) verifyTicket(data.id);
            else showResult('error', 'Invalide', 'Le QR code ne contient pas d\'ID.');
        } catch (error) {
            // Si le QR code contient du texte simple (non JSON), on essaie de le vérifier quand même
            verifyTicket(decodedText);
        }
    }
    
    resultOverlay.addEventListener('click', () => {
        resultOverlay.style.display = 'none';
        isScanning = true; // Permet le prochain scan
    });

    async function verifyTicket(id) {
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=checkin&id=${id}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            const { status, name, message } = result.data;

            if (status === 'success') showResult('success', 'Valide', message, name);
            else if (status === 'already_checked_in') showResult('warning', 'Déjà Scanné', message, name);
            else if (status === 'unpaid') showResult('error', 'Paiement Requis', message, name);
            else showResult('error', 'Inconnu', message);
        } catch (error) {
            showResult('error', 'Erreur Réseau', error.message);
        }
    }

    function showResult(type, statusText, messageText, nameText = '') {
        resultOverlay.className = type;
        document.getElementById('result-status').textContent = statusText;
        document.getElementById('result-name').textContent = nameText;
        document.getElementById('result-message').textContent = messageText;
        resultOverlay.style.display = 'flex';
    }

}); // FIN DU `DOMContentLoaded`

