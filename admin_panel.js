document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT ---
    // Collez ici l'URL de votre application web Google Apps Script
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxLeN19ZEz_UvlOJbIPfArHe_th04cQVu6-EmXX_vCc7ugByKb4aFsaIEh6gx3Mv34ufA/exec';

    // Éléments de la modale de connexion
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLoginModal = document.getElementById('admin-login-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    // Éléments du panneau d'administration
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const adminTabs = document.querySelector('.admin-tabs');
    const tabContents = document.querySelectorAll('.tab-content');
    const unpaidListDiv = document.getElementById('unpaid-list');
    const refreshBtn = document.getElementById('refreshBtn');

    // Éléments du scanner
    const startScanBtn = document.getElementById('start-scan-btn');
    const stopScanBtn = document.getElementById('stop-scan-btn');
    const scannerStatus = document.getElementById('scanner-status');
    const resultOverlay = document.getElementById('result-overlay');
    const resultStatus = document.getElementById('result-status');
    const resultName = document.getElementById('result-name');
    const resultMessage = document.getElementById('result-message');
    let html5QrCode = null;

    // --- NOUVEAU: Éléments du générateur de QR Code ---
    const qrGeneratorForm = document.getElementById('qr-generator-form');
    const idLookupInput = document.getElementById('id-lookup');
    const nameLookupInput = document.getElementById('name-lookup');
    const ticketContainer = document.getElementById('generated-ticket-container');


    // Gestionnaire générique pour fermer les modales
    document.querySelectorAll('.admin-modal .close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.admin-modal').style.display = 'none';
        });
    });

    // Afficher la modale de connexion
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            adminLoginModal.style.display = 'flex';
        });
    }

    // Gérer la soumission du formulaire de connexion
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;
            // Logique de connexion (simplifiée)
            if (username === 'admin' && password === 'admin2024') {
                adminLoginModal.style.display = 'none';
                adminPanelModal.style.display = 'flex';
                loadUnpaidRegistrations(); // Charger les données à l'ouverture
            } else {
                loginError.textContent = 'Nom d\'utilisateur ou mot de passe incorrect.';
            }
        });
    }

    // Gérer la navigation par onglets
    if (adminTabs) {
        adminTabs.addEventListener('click', (e) => {
            if (e.target.matches('.tab-btn')) {
                // Mettre à jour les classes des boutons
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                // Afficher le bon contenu
                const tabId = e.target.dataset.tab;
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                    }
                });
            }
        });
    }

    // Charger et afficher la liste des inscriptions non payées
    async function loadUnpaidRegistrations() {
        unpaidListDiv.innerHTML = '<p>Chargement des données...</p>';
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUnpaid`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            unpaidListDiv.innerHTML = ''; // Vider la liste
            if (json.data.length === 0) {
                unpaidListDiv.innerHTML = '<p>Aucune inscription en attente de paiement.</p>';
                return;
            }

            json.data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'unpaid-item';
                div.innerHTML = `<span>${item.name} (ID: ${item.id})</span>`;
                const button = document.createElement('button');
                button.className = 'btn btn-small';
                button.textContent = 'Marquer comme Payé';
                button.onclick = () => markAsPaid(item.id, button);
                div.appendChild(button);
                unpaidListDiv.appendChild(div);
            });
        } catch (error) {
            unpaidListDiv.innerHTML = `<p style="color: tomato;">Erreur: ${error.message}</p>`;
        }
    }

    // Marquer une inscription comme payée
    async function markAsPaid(id, button) {
        button.disabled = true;
        button.textContent = 'Mise à jour...';
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=markAsPaid&id=${id}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            button.closest('.unpaid-item').style.textDecoration = 'line-through';
            button.textContent = 'Payé !';
        } catch (error) {
            alert(`Erreur: ${error.message}`);
            button.disabled = false;
            button.textContent = 'Marquer comme Payé';
        }
    }

    if (refreshBtn) refreshBtn.addEventListener('click', loadUnpaidRegistrations);

    // Démarrer le scanner QR
    function startScan() {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("scanner-view");
        }
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
            .then(() => {
                scannerStatus.textContent = "Scanner démarré. Pointez la caméra vers un QR code.";
                startScanBtn.style.display = 'none';
                stopScanBtn.style.display = 'inline-block';
            })
            .catch(err => {
                scannerStatus.textContent = `Erreur de caméra: ${err.message}`;
            });
    }

    // Arrêter le scanner QR
    function stopScan() {
        if (html5QrCode) {
            html5QrCode.stop()
                .then(() => {
                    scannerStatus.textContent = 'Le scanner est prêt.';
                    startScanBtn.style.display = 'inline-block';
                    stopScanBtn.style.display = 'none';
                    html5QrCode = null; // Réinitialiser pour pouvoir redémarrer
                })
                .catch(err => console.error('Erreur à l\'arrêt du scanner:', err));
        }
    }
    
    if (startScanBtn) startScanBtn.addEventListener('click', startScan);
    if (stopScanBtn) stopScanBtn.addEventListener('click', stopScan);


    // Callback en cas de succès du scan
    async function onScanSuccess(decodedText) {
        stopScan(); // Arrêter le scan après un succès
        
        try {
            // MODIFICATION MAJEURE: Le QR code contient du JSON
            const qrData = JSON.parse(decodedText);
            
            // On vérifie que les données nécessaires sont bien dans le QR code
            if (!qrData.id || !qrData.name) {
                throw new Error("Format de QR code invalide.");
            }

            // On envoie l'ID et le nom pour le check-in
            const url = `${GOOGLE_SCRIPT_URL}?action=checkin&id=${qrData.id}&name=${encodeURIComponent(qrData.name)}`;
            const res = await fetch(url);
            const json = await res.json();
            
            if (!json.success) throw new Error(json.error);

            // Afficher le résultat dans l'overlay
            const { status, name, message } = json.data;
            resultStatus.textContent = message;
            resultName.textContent = name || '';
            resultMessage.textContent = ''; // Peut être utilisé pour des infos supp.

            resultOverlay.className = `overlay-${status}`; // Applique une classe pour le style
            resultOverlay.style.display = 'flex';

        } catch (error) {
            // Gérer les erreurs de format JSON ou les erreurs réseau
            resultStatus.textContent = "Erreur de validation";
            resultName.textContent = error.message;
            resultMessage.textContent = "Ce QR code n'est pas valide pour cet événement.";
            resultOverlay.className = 'overlay-not_found';
            resultOverlay.style.display = 'flex';
        }

        // Cacher l'overlay après 4 secondes
        setTimeout(() => {
            resultOverlay.style.display = 'none';
            // On ne redémarre pas le scan automatiquement, l'admin doit le relancer.
        }, 4000);
    }

    // Callback en cas d'échec du scan (optionnel, pour le débogage)
    function onScanFailure(error) {
        // Ne fait rien pour ne pas embêter l'utilisateur avec des messages constants
    }


    // --- NOUVEAU: Logique pour le générateur de ticket ---
    if (qrGeneratorForm) {
        qrGeneratorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idToLookup = idLookupInput.value.trim();
            const nameToLookup = nameLookupInput.value.trim();
        
            if (!idToLookup || !nameToLookup) return;
        
            ticketContainer.innerHTML = '<p>Recherche du participant...</p>';
            
            try {
                // On construit l'URL avec les deux paramètres
                const url = `${GOOGLE_SCRIPT_URL}?action=getRegistrationDetails&id=${idToLookup}&name=${encodeURIComponent(nameToLookup)}`;
                const res = await fetch(url);
                const json = await res.json();
        
                if (!json.success) throw new Error(json.error);
        
                // On affiche le ticket avec les données reçues
                displayGeneratedTicket(json.data);
        
            } catch (error) {
                ticketContainer.innerHTML = `<p style="color: tomato;">Erreur : ${error.message}</p>`;
            }
        });
    }

    // --- NOUVEAU: Fonction pour afficher le ticket généré ---
    function displayGeneratedTicket(data) {
        ticketContainer.innerHTML = `
            <h4>Ticket pour ${escapeHtml(data.full_name)}</h4>
            <div id="ticket-to-download" class="ticket" style="display: block; margin: 0 auto; max-width: 350px; border: 1px solid #ccc;">
                <div class="ticket-header"><h3>ELEGANCE - NOBLESSE - VIE EN CHRIST</h3></div>
                <div id="ticket-details-generated" class="ticket-details" style="padding: 15px;"></div>
                <div class="qr-code" style="text-align: center; padding-bottom: 15px;"><canvas id="qrcodeCanvas-generated"></canvas></div>
                <div class="ticket-footer"><p>Merci et à très bientôt !</p></div>
            </div>
            <button id="download-generated-btn" class="btn" style="margin-top: 1rem;">Télécharger le Ticket</button>
        `;

        document.getElementById('ticket-details-generated').innerHTML = `
            <strong>Nom:</strong> ${escapeHtml(data.full_name)}<br>
            <strong>Téléphone:</strong> ${escapeHtml(data.phone)}<br>
            <strong>Église:</strong> ${escapeHtml(data.church)}<br>
            <strong>ID:</strong> ${data.id}<br>
            <strong>Date:</strong> 19 Décembre — 16:00<br>
            <strong>Lieu:</strong> MEEC CENTRE<br>
            <strong>Tarif:</strong> 5000 FCFA
        `;

        const qrPayload = JSON.stringify({
            id: data.id,
            name: data.full_name,
            event: 'ELEGANCE-NOBLESSE-VIE EN CHRIST'
        });
        new QRious({
            element: document.getElementById('qrcodeCanvas-generated'),
            value: qrPayload,
            size: 160,
        });
        
        document.getElementById('download-generated-btn').onclick = () => {
            const ticketElement = document.getElementById('ticket-to-download');
            html2canvas(ticketElement, { backgroundColor: '#ffffff' }).then(canvas => {
                const link = document.createElement('a');
                link.download = `Ticket_Gala_${data.id}_${data.full_name.replace(/ /g, '_')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        };
    }

    // --- NOUVEAU: Fonction utilitaire pour échapper le HTML ---
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"'`=\/]/g, s => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
            '/': '
