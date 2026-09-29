/* =========================================================
   RR LOCATION — gestion des disponibilités (Firebase Firestore)

   Remplace l'ancien data/disponibilites.json par un document
   Firestore partagé, lu par le site public et modifié depuis
   admin.html. Persistant, temps réel, sans fichier à remplacer
   à la main.
   ========================================================= */
(function () {
  if (typeof firebase === 'undefined') {
    console.error('RR Location : SDK Firebase non chargé.');
    window.RRAvailability = null;
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  const auth = firebase.auth();
  const DOC_REF = db.collection('rrlocation').doc('disponibilites');

  let cache = [];
  const listeners = [];

  function notify() {
    listeners.forEach((fn) => fn(cache.slice()));
  }

  DOC_REF.onSnapshot(
    (snap) => {
      const data = snap.exists ? snap.data() : {};
      cache = Array.isArray(data.blockedDates) ? data.blockedDates : [];
      notify();
    },
    (err) => {
      console.error('RR Location : lecture des disponibilités impossible.', err);
    }
  );

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  }

  async function setBlocked(dates) {
    const clean = Array.from(new Set(dates)).sort();
    await DOC_REF.set(
      { blockedDates: clean, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  async function blockDates(newDates) {
    const merged = new Set(cache);
    newDates.forEach((d) => merged.add(d));
    await setBlocked(Array.from(merged));
  }

  async function unblockDates(rmDates) {
    const set = new Set(cache);
    rmDates.forEach((d) => set.delete(d));
    await setBlocked(Array.from(set));
  }

  async function toggleDate(dateStr) {
    const set = new Set(cache);
    if (set.has(dateStr)) set.delete(dateStr);
    else set.add(dateStr);
    await setBlocked(Array.from(set));
  }

  function toKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function rangeKeys(start, end) {
    const out = [];
    const dayMs = 24 * 60 * 60 * 1000;
    for (let t = start.getTime(); t <= end.getTime(); t += dayMs) out.push(toKey(new Date(t)));
    return out;
  }

  window.RRAvailability = {
    subscribe,
    blockDates,
    unblockDates,
    toggleDate,
    setBlocked,
    toKey,
    rangeKeys,
    getCache: () => cache.slice(),
    auth,
    signIn: (email, pass) => auth.signInWithEmailAndPassword(email, pass),
    signOut: () => auth.signOut(),
    onAuthChange: (fn) => auth.onAuthStateChanged(fn),
  };
})();
