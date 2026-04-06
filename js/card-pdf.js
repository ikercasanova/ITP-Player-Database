/* ═══════════════════════════════════════════════════════════════
   card-pdf.js — Export player card as PDF via browser print
   Opens the card in a new window and triggers window.print().
   The browser's native renderer handles all CSS perfectly —
   no html2canvas bugs with letter-spacing or special characters.
═══════════════════════════════════════════════════════════════ */

const PDF = {

  async export(player, layoutId) {
    // Build a fresh card at full A4 size
    const cardData = typeof CardEditor !== 'undefined' ? CardEditor._mapPlayerToCard(player) : player;
    const cardEl = buildCard(cardData, layoutId || (typeof CardEditor !== 'undefined' ? CardEditor._cardLayout : 'usa'));

    // Get the base URL for resolving relative paths
    const base = location.href.replace(/[^/]*$/, '');

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
      width: 210mm;
      height: 297mm;
      background: #fff;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .player-card {
      width: 794px;
      height: 1123px;
      transform-origin: top left;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @media print {
      html, body {
        width: 210mm;
        height: 297mm;
      }
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
    await new Promise(function(resolve) {
      printWin.onload = resolve;
      // Fallback in case onload already fired
      setTimeout(resolve, 1500);
    });

    // Extra wait for fonts to render
    await new Promise(function(r) { setTimeout(r, 500); });

    // Trigger print
    printWin.print();
  },
};
