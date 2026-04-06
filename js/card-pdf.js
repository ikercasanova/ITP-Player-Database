/* ═══════════════════════════════════════════════════════════════
   card-pdf.js — Build a fresh card at full A4 size → capture → PDF
   Uses dom-to-image-more (SVG foreignObject) to avoid html2canvas
   IndexSizeError bug with letter-spacing + multi-byte characters.
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
      await PDF._loadScript('domtoimage', 'https://cdn.jsdelivr.net/npm/dom-to-image-more@3.4.5/dist/dom-to-image-more.min.js');
      await PDF._loadScript('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    } catch (err) {
      alert('PDF libraries failed to load. Please check your internet connection and refresh.');
      return;
    }

    // Build a fresh card at full A4 size
    const cardData = typeof CardEditor !== 'undefined' ? CardEditor._mapPlayerToCard(player) : player;
    const cardEl = buildCard(cardData, layoutId || (typeof CardEditor !== 'undefined' ? CardEditor._cardLayout : 'usa'));

    // Position it on-screen at exact A4 dimensions
    cardEl.style.position = 'fixed';
    cardEl.style.left = '0';
    cardEl.style.top = '0';
    cardEl.style.width = '794px';
    cardEl.style.height = '1123px';
    cardEl.style.zIndex = '99999';
    cardEl.style.transform = 'none';
    document.body.appendChild(cardEl);

    const exportBtns = document.querySelectorAll('#card-btn-export-pdf, #btn-export-pdf');
    exportBtns.forEach(function(b) { b.disabled = true; b.textContent = 'Exporting…'; });

    try {
      // ── Pre-process ────────────────────────────────────────────

      // Fix: Replace <img object-fit:cover> with background-image div
      const photoImg = cardEl.querySelector('.card-photo');
      if (photoImg && photoImg.tagName === 'IMG') {
        const div = document.createElement('div');
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.backgroundImage = 'url(' + photoImg.src + ')';
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = photoImg.style.objectPosition || 'center center';
        div.style.display = 'block';
        photoImg.replaceWith(div);
      }

      // Fix: Replace external video thumbnails with generated fallbacks
      cardEl.querySelectorAll('.card-video-thumb').forEach(function(img) {
        img.style.display = 'none';
        var fallback = img.nextElementSibling;
        if (fallback && fallback.classList.contains('card-video-thumb-gen')) {
          fallback.style.display = 'flex';
        }
      });

      // Capture video link positions for clickable PDF annotations
      const videoLinks = PDF._getVideoLinks(cardEl);

      // Wait for layout + images
      await new Promise(function(r) { setTimeout(r, 400); });

      // ── Capture with dom-to-image-more ─────────────────────────

      const scale = 2;
      const dataUrl = await domtoimage.toPng(cardEl, {
        width: 794 * scale,
        height: 1123 * scale,
        style: {
          transform: 'scale(' + scale + ')',
          transformOrigin: 'top left',
        },
      });

      // Remove the card from DOM
      document.body.removeChild(cardEl);

      // ── Build PDF with jsPDF ──────────────────────────────────

      const pageWidth = 210;
      const pageHeight = 297;

      const pdf = new jspdf.jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      // Calculate image dimensions
      const img = new Image();
      await new Promise(function(resolve, reject) {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const imgWidth = pageWidth;
      const imgHeight = (img.height * pageWidth) / img.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));

      // Add clickable link annotations for video URLs
      videoLinks.forEach(function(link) {
        pdf.link(link.x, link.y, link.w, link.h, { url: link.url });
      });

      // Download
      const lastName  = (player.lastName  || 'Player').toUpperCase().replace(/\s+/g, '_');
      const firstName = (player.firstName || '').toUpperCase().replace(/\s+/g, '_');
      const filename  = lastName + '_' + firstName + '_ITP_Card.pdf';

      const blob = pdf.output('blob');
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 100);

    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed: ' + err.message);
      if (cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
    }

    exportBtns.forEach(function(b) { b.disabled = false; b.textContent = 'Export PDF'; });
  },

  /** Measure video item positions and convert to PDF mm coords */
  _getVideoLinks(cardEl) {
    const links = [];
    const cardRect = cardEl.getBoundingClientRect();
    const scaleX = 210 / 794;
    const scaleY = 297 / 1123;

    cardEl.querySelectorAll('.card-video-item[data-url]').forEach(function(item) {
      const url = item.dataset.url;
      if (!url) return;
      const rect = item.getBoundingClientRect();
      links.push({
        x: (rect.left - cardRect.left) * scaleX,
        y: (rect.top  - cardRect.top)  * scaleY,
        w: rect.width  * scaleX,
        h: rect.height * scaleY,
        url: url
      });
    });
    return links;
  },
};
