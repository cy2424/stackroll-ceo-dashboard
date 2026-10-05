/* Observed source documents are inputs, not approved financial/cohort KPIs. */
(function () {
  'use strict';
  const names = ['accounts', 'rounds', 'deposits', 'withdrawals'];
  const dayMs = 86400000;
  const utcDay = value => new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z').toISOString().slice(0, 10);
  const count = value => Number.isSafeInteger(value) && value >= 0;

  function validate(data) {
    const end = utcDay(data.as_of_utc);
    if (!Array.isArray(data.daily) || !data.daily.length) throw new Error('No dated source observations');
    if (data.complete_source_history !== false || data.financial_reconciled !== false) throw new Error('Unexpected metric approval');
    const totals = Object.fromEntries(names.map(name => [name, 0]));
    const keys = new Set();
    data.daily.forEach(row => {
      const key = row.date + ':' + row.collection;
      if (!names.includes(row.collection) || !count(row.count) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
          new Date(row.date + 'T00:00:00Z').toISOString().slice(0, 10) !== row.date || row.date > end || keys.has(key)) {
        throw new Error('Invalid or duplicate daily observation');
      }
      keys.add(key); totals[row.collection] += row.count;
    });
    names.forEach(name => {
      if (!count(data.totals[name]) || !count(data.missing_dates[name]) ||
          totals[name] + data.missing_dates[name] !== data.totals[name]) throw new Error('Snapshot count mismatch');
    });
    ['deposits', 'withdrawals'].forEach(name => {
      const values = Object.values(data.payment_status_counts[name]);
      if (!values.every(count) || values.reduce((sum, value) => sum + value, 0) !== data.totals[name]) throw new Error('Status count mismatch');
    });
    return data;
  }

  function selectPeriod(data, window) {
    if (!['all', '1', '7', '30'].includes(window)) throw new Error('Unknown observation period');
    const end = utcDay(data.as_of_utc);
    const first = data.daily.map(row => row.date).sort()[0];
    const start = window === 'all' ? first : new Date(Date.parse(end + 'T00:00:00Z') - (Number(window) - 1) * dayMs).toISOString().slice(0, 10);
    const rows = data.daily.filter(row => row.date >= start && row.date <= end);
    const totals = Object.fromEntries(names.map(name => [name, rows.filter(row => row.collection === name).reduce((sum, row) => sum + row.count, 0)]));
    const dates = [];
    for (let time = Date.parse(start + 'T00:00:00Z'); time <= Date.parse(end + 'T00:00:00Z'); time += dayMs) dates.push(new Date(time).toISOString().slice(0, 10));
    return { start, end, totals, dates, rows };
  }

  const esc = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  function chart(period, title, series) {
    const lookup = new Map(period.rows.map(row => [row.date + ':' + row.collection, row.count]));
    const points = series.map(([name, label, color]) => ({ label, color, values: period.dates.map(day => lookup.get(day + ':' + name) || 0) }));
    const max = Math.max(1, ...points.flatMap(item => item.values));
    const step = 540 / Math.max(1, period.dates.length);
    const bars = points.map((item, seriesIndex) => item.values.map((value, i) => {
      const width = Math.max(.5, step / points.length - .5);
      const height = value / max * 38;
      return `<rect x="${44 + i * step + seriesIndex * step / points.length}" y="${58 - height}" width="${width}" height="${height}" fill="${item.color}"><title>${esc(period.dates[i] + ' · ' + item.label + ': ' + value)}</title></rect>`;
    }).join('')).join('');
    return `<div class="observation-chart"><div>${esc(title)} <small>count per UTC creation date</small></div><svg viewBox="0 0 600 80" role="img" aria-label="${esc(title + ', ' + period.start + ' to ' + period.end + '. Data table follows.')}" preserveAspectRatio="none"><title>${esc(title)}</title><line x1="44" y1="58" x2="586" y2="58" stroke="#253044"/><text x="2" y="23">${max.toLocaleString()}</text><text x="24" y="58">0</text>${bars}<text x="44" y="76">${esc(period.start)}</text><text x="586" y="76" text-anchor="end">${esc(period.end)}</text></svg>${points.length > 1 ? '<small>' + points.map(item => `<span style="color:${item.color}">${esc(item.label)}</span>`).join(' · ') + '</small>' : ''}</div>`;
  }

  function render(data, window) {
    const period = selectPeriod(data, window);
    const fmt = value => value.toLocaleString();
    const registration = document.querySelector('[data-kpi="registrations"]');
    registration.textContent = fmt(period.totals.accounts);
    registration.classList.remove('unavailable-value');
    registration.classList.add('observed-value');
    let qualifier = registration.parentElement.querySelector('.observation-status');
    if (!qualifier) { qualifier = document.createElement('small'); qualifier.className = 'observation-status'; registration.before(qualifier); }
    qualifier.textContent = 'Observed account creations';
    registration.parentElement.querySelector('.delta').textContent = 'Observed account creations · Completed-signup and exclusion rules remain pending.';
    registration.parentElement.querySelector('summary').textContent = 'Definition and limitations';
    registration.parentElement.querySelector('details p').textContent = 'Count of current complete, nondeleted account documents grouped by source creation date. This does not establish completed signup, demo/test exclusions or distinct people across brands. Those decisions remain pending.';
    document.querySelector('[data-kpi="active"]').parentElement.querySelector('.delta').textContent = fmt(period.totals.rounds) + ' observed round documents. Distinct qualifying real-money players remain unavailable.';
    ['deposits', 'withdrawals'].forEach(name => {
      const card = document.querySelector(`[data-kpi="${name}"]`).parentElement;
      card.querySelector('.delta').textContent = fmt(period.totals[name]) + ' observed transaction documents · The monetary KPI remains unavailable.';
      let status = card.querySelector('.observation-status');
      if (!status) { status = document.createElement('p'); status.className = 'observation-status'; card.querySelector('details').append(status); }
      status.textContent = 'Snapshot-wide source statuses (not date-filtered): ' + Object.entries(data.payment_status_counts[name]).map(([label, value]) => label + ' ' + fmt(value)).join('; ') + '. Source status alone does not prove wallet credit or actual payout.';
    });
    const revenue = [...document.querySelectorAll('.card.section')].find(card => card.querySelector('h3')?.textContent === 'Revenue Trend');
    revenue.querySelector('.section-head span').textContent = 'Available input trends · Counts, not monetary revenue';
    revenue.querySelector('.chart-wrap').innerHTML = chart(period, 'Account creations', [['accounts', 'Accounts', '#6b8cff']]) +
      chart(period, 'Recorded game rounds', [['rounds', 'Rounds', '#a97aff']]) +
      chart(period, 'Recorded payment documents', [['deposits', 'Deposits', '#2bd576'], ['withdrawals', 'Withdrawals', '#ffbd4a']]);
    let table = revenue.querySelector('.observation-table');
    if (!table) { table = document.createElement('details'); table.className = 'observation-table'; revenue.append(table); }
    const rows = new Map(period.rows.map(row => [row.date + ':' + row.collection, row.count]));
    table.innerHTML = '<summary>View input counts by date</summary><p>Current complete, nondeleted documents grouped by creation date. Missing date buckets mean no observed current documents, not proof of no upstream activity. The snapshot day is partial.</p><div class="observation-table-scroll"><table><thead><tr><th>UTC date</th><th>Accounts</th><th>Rounds</th><th>Deposits</th><th>Withdrawals</th></tr></thead><tbody>' + period.dates.map(day => '<tr><td>' + day + '</td>' + names.map(name => '<td>' + fmt(rows.get(day + ':' + name) || 0) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    const focus = document.querySelectorAll('.health-item');
    focus[0].closest('.card').querySelector('.section-head span').textContent = 'Observed inputs · Business health rules pending';
    const entries = [['Account inputs', period.totals.accounts, 'Created accounts; completion and exclusions pending.'], ['Wager inputs', period.totals.rounds, 'Round documents; not qualified active players or settled bets.'], ['Deposit inputs', period.totals.deposits, 'Transaction documents; not credited amounts or FTD.'], ['Withdrawal inputs', period.totals.withdrawals, 'Transaction documents; not confirmed paid amounts.']];
    entries.forEach(([label, value, reason], i) => { focus[i].innerHTML = `<strong><span class="dot amber"></span>${esc(label)}</strong><small><b>${fmt(value)} observed</b><br>${esc(reason)}</small>`; });
    focus[4].innerHTML = '<strong><span class="dot amber"></span>Retention</strong><small><b>Unavailable</b><br>Cohort, return and window rules remain pending.</small>';
    document.querySelector('.status-pill').textContent = '● Snapshot · ' + utcDay(data.as_of_utc) + ' UTC';
    document.querySelector('.side-note p').textContent = 'Observed inputs are dated source documents. Business KPIs retain their blockers. No live refresh is connected.';
    document.querySelector('footer').textContent = 'Observed source snapshot: ' + data.as_of_utc.replace('T', ' ') + ' UTC · Selected creation dates: ' + period.start + ' to ' + period.end + ' · ' + names.reduce((sum, name) => sum + data.missing_dates[name], 0) + ' undated documents excluded · Not Finance-reconciled · No live refresh';
    document.querySelector('#dateFilterReason').textContent = period.start + ' to ' + period.end + ' UTC creation dates. Snapshot day is partial; no business-day approval is implied.';
  }

  async function load() {
    try {
      const response = await fetch('./ceo-data.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Observation snapshot unavailable');
      const data = validate(await response.json());
      const filter = document.querySelector('#dateFilter');
      filter.innerHTML = '<option value="all">All Observed Dates</option><option value="1">Snapshot Day</option><option value="7">7 Days to Snapshot</option><option value="30">30 Days to Snapshot</option>';
      filter.disabled = false;
      filter.addEventListener('change', () => render(data, filter.value));
      render(data, filter.value);
    } catch (error) {
      document.querySelector('.status-pill').textContent = '● Observation snapshot unavailable';
      document.querySelector('#dateFilterReason').textContent = 'No validated observation snapshot is connected. Values remain unavailable.';
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { validate, selectPeriod, chart };
  if (typeof document !== 'undefined') load();
})();
