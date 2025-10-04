document.addEventListener('DOMContentLoaded', function () {
  var root = document.getElementById('expandableBoxes');
  if (!root) return;

  // zbierz pary (kafel + panel)
  var items = Array.from(root.querySelectorAll('.expandable-boxes__item, .block-item'));
  var pairs = items.map(function (item) {
    return {
      item: item,
      link: item.querySelector('a'),
      panel: item.querySelector('.expandable-boxes__item-content') || null
    };
  }).filter(function (p) { return p.link; });

  // 0) PORZĄDEK FLEX z poziomu JS (bez zmian w CSS):
  //    kafle zawsze order=1, panele order=2 i pełna szerokość
  pairs.forEach(function (p) {
    // link = kafel (1 slot siatki)
    p.link.style.order = '1';

    if (p.panel) {
      p.panel.style.order = '2';
      p.panel.style.flex = '0 0 100%';
      p.panel.style.maxWidth = '100%';
      p.panel.style.width = '100%';
      p.panel.style.left = '0';
      p.panel.style.right = '0';
      p.panel.style.transform = 'none';
      // domyślnie schowaj
      if (!p.link.classList.contains('active')) {
        p.panel.style.display = 'none';
      }
    }
  });

  // 1) odetnij ewentualne oryginalne nasłuchy (klonujemy <a>)
  pairs.forEach(function (p) {
    var clean = p.link.cloneNode(true);
    // zachowaj inline style (order itp.)
    clean.style.cssText = p.link.style.cssText;
    p.link.parentNode.replaceChild(clean, p.link);
    p.link = clean;
  });

  // 2) funkcja aktywacji
  function activate(targetLink) {
    pairs.forEach(function (p) {
      p.link.classList.remove('active');
      if (p.panel) p.panel.style.display = 'none';
    });

    var found = pairs.find(function (p) { return p.link === targetLink; });
    if (!found) return;

    if (!found.panel) {
      // zwykły link – nawiguj
      window.location.href = found.link.getAttribute('href');
      return;
    }

    found.link.classList.add('active');
    // pokaż panel na pełną szerokość, ale kafle (order=1) zostają u góry
    found.panel.style.display = 'block';
    found.panel.style.order = '2';
    // opcjonalnie przewiń:
    // found.panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 3) nasłuchiwacze
  pairs.forEach(function (p) {
    p.link.addEventListener('click', function (e) {
      var hasPanel = !!p.panel;
      if (hasPanel) e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      activate(p.link);
    });
  });

  // 4) stan początkowy: jeśli coś ma .active i panel, pokaż go; inaczej pierwszy z panelem
  var initial = pairs.find(function (p) { return p.link.classList.contains('active') && p.panel; })
             || pairs.find(function (p) { return p.panel; });
  if (initial) activate(initial.link);
});
