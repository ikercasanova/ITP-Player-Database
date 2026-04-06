'use strict';

/* ═══════════════════════════════════════════════════════════════
   card-pdf.js — Direct html2canvas + jsPDF export for A4 player cards
   Replaces German umlauts in throwaway card element before capture
   to work around html2canvas 1.4.1 IndexSizeError bug.
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

    // Show loading state
    const exportBtns = document.querySelectorAll('#card-btn-export-pdf, #btn-export-pdf');
    exportBtns.forEach(b => { b.disabled = true; b.textContent = 'Exporting…'; });

    try {
      // Build a fresh card element at full A4 size
      const cardEl = buildCard(player, layoutId);

      // Must be in DOM and visible for html2canvas to capture
      cardEl.style.position = 'fixed';
      cardEl.style.left = '0';
      cardEl.style.top = '0';
      cardEl.style.width = '794px';
      cardEl.style.height = '1123px';
      cardEl.style.zIndex = '99999';
      cardEl.style.transform = 'none';
      document.body.appendChild(cardEl);

      // ── Pre-process for html2canvas ────────────────────────────

      // Fix: Replace <img object-fit:cover> with background-image div
      const photoImg = cardEl.querySelector('.card-photo');
      if (photoImg && photoImg.tagName === 'IMG') {
        const div = document.createElement('div');
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.backgroundImage = `url(${photoImg.src})`;
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = photoImg.style.objectPosition || 'center center';
        div.style.display = 'block';
        photoImg.replaceWith(div);
      }

      // Fix: Replace external video thumbnails with generated fallbacks
      cardEl.querySelectorAll('.card-video-thumb').forEach(img => {
        img.style.display = 'none';
        const fallback = img.nextElementSibling;
        if (fallback && fallback.classList.contains('card-video-thumb-gen')) {
          fallback.style.display = 'flex';
        }
      });

      // Capture video link positions for clickable PDF annotations
      const videoLinks = PDF._getVideoLinks(cardEl);

      // Fix: Replace German umlauts in text nodes to prevent
      // html2canvas IndexSizeError. The bug is in html2canvas's
      // Range-based text measurement which miscalculates offsets
      // for ö,ü,ä,ß characters in table cells with letter-spacing.
      // This card element is thrown away after capture.
      const walker = document.createTreeWalker(cardEl, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode())) {
        if (textNode.nodeValue) {
          textNode.nodeValue = textNode.nodeValue
            .replace(/ö/g, 'oe').replace(/ü/g, 'ue')
            .replace(/ä/g, 'ae').replace(/ß/g, 'ss')
            .replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
            .replace(/Ä/g, 'Ae');
        }
      }

      // Wait for images to settle
      await new Promise(r => setTimeout(r, 300));

      // ── Capture with html2canvas ──────────────────────────────

      const canvas = await html2canvas(cardEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      });

      // Remove the card from DOM
      document.body.removeChild(cardEl);

      // ── Build PDF with jsPDF ──────────────────────────────────

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
      alert('PDF export failed. Try in Chrome for best results.');
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
