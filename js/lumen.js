/* ==========================================================================
   Lanka Wanderways — Lumen-style home page (index-lumen.html)
   Header, menu, tour filters and rail, review slider, FAQ and forms.
   No libraries. Everything works with the keyboard.
   ========================================================================== */

(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WHATSAPP_NOTE = 'This form is not connected yet. Please message us on WhatsApp at +94 72 987 9869 or email hello@lankawanderways.com.';

  /* ---- Header shadow once the page scrolls ---- */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Full-screen menu (phones and tablets) ---- */
  var menu = document.getElementById('ll-menu');
  var menuBtn = document.querySelector('[data-menu-open]');
  if (menu && menuBtn) {
    var closeBtn = menu.querySelector('[data-menu-close]');

    var focusables = function () {
      return Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled])'));
    };

    var openMenu = function () {
      menu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('ll-menu-open');
      (closeBtn || focusables()[0]).focus();
    };

    var closeMenu = function (returnFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('ll-menu-open');
      if (returnFocus) menuBtn.focus();
    };

    menuBtn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', function () { closeMenu(true); });

    // Following a link closes the menu and lets the browser jump to it.
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) closeMenu(false);
    });

    // Escape closes, Tab stays inside the menu while it is open.
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
      if (e.key !== 'Tab') return;
      var items = focusables();
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // The menu button disappears on wide screens, so the menu should too.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1180) closeMenu(false);
    });
  }

  /* ---- Tour rail: arrows and filters ---- */
  var rail = document.querySelector('[data-rail-track]');
  var prevBtn = document.querySelector('[data-rail="prev"]');
  var nextBtn = document.querySelector('[data-rail="next"]');

  var setArrow = function (btn, off) {
    if (!btn) return;
    btn.classList.toggle('is-off', off);
    btn.setAttribute('aria-disabled', off ? 'true' : 'false');
  };

  var syncRail = function () {
    if (!rail) return;
    setArrow(prevBtn, rail.scrollLeft <= 2);
    setArrow(nextBtn, rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2);
  };

  var moveRail = function (dir) {
    var card = rail.querySelector('.ll-tour:not([hidden])');
    var step = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: dir * step, behavior: reduced ? 'auto' : 'smooth' });
  };

  if (rail) {
    rail.addEventListener('scroll', syncRail, { passive: true });
    window.addEventListener('resize', syncRail);
    if (prevBtn) prevBtn.addEventListener('click', function () { if (prevBtn.getAttribute('aria-disabled') !== 'true') moveRail(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { if (nextBtn.getAttribute('aria-disabled') !== 'true') moveRail(1); });
    syncRail();
  }

  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var filterStatus = document.querySelector('[data-filter-status]');
  var tours = Array.prototype.slice.call(document.querySelectorAll('.ll-tour[data-tags]'));

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-filter');
      var shown = 0;

      filterBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      tours.forEach(function (card) {
        var show = key === 'all' || card.getAttribute('data-tags').split(' ').indexOf(key) !== -1;
        card.hidden = !show;
        if (show) shown++;
      });

      if (filterStatus) {
        filterStatus.textContent = key === 'all'
          ? 'Showing all ' + shown + ' tours.'
          : 'Showing ' + shown + (shown === 1 ? ' tour' : ' tours') + ' for ' + btn.textContent.trim() + '.';
      }

      if (rail) { rail.scrollLeft = 0; syncRail(); }
    });
  });

  /* ---- Enquire buttons pre-fill the package field ---- */
  var pkgSelect = document.getElementById('f-package');
  Array.prototype.forEach.call(document.querySelectorAll('[data-pkg]'), function (link) {
    link.addEventListener('click', function () {
      if (pkgSelect) pkgSelect.value = link.getAttribute('data-pkg');
    });
  });

  /* ---- Review slider ----
     Moves every 6 seconds, but only while it is on screen and nobody is
     reading or using it. Off by default for reduced motion. */
  var slider = document.querySelector('[data-slider]');
  if (slider) {
    var slides = Array.prototype.slice.call(slider.querySelectorAll('.ll-review'));
    var live = slider.querySelector('.ll-reviews');
    var num = slider.querySelector('[data-rv-num]');
    var toggle = slider.querySelector('[data-rv="toggle"]');
    var rv = { current: 0, stopped: reduced, hover: false, focus: false, off: true, timer: 0 };

    var running = function () {
      return !rv.stopped && !rv.hover && !rv.focus && !rv.off && !document.hidden;
    };

    var schedule = function () {
      clearTimeout(rv.timer);
      if (live) live.setAttribute('aria-live', running() ? 'off' : 'polite');
      if (running()) rv.timer = setTimeout(function () { go(1); }, 6000);
    };

    var go = function (dir) {
      var from = rv.current;
      rv.current = (from + dir + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        s.className = 'll-review'
          + (i === rv.current ? ' is-active' : i === from ? ' is-leaving' : '')
          + (dir < 0 ? ' is-back' : '');
      });
      if (num) num.textContent = String(rv.current + 1).padStart(2, '0');
      schedule();
    };

    var setToggle = function () {
      if (!toggle) return;
      toggle.classList.toggle('is-paused', rv.stopped);
      toggle.setAttribute('aria-label', rv.stopped ? 'Play reviews' : 'Pause reviews');
    };

    slider.querySelector('[data-rv="prev"]').addEventListener('click', function () { go(-1); });
    slider.querySelector('[data-rv="next"]').addEventListener('click', function () { go(1); });
    if (toggle) toggle.addEventListener('click', function () { rv.stopped = !rv.stopped; setToggle(); schedule(); });

    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(1); }
    });
    slider.addEventListener('mouseenter', function () { rv.hover = true; schedule(); });
    slider.addEventListener('mouseleave', function () { rv.hover = false; schedule(); });
    slider.addEventListener('focusin', function () { rv.focus = true; schedule(); });
    slider.addEventListener('focusout', function (e) {
      if (!slider.contains(e.relatedTarget)) { rv.focus = false; schedule(); }
    });
    document.addEventListener('visibilitychange', schedule);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        rv.off = !entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.35 }).observe(slider);
    } else {
      rv.off = false;
    }

    setToggle();
    schedule();
  }

  /* ---- FAQ accordions ---- */
  Array.prototype.forEach.call(document.querySelectorAll('.ll-acc__btn'), function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    var icon = btn.querySelector('.ll-plus');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (panel) panel.hidden = !open;
      if (icon) icon.classList.toggle('is-open', open);
    });
  });

  /* ---- Dates: no past dates, departure after arrival ---- */
  var arrival = document.getElementById('f-arrival');
  var departure = document.getElementById('f-departure');
  var now = new Date();
  var today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (arrival) arrival.min = today;
  if (departure) departure.min = today;
  if (arrival && departure) {
    arrival.addEventListener('change', function () {
      departure.min = arrival.value || today;
      if (departure.value && arrival.value && departure.value < arrival.value) departure.value = '';
    });
  }

  /* ---- Forms ----
     Check the required fields, then explain that the form is not live yet.
     Remove the "not connected" step once the Formspree ID is added. */
  var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };

  var setError = function (input, message) {
    var box = document.getElementById(input.id + '-err');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (!box) return;
    box.textContent = message || '';
    box.hidden = !message;
  };

  var setStatus = function (form, message, isError) {
    var box = form.querySelector('[data-status]');
    if (!box) return;
    box.textContent = message;
    box.classList.toggle('is-error', !!isError);
  };

  var checkEmail = function (input) {
    var v = input.value.trim();
    if (!v) return 'Please fill in this field.';
    if (!emailOk(v)) return 'Please enter a valid email address.';
    return '';
  };

  var tripForm = document.querySelector('[data-form="trip"]');
  if (tripForm) {
    tripForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = tripForm.elements.namedItem('name');
      var email = tripForm.elements.namedItem('email');
      var nameErr = name.value.trim() ? '' : 'Please fill in this field.';
      var emailErr = checkEmail(email);
      setError(name, nameErr);
      setError(email, emailErr);
      if (nameErr || emailErr) {
        setStatus(tripForm, 'Please check the highlighted fields.', true);
        (nameErr ? name : email).focus();
        return;
      }
      setStatus(tripForm, WHATSAPP_NOTE, true);
    });
  }

  var itinForm = document.querySelector('[data-form="itinerary"]');
  if (itinForm) {
    itinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = itinForm.elements.namedItem('email');
      var err = checkEmail(email);
      setError(email, err);
      if (err) {
        setStatus(itinForm, 'Please check the highlighted fields.', true);
        email.focus();
        return;
      }
      setStatus(itinForm, WHATSAPP_NOTE, true);
    });
  }

  /* ---- Footer year ---- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(now.getFullYear());
})();
