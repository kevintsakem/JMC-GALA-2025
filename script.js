document.addEventListener('DOMContentLoaded', () => {
  // ===================================================================
  // CONFIGURATION ET RÉFÉRENCES AUX ÉLÉMENTS DU DOM
  // ===================================================================
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzhOUryLxPqkYJq_BptinTG3SNHnTcEcnfEi5q6DtpnkqBn4KN9MaY7ci6XE2PVSoiFww/exec';

  const form = document.getElementById('regForm');
  if (!form) return; // Si le formulaire n'est pas sur la page, on ne fait rien

  const submitBtn = form.querySelector('button[type="submit"]');
  const confBox = document.getElementById('confirmation');
  const confText = document.getElementById('confText');
  const ticketEl = document.getElementById('ticket');
  const ticketDetails = document.getElementById('ticketDetails');
  const qrCanvas = document.getElementById('qrcodeCanvas');
  const downloadBtn = document.getElementById('downloadTicketBtn');
  const loadingSpinner = document.querySelector('.loading-spinner'); // On récupère le spinner

  // ===================================================================
  // ÉCOUTEUR D'ÉVÉNEMENT POUR LA SOUMISSION DU FORMULAIRE
  // ===================================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page

    // --- 1. DÉBUT DU CHARGEMENT ---
    // On change l'interface pour montrer que quelque chose se passe
    submitBtn.disabled = true;
    submitBtn.textContent = 'Traitement en cours...';
    form.style.display = 'none'; // On masque le formulaire
    confBox.style.display = 'block'; // On affiche la zone de confirmation
    loadingSpinner.style.display = 'block'; // ON AFFICHE LE SPINNER
    confText.innerText = 'Enregistrement de votre réservation...';
    ticketEl.style.display = 'none'; // On cache le futur ticket
    downloadBtn.style.display = 'none'; // On cache le futur bouton de téléchargement

    const data = new FormData(form);

    try {
      // --- 2. ENVOI DES DONNÉES À GOOGLE SCRIPT ---
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: data,
      });
      
      const jsonText = await res.text();
      const json = JSON.parse(jsonText);

      // Si Google Script renvoie une erreur, on la propage
      if (!json.success) {
        throw new Error(json.error || 'Une erreur inconnue est survenue depuis le serveur.');
      }
      
      // --- 3. SUCCÈS DE LA RÉSERVATION ---
      // L'interface est mise à jour avec les informations reçues
      loadingSpinner.style.display = 'none'; // ON CACHE LE SPINNER
      ticketEl.style.display = 'block'; // On affiche la zone du ticket
      downloadBtn.style.display = 'block'; // On affiche le bouton de téléchargement
      
      // Message de bienvenue
      confText.innerHTML = `Bienvenue <strong>${escapeHtml(json.full_name)}</strong> !<br>
        Votre ID de réservation est : <strong>${json.id}</strong>.`;

      // Remplissage des détails du ticket
      ticketDetails.innerHTML = `
        <strong>Nom:</strong> ${escapeHtml(json.full_name)}<br>
        <strong>Téléphone:</strong> ${escapeHtml(json.phone)}<br>
        <strong>Église:</strong> ${escapeHtml(json.church)}<br>
        <strong>ID:</strong> ${json.id}<br>
        <strong>Date:</strong> 19 Décembre — 16:00<br>
        <strong>Lieu:</strong> MEEC CENTRE<br>
        <strong>Tarif:</strong> 5000 FCFA
      `;

      // Génération du QR code
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

      // Configuration du bouton de téléchargement
      downloadBtn.onclick = () => {
        html2canvas(ticketEl, { backgroundColor: '#ffffff' }).then(canvas => {
          const link = document.createElement('a');
          link.download = `Ticket_Gala_${json.id}_${json.full_name.replace(/ /g, '_')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      };

    } catch (err) {
      // --- 4. ERREUR LORS DE LA RÉSERVATION ---
      console.error("Erreur lors de la réservation :", err);
      loadingSpinner.style.display = 'none'; // ON CACHE AUSSI LE SPINNER EN CAS D'ERREUR
      
      // Affiche un message d'erreur clair
      confText.innerHTML = `<span style="color:tomato;">Erreur : ${err.message}.<br>Veuillez réessayer ou vérifier votre connexion.</span>`;
      
      // On pourrait ajouter un bouton "Réessayer" qui ferait réapparaître le formulaire
      // Par exemple, en ajoutant un bouton dans le HTML et en lui donnant un event listener.
    }
  });

  // ===================================================================
  // FONCTION UTILITAIRE POUR SÉCURISER LES DONNÉES (XSS)
  // ===================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`=\/]/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
    }[s]));
  }
});

