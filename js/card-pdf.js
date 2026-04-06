'use strict';

/* ═══════════════════════════════════════════════════════════════
   card-pdf.js — Export player card as PDF via browser print
   Opens the card in a new window and triggers window.print().
   The browser's native renderer handles all CSS perfectly.
   Video URLs are added as visible links below the card.
═══════════════════════════════════════════════════════════════ */

const PDF = {

  async export(player, layoutId) {
    // Build a fresh card at full A4 size
    const cardEl = buildCard(player, layoutId || 'usa');

    // Get the base URL for resolving relative paths
    const base = location.href.replace(/[^/]*$/, '');

    // Collect video URLs before moving the card
    const videoUrls = [];
    cardEl.querySelectorAll('.card-video-item[data-url]').forEach(item => {
      const url = item.dataset.url;
      if (url) videoUrls.push(url);
    });

    // Open a new window
    const printWin = window.open('', '_blank', 'width=850,height=1200');
    if (!printWin) {
      alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
      return;
    }

    // Write the document
    printWin.document.open();
    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${player.firstName || ''} ${player.lastName || ''} — ITP Card</title>
  <base href="${base}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/card.css">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .player-card {
      width: 794px;
      height: 1123px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @media print {
      .player-card {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  </style>
</head>
<body></body>
</html>`);
    printWin.document.close();

    // Append the card to the new window's body
    printWin.document.body.appendChild(cardEl);

    // Wait for fonts and images to load
    await new Promise(resolve => {
      printWin.onload = resolve;
      setTimeout(resolve, 1500);
    });
    await new Promise(r => setTimeout(r, 500));

    // Trigger print
    printWin.print();
  },
};
