document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT : COLLEZ VOTRE NOUVELLE URL DE SCRIPT ICI ---
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0gtmAR_A_5kbK-PiLsHnMyS5zdstwScHCq33A06PqSs1KXaaX_m-dXMmNCSlxSbNm2Q/exec';

    const form = document.getElementById('regForm');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const confBox = document.getElementById('confirmation');
    const confText = document.getElementById('confText');
    const ticketEl = document.getElementById('ticket');
    const ticketDetails = document.getElementById('ticketDetails');
    const qrCanvas = document.getElementById('qrcodeCanvas');
    const downloadBtn = document.getElementById('downloadTicketBtn');
    const loadingSpinner = document.querySelector('.loading-spinner');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- Début du chargement ---
        submitBtn.disabled = true;
        form.style.display = 'none';
        confBox.style.display = 'block';
        loadingSpinner.style.display = 'block';
        confText.innerText = 'Enregistrement de votre réservation...';
        ticketEl.style.display = 'none';
        downloadBtn.style.display = 'none';

        const data = new FormData(form);

        try {
            // --- Envoi en POST au script Google ---
            const res = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: data,
            });
            const json = await res.json();

            if (!json.success) throw new Error(json.error || 'Une erreur est survenue.');

            // --- Succès ---
            loadingSpinner.style.display = 'none';
            ticketEl.style.display = 'block';
            downloadBtn.style.display = 'block';
            
            confText.innerHTML = `Bienvenue <strong>${escapeHtml(json.full_name)}</strong> !<br>Votre ID de réservation est : <strong>${json.id}</strong>.`;

            ticketDetails.innerHTML = `
                <strong>Nom:</strong> ${escapeHtml(json.full_name)}<br>
                <strong>Téléphone:</strong> ${escapeHtml(json.phone)}<br>
                <strong>Église:</strong> ${escapeHtml(json.church)}<br>
                <strong>ID:</strong> ${json.id}<br>
                <strong>Date:</strong> 19 Décembre — 16:00<br>
                <strong>Lieu:</strong> MEEC CENTRE<br>
                <strong>Tarif:</strong> 5000 FCFA
            `;

            const qrPayload = JSON.stringify({ id: json.id, name: json.full_name });
            new QRious({ element: qrCanvas, value: qrPayload, size: 160, level: 'H' });

            downloadBtn.onclick = () => {
                html2canvas(ticketEl, { backgroundColor: '#ffffff' }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `Ticket_Gala_${json.id}_${json.full_name.replace(/ /g, '_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                });
            };

        } catch (err) {
            // --- Erreur ---
            loadingSpinner.style.display = 'none';
            confText.innerHTML = `<span style="color:tomato;">Erreur : ${err.message}.<br>Veuillez réessayer ou vérifier votre connexion.</span>`;
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"'`=\/]/g, s => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
            '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
        }[s]));
    }
});


