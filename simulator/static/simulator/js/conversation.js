(function () {
  const form = document.getElementById('conversationForm');
  if (!form) return;
  const steps = Array.from(form.querySelectorAll('.step'));
  const progressBar = document.getElementById('progressBar');
  let current = 0;
  const showStep = (idx, direction = 1) => {
    if (idx < 0 || idx >= steps.length || idx === current) return;
    const out = steps[current];
    const inside = steps[idx];
    // animacja wygaszania
    out.classList.remove('fade-in');
    out.classList.add('fade-out');
    out.addEventListener('animationend', function handler() {
      out.classList.remove('active', 'fade-out');
      inside.classList.add('active', 'fade-in');
      out.removeEventListener('animationend', handler);
    });
    current = idx;
    updateProgress();
  };
  const updateProgress = () => {
    const pct = Math.round(((current) / (steps.length - 1)) * 100);
    progressBar.style.width = pct + '%';
  };
  // obsługa przycisków
  form.addEventListener('click', (e) => {
    if (e.target.closest('.next-btn')) {
      if (validateStep(current)) showStep(current + 1, +1);
    }
    if (e.target.closest('.prev-btn')) {
      showStep(current - 1, -1);
    }
  });
  // walidacje per krok
  function validateStep(i) {
    hideErrors();
    switch (i) {
      case 0: {
        const v = form.full_name.value.trim();
        if (!v) return showErr('full_name');
        return true;
      }
      case 1: {
        const y = form.dob_year.value;
        const valid = /^\d{4}$/.test(y) && Number(y) >= 1900 && Number(y) <= new Date().getFullYear();
        if (!valid) return showErr('dob');
        return true;
      }
      case 2: {
        const picked = form.querySelector('input[name="gender"]:checked');
        if (!picked) return showErr('gender');
        return true;
      }
      default:
        return true;
    }
  }
  function hideErrors() {
    form.querySelectorAll('.invalid-feedback').forEach(el => el.classList.add('d-none'));
  }
  function showErr(name) {
    const el = form.querySelector(`[data-error="${name}"]`);
    if (el) el.classList.remove('d-none');
    return false;
  }
  // finalna walidacja przy submit
  form.addEventListener('submit', (e) => {
    hideErrors();
    let ok = true;
    [0,1,2].forEach(i => { if (ok) ok = validateStep(i); });
    const val = Number(form.target_pension.value);
    if (!(val > 0)) { showErr('target_pension'); ok = false; }
    if (!ok) {
      e.preventDefault();
      // skocz do pierwszego błędnego kroku
      const firstErrStep = [0,1,2,3].find(i => {
        if (i === 3) return !(val > 0);
        return !validateStep(i);
      });
      if (firstErrStep !== undefined) showStep(firstErrStep);
    }
  });
  updateProgress();
})();

// Dynamiczne dopasowanie pytania emerytalnego do płci
const genderInputs = form.querySelectorAll('input[name="gender"]');
const pensionQuestion = document.getElementById('pensionQuestion');

genderInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (pensionQuestion) {
      pensionQuestion.textContent =
        input.value === 'Kobieta'
          ? 'A teraz przejdźmy do konkretów. Jaką chciałabyś mieć emeryturę?'
          : 'A teraz przejdźmy do konkretów. Jaką chciałbyś mieć emeryturę?';
    }
  });
});