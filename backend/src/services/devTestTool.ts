export function renderDevTestToolHtml(): string {
  return `<!doctype html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BoligSwipe test-verktøy</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 24px; max-width: 920px; }
    h1, h2 { margin: 0 0 12px; }
    .card { border: 1px solid #80808055; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    input, button, textarea { padding: 10px; border-radius: 8px; border: 1px solid #80808077; }
    input { min-width: 180px; }
    button { cursor: pointer; }
    pre { padding: 12px; border-radius: 8px; background: #00000011; overflow: auto; }
    .small { font-size: 0.9rem; opacity: 0.8; }
  </style>
</head>
<body>
  <h1>BoligSwipe utvikler-test</h1>
  <p class="small">Kjør backend og worker, og bruk dette verktøyet til å teste flyt i nettleser før iOS-app.</p>

  <section class="card">
    <h2>1) Opprett testdata</h2>
    <div class="row">
      <button id="seed-btn">Opprett 2 brukere + household</button>
      <button id="ingest-btn">Kjør bolig-innhenting</button>
      <button id="prefs-btn">Sett standard preferanser</button>
    </div>
    <pre id="seed-output">Ikke kjørt enda.</pre>
  </section>

  <section class="card">
    <h2>2) Hent og swipe boliger</h2>
    <div class="row">
      <button id="load-a-btn">Hent listing for bruker A</button>
      <button id="load-b-btn">Hent listing for bruker B</button>
      <button id="like-a-btn">LIKE som bruker A</button>
      <button id="like-b-btn">LIKE som bruker B</button>
      <button id="dislike-a-btn">DISLIKE som bruker A</button>
      <button id="dislike-b-btn">DISLIKE som bruker B</button>
    </div>
    <pre id="listing-output">Ingen listings lastet.</pre>
  </section>

  <section class="card">
    <h2>3) Match/varslinger</h2>
    <div class="row">
      <button id="matches-btn">Hent matches</button>
      <button id="notifications-a-btn">Varsler bruker A</button>
      <button id="notifications-b-btn">Varsler bruker B</button>
    </div>
    <pre id="meta-output">Ingen metadata enda.</pre>
  </section>

  <script>
    const state = {
      userAId: null,
      userBId: null,
      householdId: null,
      listingsA: [],
      listingsB: []
    };

    async function api(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
      const hasBody = options.body !== undefined;
      if (hasBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
        
      const response = await fetch(path, {
        ...options,
        headers
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(body.error || ('HTTP ' + response.status));
      }
      return body;
    }

    function print(id, data) {
      document.getElementById(id).textContent = JSON.stringify(data, null, 2);
    }

    async function ensureSeed() {
      if (!state.userAId || !state.userBId || !state.householdId) {
        throw new Error('Kjør "Opprett 2 brukere + household" først.');
      }
    }

    async function seed() {
      const userA = await api('/users', { method: 'POST', body: JSON.stringify({ name: 'Test A', email: 'testa+' + Date.now() + '@local.dev' }) });
      const userB = await api('/users', { method: 'POST', body: JSON.stringify({ name: 'Test B', email: 'testb+' + Date.now() + '@local.dev' }) });
      const household = await api('/households', { method: 'POST', body: JSON.stringify({ name: 'Test Household', userAId: userA.id, userBId: userB.id }) });
      state.userAId = userA.id;
      state.userBId = userB.id;
      state.householdId = household.id;
      print('seed-output', { userA, userB, household });
    }

    async function setPreferences() {
      await ensureSeed();
      const pref = {
        minPrice: 2000000,
        maxPrice: 7000000,
        areas: ['Time', 'Klepp', 'Hå'],
        minBuildYear: 1980,
        maxBikeMinutes: 35,
        maxTransitMin: 50,
        freeText: 'enebolig, rekkehus'
      };
      const a = await api('/users/' + state.userAId + '/preferences', { method: 'PUT', body: JSON.stringify(pref) });
      const b = await api('/users/' + state.userBId + '/preferences', { method: 'PUT', body: JSON.stringify(pref) });
      print('seed-output', { userAPreference: a, userBPreference: b });
    }

    async function loadListings(which) {
      await ensureSeed();
      const userId = which === 'A' ? state.userAId : state.userBId;
      const listings = await api('/listings?userId=' + encodeURIComponent(userId));
      if (which === 'A') state.listingsA = listings;
      if (which === 'B') state.listingsB = listings;
      print('listing-output', { forUser: which, count: listings.length, top3: listings.slice(0, 3) });
    }

    async function swipe(which, decision) {
      await ensureSeed();
      const userId = which === 'A' ? state.userAId : state.userBId;
      const list = which === 'A' ? state.listingsA : state.listingsB;
      if (!list.length) {
        throw new Error('Ingen listing lastet for bruker ' + which + '.');
      }
      const listing = list.shift();
      const payload = {
        userId,
        householdId: state.householdId,
        listingId: listing.id,
        decision
      };
      const response = await api('/swipes', { method: 'POST', body: JSON.stringify(payload) });
      print('listing-output', { swipedBy: which, decision, listing, response });
    }

    async function runWithOutput(target, fn) {
      try {
        const result = await fn();
        if (result !== undefined) print(target, result);
      } catch (error) {
        print(target, { error: error.message });
      }
    }

    document.getElementById('seed-btn').onclick = () => runWithOutput('seed-output', seed);
    document.getElementById('ingest-btn').onclick = () => runWithOutput('seed-output', () => api('/ingestion/run', { method: 'POST' }));
    document.getElementById('prefs-btn').onclick = () => runWithOutput('seed-output', setPreferences);
    document.getElementById('load-a-btn').onclick = () => runWithOutput('listing-output', () => loadListings('A'));
    document.getElementById('load-b-btn').onclick = () => runWithOutput('listing-output', () => loadListings('B'));
    document.getElementById('like-a-btn').onclick = () => runWithOutput('listing-output', () => swipe('A', 'LIKE'));
    document.getElementById('like-b-btn').onclick = () => runWithOutput('listing-output', () => swipe('B', 'LIKE'));
    document.getElementById('dislike-a-btn').onclick = () => runWithOutput('listing-output', () => swipe('A', 'DISLIKE'));
    document.getElementById('dislike-b-btn').onclick = () => runWithOutput('listing-output', () => swipe('B', 'DISLIKE'));
    document.getElementById('matches-btn').onclick = () =>
      runWithOutput('meta-output', async () => {
        await ensureSeed();
        return api('/matches/' + state.householdId);
      });
    document.getElementById('notifications-a-btn').onclick = () =>
      runWithOutput('meta-output', async () => {
        await ensureSeed();
        return api('/notifications/' + state.userAId);
      });
    document.getElementById('notifications-b-btn').onclick = () =>
      runWithOutput('meta-output', async () => {
        await ensureSeed();
        return api('/notifications/' + state.userBId);
      });
  </script>
</body>
</html>`;
}
