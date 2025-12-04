document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('regForm');
  const confBox = document.getElementById('confirmation');
  const confText = document.getElementById('confText');
  const ticketDetails = document.getElementById('ticketDetails');
  const qrCanvas = document.getElementById('qrcodeCanvas');
  const downloadBtn = document.getElementById('downloadTicketBtn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    confBox.style.display = 'block';
    confText.innerText = 'Processing your registration...';

    const data = new FormData(form);

    // We'll create a qr_payload client-side and send it with the form
    // Create a short payload (JSON string) that will be encoded in the QR
    const payloadObj = {
      event: 'ELEGANCE-NOBLESSE-VIE EN CHRIST',
      name: data.get('full_name'),
      phone: data.get('phone'),
      church: data.get('church'),
      ts: new Date().toISOString()
    };
    const qr_payload = JSON.stringify(payloadObj);
    data.append('qr_payload', qr_payload);

    try {
      const res = await fetch('save_subscription.php', {
        method: 'POST',
        body: data
      });
      const json = await res.json();

      if (!json.success) {
        confText.innerHTML = `<span style="color:tomato">Error: ${escapeHtml(json.error || 'Unknown')}</span>`;
        return;
      }

      // Show confirmation message on page
      confText.innerHTML = `Welcome <strong>${escapeHtml(json.full_name)}</strong>!<br>
        Your registration ID: <strong>${json.id}</strong>.<br>
        A notification has been sent to the organizer.`;

      // Fill ticket details
      ticketDetails.innerHTML = `
        <strong>Name:</strong> ${escapeHtml(json.full_name)}<br>
        <strong>Phone:</strong> ${escapeHtml(json.phone)}<br>
        <strong>Church:</strong> ${escapeHtml(json.church)}<br>
        <strong>ID:</strong> ${json.id}<br>
        <strong>Date:</strong> 19 Dec — 4:00 PM<br>
        <strong>Venue:</strong> MEEC CENTRE<br>
        <strong>Fee:</strong> 5000 FCFA
      `;

      // Generate QR on canvas (encode registration id + payload)
      const qrPayloadForCanvas = JSON.stringify({ id: json.id, name: json.full_name, phone: json.phone, church: json.church, event: 'ELEGANCE-NOBLESSE-VIE EN CHRIST' });
      new QRious({
        element: qrCanvas,
        value: qrPayloadForCanvas,
        size: 160,
        level: 'H'
      });

      // download button: capture #ticket element and download as PNG
      downloadBtn.onclick = () => {
        const ticketEl = document.getElementById('ticket');
        html2canvas(ticketEl, { backgroundColor: null }).then(canvas => {
          const link = document.createElement('a');
          link.download = `gala_ticket_${json.id}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      };

      form.reset();

    } catch (err) {
      console.error(err);
      confText.innerHTML = `<span style="color:tomato">Network or server error. Please try again later.</span>`;
    }
  });

  // small helper to escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`=\/]/g, function(s) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[s];
    });
  }
});
