/* ==========================================================================
   Lanka Wanderways — site behaviour
   Vanilla JS, no dependencies. Each block is guarded so the page still
   works if a section is removed.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---- Header: solid background once the page scrolls ---- */
  var header = $('[data-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Mobile menu ---- */
  var toggle = $('[data-menu-toggle]');
  var nav = $('#site-nav');
  if (toggle && nav && header) {
    var label = $('.menu-toggle__label', toggle);
    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      header.classList.toggle('is-menu-open', open);
      document.body.classList.toggle('menu-open', open);
      if (label) label.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1240px)').addEventListener('change', function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---- Hero: slow crossfade between three photos ---- */
  var hero = $('[data-hero]');
  if (hero) {
    var slides = $$('.hero__slide', hero);
    var bars = $$('.hero__bar', hero);
    var caption = $('[data-hero-caption]', hero);
    var pauseBtn = $('[data-hero-pause]', hero);
    var slideMs = 7000;
    var current = 0;
    var timer = null;
    var paused = reduceMotion.matches;

    var show = function (i) {
      slides[current].classList.remove('is-active');
      bars[current] && bars[current].classList.remove('is-active');
      current = (i + slides.length) % slides.length;
      slides[current].classList.add('is-active');
      if (bars[current]) {
        void bars[current].offsetWidth; // restart the progress animation
        bars[current].classList.add('is-active');
      }
      if (caption) caption.textContent = slides[current].getAttribute('data-caption') || '';
    };
    var play = function () {
      clearInterval(timer);
      timer = setInterval(function () { show(current + 1); }, slideMs);
    };
    var setPaused = function (state) {
      paused = state;
      hero.classList.toggle('is-paused', paused);
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', String(paused));
        pauseBtn.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
      }
      if (paused) clearInterval(timer); else play();
    };

    // Load the later slides once the first one is on screen.
    slides.forEach(function (s) { var img = $('img', s); if (img) img.loading = 'eager'; });
    requestAnimationFrame(function () { hero.classList.add('is-ready'); });

    if (slides.length > 1) {
      setPaused(paused);
      if (pauseBtn) pauseBtn.addEventListener('click', function () { setPaused(!paused); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) clearInterval(timer); else if (!paused) play();
      });
    } else if (pauseBtn) {
      pauseBtn.hidden = true;
    }
  }

  /* ---- Tour filters ---- */
  var filterGroup = $('[data-filters]');
  var grid = $('[data-tour-grid]');
  if (filterGroup && grid) {
    var cards = $$('.tour-card', grid);
    var status = $('[data-filter-status]');
    filterGroup.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      var filter = btn.getAttribute('data-filter');
      $$('[data-filter]', filterGroup).forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      var shown = 0;
      cards.forEach(function (card) {
        var tags = (card.getAttribute('data-tags') || '').split(/\s+/);
        var match = filter === 'all' || tags.indexOf(filter) !== -1;
        card.hidden = !match;
        if (match) {
          shown++;
          card.classList.add('is-visible'); // never leave a filtered card mid-reveal
        }
      });
      grid.classList.remove('is-filtered');
      void grid.offsetWidth;
      grid.classList.add('is-filtered');
      if (status) {
        status.textContent = filter === 'all'
          ? 'Showing all ' + shown + ' tours.'
          : 'Showing ' + shown + (shown === 1 ? ' tour' : ' tours') + ' for ' + btn.textContent.trim() + '.';
      }
    });
  }

  /* ---- "Enquire" links: pre-select the package in the form ---- */
  var packageSelect = $('[data-package-select]');
  var plan = $('#plan');
  var selectPackage = function (slug) {
    if (!packageSelect || !slug) return false;
    var exists = $$('option', packageSelect).some(function (o) { return o.value === slug; });
    if (exists) packageSelect.value = slug;
    return exists;
  };
  if (packageSelect && plan) {
    $$('a[data-package]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var slug = link.getAttribute('data-package');
        if (!selectPackage(slug)) return;
        e.preventDefault();
        var url = new URL(window.location.href);
        url.searchParams.set('package', slug);
        url.hash = 'plan';
        history.replaceState(null, '', url);
        plan.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
        var first = $('#f-name');
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 700);
      });
    });
    selectPackage(new URLSearchParams(window.location.search).get('package'));
  }

  /* ---- Reviews slider ----
     Plays on its own, each review rising up into place. It pauses while the
     pointer or keyboard focus is inside, when it is off screen, and when the
     tab is hidden. The pause button stops it for good; reduced motion starts
     it paused. */
  var slider = $('[data-slider]');
  if (slider) {
    var reviews = $$('.review', slider);
    var counter = $('[data-slider-current]', slider);
    var viewport = $('.slider__viewport', slider);
    var toggleBtn = $('[data-slider-toggle]', slider);
    var active = 0;
    var DELAY = 6000;
    var timer = null;
    var stopped = reduceMotion.matches;
    var holds = { hover: false, focus: false, offscreen: false };

    reviews.forEach(function (r) { r.hidden = false; });

    var go = function (i, dir) {
      var from = reviews[active];
      var to = reviews[(i + reviews.length) % reviews.length];
      if (from === to) return;
      // Place the incoming review below (next) or above (previous) without animating.
      to.classList.add('is-instant');
      to.classList.toggle('is-past', dir < 0);
      void to.offsetWidth;
      to.classList.remove('is-instant');
      from.classList.remove('is-active');
      from.classList.toggle('is-past', dir > 0);
      to.classList.remove('is-past');
      to.classList.add('is-active');
      active = reviews.indexOf(to);
      if (counter) counter.textContent = String(active + 1).padStart(2, '0');
    };

    var running = function () {
      return !stopped && !holds.hover && !holds.focus && !holds.offscreen && !document.hidden;
    };
    var schedule = function () {
      clearTimeout(timer);
      timer = null;
      // Screen readers hear each change only when people move the slider themselves.
      if (viewport) viewport.setAttribute('aria-live', running() ? 'off' : 'polite');
      if (running()) timer = setTimeout(function () { go(active + 1, 1); schedule(); }, DELAY);
    };
    var hold = function (key, on) { holds[key] = on; schedule(); };

    var setStopped = function (value) {
      stopped = value;
      if (toggleBtn) {
        toggleBtn.classList.toggle('is-paused', stopped);
        toggleBtn.setAttribute('aria-label', stopped ? 'Play reviews' : 'Pause reviews');
      }
      schedule();
    };

    var prev = $('[data-slider-prev]', slider);
    var next = $('[data-slider-next]', slider);
    if (prev) prev.addEventListener('click', function () { go(active - 1, -1); schedule(); });
    if (next) next.addEventListener('click', function () { go(active + 1, 1); schedule(); });
    if (toggleBtn) {
      toggleBtn.hidden = false;
      toggleBtn.addEventListener('click', function () { setStopped(!stopped); });
    }
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(active - 1, -1); schedule(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(active + 1, 1); schedule(); }
    });
    slider.addEventListener('mouseenter', function () { hold('hover', true); });
    slider.addEventListener('mouseleave', function () { hold('hover', false); });
    slider.addEventListener('focusin', function () { hold('focus', true); });
    slider.addEventListener('focusout', function (e) {
      if (!slider.contains(e.relatedTarget)) hold('focus', false);
    });
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) {
      holds.offscreen = true;
      new IntersectionObserver(function (entries) {
        hold('offscreen', !entries[0].isIntersecting);
      }, { threshold: 0.35 }).observe(slider);
    }
    setStopped(stopped);
  }

  /* ---- FAQ accordion ---- */
  $$('[data-accordion]').forEach(function (accordion) {
    accordion.addEventListener('click', function (e) {
      var trigger = e.target.closest('.accordion__trigger');
      if (!trigger) return;
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      var open = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* ---- Tour page: highlight the day in view ---- */
  var daysNav = $('[data-days-nav]');
  if (daysNav && 'IntersectionObserver' in window) {
    var dayLinks = $$('.days-nav__link', daysNav);
    var setDay = function (id) {
      dayLinks.forEach(function (link) {
        var on = link.getAttribute('href') === '#' + id;
        if (on) {
          link.setAttribute('aria-current', 'true');
          // On the sideways strip, keep the active day in view.
          if (daysNav.scrollWidth > daysNav.clientWidth) {
            daysNav.scrollTo({
              left: link.offsetLeft - (daysNav.clientWidth - link.offsetWidth) / 2,
              behavior: reduceMotion.matches ? 'auto' : 'smooth'
            });
          }
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };
    var dayObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setDay(entry.target.id);
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('.day[id]').forEach(function (day) { dayObserver.observe(day); });
  }

  /* ---- Tour page: hotel carousel buttons ---- */
  var track = $('[data-carousel-track]');
  if (track) {
    var carouselPrev = $('[data-carousel-prev]');
    var carouselNext = $('[data-carousel-next]');
    var step = function () {
      var card = track.firstElementChild;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    };
    var updateButtons = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (carouselPrev) carouselPrev.setAttribute('aria-disabled', String(track.scrollLeft <= 2));
      if (carouselNext) carouselNext.setAttribute('aria-disabled', String(track.scrollLeft >= max));
    };
    var move = function (dir) {
      track.scrollBy({ left: dir * step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    };
    if (carouselPrev) carouselPrev.addEventListener('click', function () { move(-1); });
    if (carouselNext) carouselNext.addEventListener('click', function () { move(1); });
    track.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    updateButtons();
  }

  /* ---- Slow reveal on scroll ---- */
  var revealItems = $$('.reveal, .interlude');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    revealItems.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    // Once an item is in, drop its stagger so later hover effects start at once.
    var clearStagger = function (e) {
      if (e.target !== e.currentTarget || e.propertyName !== 'opacity') return;
      e.currentTarget.style.removeProperty('--reveal-i');
      e.currentTarget.removeEventListener('transitionend', clearStagger);
    };
    var observer = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--reveal-i', String(batch++));
        entry.target.addEventListener('transitionend', clearStagger);
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealItems.forEach(function (el) { observer.observe(el); });
  }

  /* ---- Photos fade in once they have loaded and come into view ---- */
  // Full-bleed backgrounds (heroes, interlude, review and CTA backdrops)
  // already have their own motion, so they are left alone.
  var photos = $$('main img').filter(function (img) {
    return !img.closest('.hero, .tour-hero, .interlude, .reviews__bg, .cta-band');
  });
  if ('IntersectionObserver' in window && !reduceMotion.matches && photos.length) {
    var showPhoto = function (img) {
      var done = function () { img.classList.add('is-loaded'); };
      if (img.complete) {
        requestAnimationFrame(done);
      } else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    };
    var photoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        photoObserver.unobserve(entry.target);
        showPhoto(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    photos.forEach(function (img) {
      img.classList.add('img-reveal');
      // Settle from a slight zoom only where the frame crops the photo.
      if (getComputedStyle(img.parentElement).overflow !== 'visible') img.classList.add('img-reveal--zoom');
      photoObserver.observe(img);
    });
  }

  /* ---- Numbers count up when they come into view ----
     data-count marks the element; its value is where the count starts,
     as a share of the final number (empty = from 0). Screen readers get
     the final number straight away. */
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion.matches && counters.length) {
    var format = function (n, commas) {
      var s = String(Math.round(n));
      return commas ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s;
    };
    var countUp = function (el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var node, match;
      while ((node = walker.nextNode()) && !(match = node.nodeValue.match(/\d[\d,]*/))) { /* find the first number */ }
      if (!node) return;
      var text = match[0];
      var target = parseInt(text.replace(/,/g, ''), 10);
      var from = target * (parseFloat(el.getAttribute('data-count')) || 0);
      var commas = text.indexOf(',') !== -1;

      var count = document.createElement('span');
      count.className = 'count';
      count.setAttribute('aria-hidden', 'true');
      count.textContent = text;
      var real = document.createElement('span');
      real.className = 'visually-hidden';
      real.textContent = text;
      var rest = node.splitText(match.index);
      rest.nodeValue = rest.nodeValue.slice(text.length);
      node.parentNode.insertBefore(count, rest);
      node.parentNode.insertBefore(real, rest);

      // Hold the final width so nothing beside the number shifts.
      count.style.minWidth = count.getBoundingClientRect().width + 'px';
      count.textContent = format(from, commas);
      var start = null;
      var step = function (now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / 1800, 1);
        count.textContent = format(from + (target - from) * (1 - Math.pow(1 - t, 4)), commas);
        if (t < 1) {
          requestAnimationFrame(step);
          return;
        }
        // Done: put the plain text back.
        var parent = count.parentNode;
        parent.replaceChild(document.createTextNode(text), count);
        parent.removeChild(real);
        parent.normalize();
      };
      // A short pause lets the number fade in with its section first.
      setTimeout(function () { requestAnimationFrame(step); }, 250);
    };
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ---- Dates: no past dates, departure after arrival ---- */
  var arrival = $('[data-arrival]');
  var departure = $('[data-departure]');
  if (arrival && departure) {
    var now = new Date();
    var today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    arrival.min = today;
    departure.min = today;
    arrival.addEventListener('change', function () {
      departure.min = arrival.value || today;
      if (departure.value && arrival.value && departure.value < arrival.value) departure.value = '';
    });
  }

  /* ---- Forms (Formspree) ---- */
  var showError = function (input, message) {
    var field = input.closest('.field') || input.parentElement;
    var err = field.querySelector('.field__error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field__error';
      err.id = input.id + '-error';
      field.appendChild(err);
    }
    err.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
  };
  var clearError = function (input) {
    var field = input.closest('.field') || input.parentElement;
    var err = field.querySelector('.field__error');
    if (err) err.remove();
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  };
  var validate = function (form) {
    var firstBad = null;
    $$('[required]', form).forEach(function (input) {
      clearError(input);
      var value = input.value.trim();
      var message = '';
      if (!value) message = 'Please fill in this field.';
      else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Please enter a valid email address.';
      if (message) {
        showError(input, message);
        firstBad = firstBad || input;
      }
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  };

  /* ---- Trip form: there is no form service yet, so the details go out as
     a ready-to-send WhatsApp message, with an email link as a backup ---- */
  var WHATSAPP_URL = 'https://wa.me/94729879869';
  var EMAIL = 'hello@lankawanderways.com';

  var labelFor = function (input, form) {
    var label = input.id && $('label[for="' + input.id + '"]', form);
    if (!label) return input.name;
    var copy = label.cloneNode(true);
    $$('.field__req, .field__opt', copy).forEach(function (el) { el.remove(); });
    return copy.textContent.trim();
  };

  var valueOf = function (input) {
    var value = input.value.trim();
    if (!value) return '';
    if (input.tagName === 'SELECT') return input.options[input.selectedIndex].text.trim();
    if (input.type === 'date') {
      var date = new Date(value + 'T00:00:00');
      if (!isNaN(date)) return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return value;
  };

  var buildMessage = function (form) {
    var lines = ['Hi Lanka Wanderways! I would like a free itinerary.', ''];
    $$('input:not([type="hidden"]), select, textarea', form).forEach(function (input) {
      var value = valueOf(input);
      if (value) lines.push(labelFor(input, form) + ': ' + value);
    });
    return lines.join('\n');
  };

  var makeLink = function (href, text, newTab) {
    var link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    if (newTab) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    return link;
  };

  $$('[data-trip-form]').forEach(function (form) {
    var statusEl = $('[data-form-status]', form);
    var setStatus = function (parts, kind) {
      if (!statusEl) return;
      statusEl.textContent = '';
      parts.forEach(function (part) { statusEl.append(part); });
      statusEl.classList.toggle('is-success', kind === 'success');
      statusEl.classList.toggle('is-error', kind === 'error');
    };
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') clearError(e.target);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) {
        setStatus(['Please check the highlighted fields.'], 'error');
        return;
      }
      var message = buildMessage(form);
      var whatsappHref = WHATSAPP_URL + '?text=' + encodeURIComponent(message);
      var mailHref = 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent(form.getAttribute('data-subject') || 'Trip enquiry') +
        '&body=' + encodeURIComponent(message);
      window.open(whatsappHref, '_blank', 'noopener');
      setStatus([
        'Thank you. WhatsApp should open with your details, ready to send. Didn\u2019t open? ',
        makeLink(whatsappHref, 'Open WhatsApp', true),
        ' or ',
        makeLink(mailHref, 'email us instead'),
        '.'
      ], 'success');
    });
  });

  /* ---- Footer year ---- */
  var year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
