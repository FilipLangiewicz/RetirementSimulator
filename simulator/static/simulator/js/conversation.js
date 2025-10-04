(function () {
  const form = document.getElementById('conversationForm');
  if (!form) return;
  const steps = Array.from(form.querySelectorAll('.step'));
  const progressBar = document.getElementById('progressBar');
  let current = 0;

  // --- helpery errorów ---
  function hideErrors() {
    form.querySelectorAll('.invalid-feedback').forEach(el => el.classList.add('d-none'));
  }
  function showErr(name) {
    const el = form.querySelector(`[data-error="${name}"]`);
    if (el) el.classList.remove('d-none');
  }
  function hideErr(name) {
    const el = form.querySelector(`[data-error="${name}"]`);
    if (el) el.classList.add('d-none');
  }

  // --- CZYSTE sprawdzanie kroków (bez pokazywania błędów) ---
  function checkStep(i) {
    switch (i) {
      case 0: {
        const v = form.full_name.value.trim();
        return !!v;
      }
      case 1: {
        const y = (form.dob_year?.value || '').trim();
        const isFourDigits = /^\d{4}$/.test(y);
        const num = Number(y);
        const thisYear = new Date().getFullYear();
        return isFourDigits && num >= 1900 && num <= thisYear;
      }
      case 2: {
        const picked = form.querySelector('input[name="gender"]:checked');
        return !!picked;
      }
      default:
        return true;
    }
  }

  // --- pokazanie błędu dla danego kroku, gdy checkStep(i) = false ---
  function showStepError(i) {
    switch (i) {
      case 0: showErr('full_name'); break;
      case 1: showErr('dob'); break;
      case 2: showErr('gender'); break;
    }
  }

  const showStep = (idx) => {
    if (idx < 0 || idx >= steps.length || idx === current) return;
    const out = steps[current];
    const inside = steps[idx];
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
    const pct = Math.round((current / (steps.length - 1)) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
  };

  // --- NEXT / PREV: pokazuj błąd tylko po kliknięciu „Dalej” ---
  form.addEventListener('click', (e) => {
    if (e.target.closest('.next-btn')) {
      // schowaj wcześniejsze komunikaty zanim sprawdzisz
      hideErrors();
      if (checkStep(current)) {
        showStep(current + 1);
      } else {
        // pokaż błąd tylko dla bieżącego kroku
        showStepError(current);
      }
    }
    if (e.target.closest('.prev-btn')) {
      // przechodząc wstecz nic nie walidujemy i nic nie pokazujemy
      showStep(current - 1);
    }
  });

  // --- SUBMIT: waliduj wszystko, ale pokaż błąd tylko dla PIERWSZEGO błędnego kroku ---
  form.addEventListener('submit', (e) => {
    hideErrors();

    // sprawdź kroki 0..2
    const firstErrStep = [0, 1, 2].find(i => !checkStep(i));

    // sprawdź pole z emeryturą
    const pensionVal = Number(form.target_pension.value);
    const pensionOk = pensionVal > 0;

    if (firstErrStep !== undefined || !pensionOk) {
      e.preventDefault();
      if (firstErrStep !== undefined) {
        showStepError(firstErrStep);   // pokaż tylko ten jeden błąd
        showStep(firstErrStep);        // przenieś użytkownika do tego kroku
      } else {
        showErr('target_pension');
        showStep(3); // jeśli to masz jako krok 3 – dopasuj jeśli inny index
      }
    }
  });

  // --- (opcjonalnie) twarde ograniczenia wejścia dla roku ---
  const yearInput = form.dob_year;
  if (yearInput) {
    yearInput.setAttribute('inputmode', 'numeric');
    yearInput.setAttribute('pattern', '\\d{4}');
    yearInput.setAttribute('maxlength', '4');
    yearInput.addEventListener('beforeinput', (e) => {
      if (e.data && /\D/.test(e.data)) e.preventDefault();
    });
    yearInput.addEventListener('input', () => {
      const digits = yearInput.value.replace(/\D/g, '').slice(0, 4);
      if (yearInput.value !== digits) yearInput.value = digits;
      // nie pokazuj błędów tutaj – tylko koryguj wartość
    });
  }

  // --- Twoje dynamiczne pytanie wg płci (bez zmian w logice błędów) ---
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

  updateProgress();
})();
