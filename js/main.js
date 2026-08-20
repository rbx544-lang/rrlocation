/* =========================================================
   RR LOCATION — script principal
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- header au scroll ---------- */
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll);

  /* ---------- menu mobile ---------- */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  burger.addEventListener('click', () => {
    nav.classList.toggle('open');
    burger.classList.toggle('active');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.classList.remove('active');
  }));

  /* ---------- galerie véhicule ---------- */
  const galleryMain = document.getElementById('galleryMain');
  const thumbs = Array.from(document.querySelectorAll('.thumb'));
  let galleryIndex = 0;

  function showSlide(index) {
    galleryIndex = (index + thumbs.length) % thumbs.length;
    const btn = thumbs[galleryIndex];
    thumbs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    galleryMain.src = btn.dataset.src;
    galleryMain.alt = btn.querySelector('img').alt;
  }

  thumbs.forEach((btn, i) => btn.addEventListener('click', () => showSlide(i)));

  const prevBtn = document.querySelector('.gallery-prev');
  const nextBtn = document.querySelector('.gallery-next');
  if (prevBtn) prevBtn.addEventListener('click', () => showSlide(galleryIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showSlide(galleryIndex + 1));

  /* =========================================================
     CALENDRIER DE RÉSERVATION

     Les dates indisponibles sont lues depuis data/disponibilites.json.
     Pour les mettre à jour sans toucher au code, ouvrez admin.html,
     cliquez sur les jours à bloquer/débloquer, téléchargez le fichier
     généré et remplacez data/disponibilites.json sur le site.
     ========================================================= */
  let bookedDates = [];
  fetch('data/disponibilites.json')
    .then(r => r.ok ? r.json() : [])
    .then(dates => { bookedDates = Array.isArray(dates) ? dates : []; renderCalendar(); })
    .catch(() => { bookedDates = []; });

  const dayMs = 24 * 60 * 60 * 1000;
  const toKey = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const isBooked = (d) => bookedDates.includes(toKey(d));

  const today = new Date();
  today.setHours(0,0,0,0);

  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let startDate = null;
  let endDate = null;

  const monthLabelFmt = new Intl.DateTimeFormat('fr-FR', { month:'long', year:'numeric' });
  const dayLabelFmt = new Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short' });

  const calendarGrid = document.getElementById('calendarGrid');
  const calendarLabel = document.getElementById('calendarLabel');
  const startLabel = document.getElementById('startLabel');
  const endLabel = document.getElementById('endLabel');
  const nightsLabel = document.getElementById('nightsLabel');
  const totalLabel = document.getElementById('totalLabel');

  function priceFor(nights){
    // Au-delà d'un mois (30 jours), tarif dégressif à 35€/jour, sans plafond.
    if (nights > 30) return nights * 35;
    // Jusqu'à un mois inclus : forfait mensuel à 1050€ (équivalent 35€/jour sur 30 jours).
    if (nights >= 28) return 1050;
    if (nights >= 7) return nights * 50;
    return nights * 60;
  }

  function renderCalendar(){
    calendarGrid.innerHTML = '';
    calendarLabel.textContent = monthLabelFmt.format(new Date(viewYear, viewMonth, 1));

    const firstDay = new Date(viewYear, viewMonth, 1);
    // lundi = 0 ... dimanche = 6
    let startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++){
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calendarGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++){
      const date = new Date(viewYear, viewMonth, d);
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;

      const past = date < today;
      const booked = isBooked(date);

      if (date.getTime() === today.getTime()) cell.classList.add('today');
      if (past) cell.classList.add('disabled');
      if (booked) cell.classList.add('booked');

      if (startDate && date.getTime() === startDate.getTime()) cell.classList.add('selected');
      if (endDate && date.getTime() === endDate.getTime()) cell.classList.add('selected');
      if (startDate && endDate && date > startDate && date < endDate) cell.classList.add('in-range');

      if (!past && !booked){
        cell.addEventListener('click', () => handlePick(date));
      }

      calendarGrid.appendChild(cell);
    }
  }

  function rangeHasBookedDay(from, to){
    for (let t = from.getTime(); t <= to.getTime(); t += dayMs){
      if (isBooked(new Date(t))) return true;
    }
    return false;
  }

  function handlePick(date){
    if (!startDate || (startDate && endDate)){
      startDate = date;
      endDate = null;
    } else if (date.getTime() === startDate.getTime()){
      startDate = null;
    } else if (date < startDate){
      startDate = date;
      endDate = null;
    } else {
      if (rangeHasBookedDay(startDate, date)){
        alert("Une date indisponible se trouve dans cette période. Merci de choisir une autre plage.");
        return;
      }
      endDate = date;
    }
    updateSummary();
    renderCalendar();
  }

  function updateSummary(){
    startLabel.textContent = startDate ? dayLabelFmt.format(startDate) : '—';
    endLabel.textContent = endDate ? dayLabelFmt.format(endDate) : '—';

    if (startDate && endDate){
      const nights = Math.round((endDate - startDate) / dayMs);
      const total = priceFor(nights);
      nightsLabel.textContent = `${nights} jour${nights > 1 ? 's' : ''}`;
      totalLabel.textContent = `${total} €`;
    } else {
      nightsLabel.textContent = '0 jour';
      totalLabel.textContent = '0 €';
    }
  }

  document.getElementById('prevMonth').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0){ viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11){ viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  renderCalendar();
  updateSummary();

  /* ---------- envoi de la demande ---------- */
  const bookingForm = document.getElementById('bookingForm');
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!startDate || !endDate){
      alert("Merci de sélectionner une date de départ et une date de retour sur le calendrier.");
      return;
    }

    const name = bookingForm.name.value.trim();
    const phone = bookingForm.phone.value.trim();
    const nights = Math.round((endDate - startDate) / dayMs);
    const total = priceFor(nights);

    const message =
      `Bonjour, je souhaite réserver la Clio 5 du ${dayLabelFmt.format(startDate)} ` +
      `au ${dayLabelFmt.format(endDate)} (${nights} jours, ${total}€). ` +
      `Nom : ${name}. Téléphone : ${phone}.`;

    // Pas de serveur : la demande est transmise par SMS au propriétaire.
    window.location.href = `sms:0662481112?&body=${encodeURIComponent(message)}`;
  });

});
