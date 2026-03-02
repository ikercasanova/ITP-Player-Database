'use strict';

/* ═══════════════════════════════════════════════════════════════
   profile.js — Player detail page with benchmark visualizations
═══════════════════════════════════════════════════════════════ */

const Profile = {

  init() {},

  show(playerId) {
    const player = DB.get(playerId);
    if (!player) {
      location.hash = '#roster';
      return;
    }

    const container = document.getElementById('profile-content');
    container.innerHTML = Profile.render(player);

    // Expand/collapse attempts
    container.querySelectorAll('.bench-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.parentElement.querySelector('.bench-attempts');
        if (target) {
          target.classList.toggle('open');
          btn.textContent = target.classList.contains('open') ? 'Hide attempts' : 'Show attempts';
        }
      });
    });
  },

  render(player) {
    const age = App.computeAge(player.dateOfBirth);
    const heightFt = App.cmToFeetInches(player.heightCm);
    const weightLbs = App.kgToLbs(player.weightKg);

    // Photo header
    const photoCSS = player.photoBase64
      ? `<img class="profile-header-photo" src="${player.photoBase64}" alt="">`
      : '';

    // Position pills
    const positions = (player.positions || []).map((p, i) => {
      const code = typeof p === 'string' ? p : p.code;
      return `<span class="pos-badge ${i === 0 ? 'pos-badge-primary' : 'pos-badge-secondary'}">${code}</span>`;
    }).join(' ');

    // Quick info pills
    const pills = [];
    if (age) pills.push(`<span class="info-pill"><span class="info-pill-label">Age</span> ${age}</span>`);
    if (positions) pills.push(`<span class="info-pill"><span class="info-pill-label">Pos</span> ${positions}</span>`);
    if (player.foot) pills.push(`<span class="info-pill"><span class="info-pill-label">Foot</span> ${player.foot}</span>`);
    if (player.nationality) pills.push(`<span class="info-pill"><span class="info-pill-label">Nat</span> ${player.nationality}</span>`);

    // Body composition
    const bodyComp = [];
    if (player.heightCm) {
      bodyComp.push({ value: `${player.heightCm} cm`, sub: heightFt, label: 'Height' });
    }
    if (player.weightKg) {
      bodyComp.push({ value: `${player.weightKg} kg`, sub: weightLbs ? `${weightLbs} lbs` : '', label: 'Weight' });
    }
    if (player.bodyFatPct) {
      bodyComp.push({ value: `${player.bodyFatPct}%`, sub: '', label: 'Body Fat' });
    }
    if (player.bmi) {
      bodyComp.push({ value: player.bmi.toFixed(1), sub: '', label: 'BMI' });
    }
    if (player.muscleRatePct) {
      bodyComp.push({ value: `${player.muscleRatePct}%`, sub: '', label: 'Muscle Rate' });
    }

    const bodyCompHTML = bodyComp.length > 0
      ? `<div class="profile-section">
           <div class="profile-section-title">Body Composition</div>
           <div class="body-comp-grid">
             ${bodyComp.map(bc => `
               <div class="body-comp-item">
                 <div class="body-comp-value">${bc.value}</div>
                 ${bc.sub ? `<div class="body-comp-sub">${bc.sub}</div>` : ''}
                 <div class="body-comp-label">${bc.label}</div>
               </div>`).join('')}
           </div>
         </div>`
      : '';

    // Physical tests grouped by category
    const testsHTML = Profile.renderBenchmarks(player);

    // Videos
    const videos = [];
    if (player.highlightUrl) videos.push({ label: 'Highlight Reel', url: player.highlightUrl });
    if (player.fullGameUrl) videos.push({ label: 'Full Game', url: player.fullGameUrl });

    const videosHTML = videos.length > 0
      ? `<div class="profile-section">
           <div class="profile-section-title">Videos</div>
           ${videos.map(v => `
             <a href="${v.url}" target="_blank" rel="noopener" class="video-link">
               <div class="video-link-icon">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
               </div>
               <div>
                 <div class="video-link-label">${v.label}</div>
                 <div class="video-link-url">${v.url}</div>
               </div>
             </a>`).join('')}
         </div>`
      : '';

    return `
      <div class="profile-page">
        <div class="back-row">
          <button class="btn-back" onclick="location.hash='#roster'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Roster
          </button>
        </div>

        <div class="profile-header">
          ${photoCSS}
          <div class="profile-header-info">
            <div class="profile-name">${player.firstName}<br>${player.lastName}</div>
            ${player.ageGroup ? `<span class="profile-age-group">${player.ageGroup}</span>` : ''}
          </div>
        </div>

        <div class="profile-body">
          <div class="profile-section">
            <div class="quick-info">${pills.join('')}</div>
          </div>

          ${bodyCompHTML}

          ${testsHTML}

          ${videosHTML}
        </div>

        <div class="profile-actions">
          <button class="btn btn-outline" onclick="location.hash='#edit/${player.id}'">Edit Player</button>
          <button class="btn btn-danger" onclick="App.confirmDelete(DB.get('${player.id}'), () => { App.toast('Player deleted'); location.hash='#roster'; })">Delete</button>
        </div>
      </div>`;
  },

  renderBenchmarks(player) {
    if (!player.tests || !player.ageGroup) {
      return `<div class="profile-section">
                <div class="profile-section-title">Physical Tests</div>
                <div class="no-data">No test data recorded yet.</div>
              </div>`;
    }

    const categories = Benchmarks.getTestsByCategory();
    let hasAnyTests = false;
    let html = '';

    for (const [catName, testKeys] of Object.entries(categories)) {
      let catHTML = '';
      let catHasTests = false;

      for (const testKey of testKeys) {
        const testData = player.tests[testKey];
        if (!testData || testData.best === null || testData.best === undefined) continue;

        catHasTests = true;
        hasAnyTests = true;
        const def = TEST_DEFS[testKey];
        const { level, pct } = Benchmarks.evaluate(player.ageGroup, testKey, testData.best);

        // Attempts row
        const attempts = testData.attempts || [];
        const hasMultiple = attempts.filter(a => a !== null && a !== undefined).length > 1;
        const attemptsHTML = hasMultiple ? `
          <div class="bench-attempts">
            <div class="bench-attempts-row">
              ${attempts.map((a, i) => {
                if (a === null || a === undefined) return '';
                const isBest = Number(a) === testData.best;
                return `<span class="bench-attempt-val${isBest ? ' best' : ''}">Att ${i+1}: ${a} ${def.unit}</span>`;
              }).join('')}
            </div>
          </div>
          <button class="bench-expand-btn">Show attempts</button>` : '';

        catHTML += `
          <div class="bench-item">
            <div class="bench-row">
              <span class="bench-test-name">${def.name}</span>
              <div class="bench-value-wrap">
                <span class="bench-value">${testData.best}</span>
                <span class="bench-unit">${def.unit}</span>
                <span class="bench-level-label" data-level="${level}">${level === 'none' ? '—' : level}</span>
              </div>
            </div>
            <div class="bench-bar-track">
              <div class="bench-bar-fill" data-level="${level}" style="width:${pct}%"></div>
            </div>
            ${attemptsHTML}
          </div>`;
      }

      if (catHasTests) {
        html += `<div class="bench-category">
                   <div class="bench-category-title">${catName}</div>
                   ${catHTML}
                 </div>`;
      }
    }

    if (!hasAnyTests) {
      return `<div class="profile-section">
                <div class="profile-section-title">Physical Tests</div>
                <div class="no-data">No test data recorded yet.</div>
              </div>`;
    }

    return `<div class="profile-section">
              <div class="profile-section-title">Physical Tests</div>
              ${html}
            </div>`;
  }
};
