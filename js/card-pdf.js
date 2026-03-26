'use strict';

/* ═══════════════════════════════════════════════════════════════
   pdf.js — html2pdf.js wrapper for A4 PDF export
   Pre-processes card for html2canvas compatibility:
   - Replaces <img object-fit:cover> with background-image div
   - Converts SVGs to canvas for reliable viewBox rendering
   - Adds clickable link annotations for video URLs
═══════════════════════════════════════════════════════════════ */

const PDF = {

  async export(player, layoutId) {
    if (typeof html2pdf === 'undefined') {
      alert('PDF library not loaded. Please check your internet connection and refresh.');
      return;
    }

    // Build a fresh card element at full A4 size
    const cardEl = buildCard(player, layoutId);

    // Render off-screen for html2canvas (must be in DOM but not visible)
    cardEl.style.transform = 'none';
    cardEl.style.position = 'fixed';
    cardEl.style.left   = '0';
    cardEl.style.top    = '0';
    cardEl.style.zIndex = '99999';
    cardEl.style.width  = '794px';
    cardEl.style.height = '1123px';
    cardEl.style.pointerEvents = 'none';
    document.body.appendChild(cardEl);

    // ── Pre-process for html2canvas compatibility ──────────────

    // Fix 1: Replace <img object-fit:cover> with background-image div
    // html2canvas doesn't handle object-fit correctly → stretches the photo
    const photoImg = cardEl.querySelector('.card-photo');
    if (photoImg && photoImg.tagName === 'IMG') {
      const div = document.createElement('div');
      div.style.width  = '100%';
      div.style.height = '100%';
      div.style.backgroundImage    = `url(${photoImg.src})`;
      div.style.backgroundSize     = 'cover';
      div.style.backgroundPosition = photoImg.style.objectPosition || 'center center';
      div.style.display = 'block';
      photoImg.replaceWith(div);
    }

    // Fix 2: Pre-render pitch SVG to canvas
    // html2canvas misrenders SVG viewBox → zooms into one corner
    const pitchSvg = cardEl.querySelector('.card-pitch-wrap svg');
    if (pitchSvg) {
      await PDF._svgToCanvas(pitchSvg);
    }

    // Fix 3: Replace external video thumbnails with generated fallbacks
    // html2canvas can't load cross-origin images when opened via file://
    cardEl.querySelectorAll('.card-video-thumb').forEach(img => {
      img.style.display = 'none';
      const fallback = img.nextElementSibling;
      if (fallback && fallback.classList.contains('card-video-thumb-gen')) {
        fallback.style.display = 'flex';
      }
    });

    // Capture video link positions (before html2pdf wraps the DOM)
    const videoLinks = PDF._getVideoLinks(cardEl);

    const lastName  = (player.lastName  || 'Player').toUpperCase().replace(/\s+/g, '_');
    const firstName = (player.firstName || '').toUpperCase().replace(/\s+/g, '_');
    const filename  = `${lastName}_${firstName}_ITP_Card.pdf`;

    const opt = {
      margin:   0,
      filename,
      image:    { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale:      2,
        useCORS:    true,
        allowTaint: true,
        logging:    false,
        width:      794,
        height:     1123
      },
      jsPDF: {
        unit:        'mm',
        format:      [210, 297.1],
        orientation: 'portrait'
      }
    };

    // Show loading state
    const exportBtns = document.querySelectorAll('#btn-export-pdf, #btn-preview-export');
    exportBtns.forEach(b => { b.disabled = true; b.textContent = 'Exporting…'; });

    html2pdf()
      .set(opt)
      .from(cardEl)
      .toPdf()
      .get('pdf')
      .then(function(pdf) {
        // Fix 3: Add clickable link annotations for video URLs
        videoLinks.forEach(link => {
          pdf.link(link.x, link.y, link.w, link.h, { url: link.url });
        });
        // Manual blob download — reliable filename across all browsers
        const blob = pdf.output('blob');
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      })
      .then(() => {
        document.body.removeChild(cardEl);
        exportBtns.forEach(b => { b.disabled = false; b.textContent = 'Export PDF'; });
      })
      .catch(err => {
        console.error('PDF export failed:', err);
        if (document.body.contains(cardEl)) document.body.removeChild(cardEl);
        exportBtns.forEach(b => { b.disabled = false; b.textContent = 'Export PDF'; });
        alert('PDF export failed. Try in Chrome for best results.');
      });
  },

  /** Measure video item positions in the card and convert to PDF mm coords */
  _getVideoLinks(cardEl) {
    const links = [];
    const cardRect = cardEl.getBoundingClientRect();
    const scaleX = 210 / 794;
    const scaleY = 297.1 / 1123;

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

  /** Convert an inline SVG to a canvas for reliable html2canvas rendering */
  _svgToCanvas(svg) {
    return new Promise(resolve => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) { resolve(); return; }

      const dpr = 2;
      const canvas  = document.createElement('canvas');
      canvas.width  = Math.round(rect.width  * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width     = rect.width  + 'px';
      canvas.style.height    = rect.height + 'px';
      canvas.style.maxWidth  = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.display   = 'block';

      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        svg.replaceWith(canvas);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(); // Keep original SVG if conversion fails
      };
      img.src = url;
    });
  }

};
