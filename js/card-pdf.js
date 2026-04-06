'use strict';

/* ═══════════════════════════════════════════════════════════════
   card-pdf.js — Screenshot the visible card preview → PDF
   Same approach as trial-report.js: capture the on-screen preview
   with html2canvas, then pipe the image into jsPDF.
═══════════════════════════════════════════════════════════════ */

const PDF = {

  /** Dynamically load a script if its global isn't available */
  _loadScript(global, src) {
    if (window[global]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${global}`));
      document.head.appendChild(s);
    });
  },

  async export(player, layoutId) {
    // Load libraries on demand
    try {
      await PDF._loadScript('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await PDF._loadScript('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    } catch (err) {
      alert('PDF libraries failed to load. Please check your internet connection and refresh.');
      return;
    }

    // Find the visible card preview on the page
    const source = document.querySelector('#card-preview-wrapper .player-card');
    if (!source) {
      alert('Please preview the card first.');
      return;
    }

    const exportBtns = document.querySelectorAll('#card-btn-export-pdf, #btn-export-pdf');
    exportBtns.forEach(b => { b.disabled = true; b.textContent = 'Exporting…'; });

    try {
      // Scroll the preview into view so html2canvas can see it
      source.scrollIntoView({ block: 'start' });
      await new Promise(r => setTimeout(r, 300));

      // Capture the visible preview — same approach as trial report
      const canvas = await html2canvas(source, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Build PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      const pdf = new jspdf.jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));

      // Add clickable link annotations for video URLs
      const videoLinks = PDF._getVideoLinks(source);
      videoLinks.forEach(link => {
        pdf.link(link.x, link.y, link.w, link.h, { url: link.url });
      });

      // Download
      const lastName  = (player.lastName  || 'Player').toUpperCase().replace(/\s+/g, '_');
      const firstName = (player.firstName || '').toUpperCase().replace(/\s+/g, '_');
      const filename  = `${lastName}_${firstName}_ITP_Card.pdf`;

      const blob = pdf.output('blob');
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);

    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed: ' + err.message);
    }

    exportBtns.forEach(b => { b.disabled = false; b.textContent = 'Export PDF'; });
  },

  /** Measure video item positions and convert to PDF mm coords */
  _getVideoLinks(cardEl) {
    const links = [];
    const cardRect = cardEl.getBoundingClientRect();
    const scaleX = 210 / 794;
    const scaleY = 297 / 1123;

    cardEl.querySelectorAll('.card-video-item[data-url]').forEach(item => {
      const url = item.dataset.url;
      if (!url) return;
      const rect = item.getBoundingClientRect();
      links.push({
        x: (rect.left - cardRect.left) * scaleX,
        y: (rect.top  - cardRect.top)  * scaleY,
        w: rect.width  * scaleX,
        h: rect.height * scaleY,
        url
      });
    });
    return links;
  },
};
