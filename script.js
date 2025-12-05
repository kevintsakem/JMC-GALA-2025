document.addEventListener('DOMContentLoaded', () => {
  // --- IMPORTANT ---
  // Collez ici l'URL de votre application web Google Apps Script que vous avez copiée
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsSIEKIJd6vdk7DUjo25TzFcjG_a7YNnJgtLWH-uFDisto8_X5RC_vyWk_px2w-PSdww/exec';

  const form = document.getElementById('regForm');
  const confBox = document.getElementById('confirmation');
  const confText = document.getElementById('confText');
  const ticketDetails = document.getElementById('ticketDetails');
  const qrCanvas = document.getElementById('qrcodeCanvas');
  const downloadBtn = document.getElementById('downloadTicketBtn');
  const submitBtn = form.querySelector('button[type="submit"]');

  // === MODIFICATION: Récupérer les éléments à masquer/afficher ===
  const spinner = document.querySelector('.loading-spinner');
  const ticketEl = document.getElementById('ticket');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // === MODIFICATION: Amélioration de l'expérience utilisateur ===
    // 1. Cacher le formulaire
    form.style.display = 'none';

    // 2. Afficher la section de confirmation avec le spinner
    confBox.style.display = 'block';
    spinner.style.display = 'block';
    confText.innerText = 'Enregistrement de votre réservation...';

    // 3. Désactiver le bouton pour éviter les clics multiples
    submitBtn.disabled = true;
    submitBtn.textContent = 'Traitement en cours...';

    const data = new FormData(form);

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: data,
      });

      const jsonText = await res.text();
      const json = JSON.parse(jsonText);

      // === MODIFICATION: Cacher le spinner après le chargement ===
      spinner.style.display = 'none';

      if (!json.success) {
        throw new Error(json.error || 'Une erreur inconnue est survenue.');
      }

      // Affiche le message de confirmation
      confText.innerHTML = `Bienvenue <strong>${escapeHtml(json.full_name)}</strong> !<br>
        Votre ID de réservation est : <strong>${json.id}</strong>.<br>
        Votre place est maintenant réservée.`;

      // Remplit les détails du ticket
      ticketDetails.innerHTML = `
        <strong>Nom:</strong> ${escapeHtml(json.full_name)}<br>
        <strong>Téléphone:</strong> ${escapeHtml(json.phone)}<br>
        <strong>Église:</strong> ${escapeHtml(json.church)}<br>
        <strong>ID:</strong> ${json.id}<br>
        <strong>Date:</strong> 19 Décembre — 16:00<br>
        <strong>Lieu:</strong> MEEC CENTRE<br>
        <strong>Tarif:</strong> 5000 FCFA
      `;

      // Génère le code QR
      const qrPayload = JSON.stringify({
        id: json.id,
        name: json.full_name,
        event: 'ELEGANCE-NOBLESSE-VIE EN CHRIST'
      });

      new QRious({
        element: qrCanvas,
        value: qrPayload,
        size: 160,
        foreground: 'black',
        background: 'white',
        level: 'H'
      });
      
      // === MODIFICATION: Afficher le ticket maintenant qu'il est prêt ===
      ticketEl.style.display = 'block';

      // Configure le bouton de téléchargement
      downloadBtn.onclick = () => {
        html2canvas(ticketEl, { backgroundColor: '#ffffff' }).then(canvas => {
          const link = document.createElement('a');
          link.download = `Ticket_Gala_${json.id}_${json.full_name.replace(/ /g, '_')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      };

    } catch (err) {
      console.error(err);
      // === MODIFICATION: Cacher le spinner et gérer l'erreur proprement ===
      spinner.style.display = 'none';
      confText.innerHTML = `<span style="color:tomato;">Erreur : ${err.message}.</span><br><br>Veuillez vérifier votre connexion ou réessayer.`;
      
      // Proposer de rafraîchir pour une nouvelle tentative
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Réessayer';
      retryButton.className = 'btn';
      retryButton.style.marginTop = '1rem';
      retryButton.onclick = () => window.location.reload();
      confText.appendChild(retryButton);
    }
  });

  // Fonction pour échapper les caractères HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`=\/]/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
    }[s]));
  }
});



