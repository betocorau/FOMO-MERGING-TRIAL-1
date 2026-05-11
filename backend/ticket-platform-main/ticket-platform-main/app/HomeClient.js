'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './home.css';

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${weekday} ${month} ${day}, ${year} · ${time}`;
  } catch { return ''; }
}

function formatMinPrice(event) {
  if (event.min_price === undefined || event.min_price === null) return 'View tickets';
  if (event.min_price === 0) return 'Free';
  if (event.currency === 'CRC') return `From ₡${Math.round(event.min_price).toLocaleString('es-CR')}`;
  return `From $${Number(event.min_price).toFixed(2)}`;
}

export default function HomeClient() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [modalEvent, setModalEvent] = useState(null);

  useEffect(() => {
    async function fetchEvents() {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error || !eventsData) { console.error('Events fetch error:', error); return; }

      const eventIds = eventsData.map((e) => e.id);
      if (eventIds.length === 0) { setEvents([]); return; }

      const { data: tiers } = await supabase
        .from('ticket_tiers')
        .select('event_id, price, early_bird_price, early_bird_deadline, early_bird_quantity, early_bird_sold')
        .in('event_id', eventIds);

      const minByEvent = {};
      (tiers || []).forEach((tier) => {
        const now = new Date();
        const isEarlyBird =
          tier.early_bird_price &&
          (!tier.early_bird_deadline || new Date(tier.early_bird_deadline) > now) &&
          (!tier.early_bird_quantity || (tier.early_bird_sold ?? 0) < tier.early_bird_quantity);
        const price = parseFloat(isEarlyBird ? tier.early_bird_price : tier.price) || 0;
        if (minByEvent[tier.event_id] === undefined || price < minByEvent[tier.event_id]) {
          minByEvent[tier.event_id] = price;
        }
      });

      setEvents(eventsData.map((e) => ({
        ...e,
        min_price: minByEvent[e.id] !== undefined ? minByEvent[e.id] : (parseFloat(e.price) ?? undefined),
      })));
    }
    fetchEvents();
  }, []);

  function openEventModal(ev) {
    setModalEvent(ev);
    document.body.style.overflow = 'hidden';
  }

  function closeEventModal() {
    setModalEvent(null);
    document.body.style.overflow = '';
  }

  // Body overrides for home page
  useEffect(() => {
    document.body.style.color = '#000000';
    document.body.style.display = 'block';
    document.body.style.minHeight = 'unset';
    document.body.style.overscrollBehaviorY = 'none';
    if (window.innerWidth >= 769) {
      document.body.style.paddingLeft = '45px';
    }
    return () => {
      document.body.style.color = '';
      document.body.style.display = '';
      document.body.style.minHeight = '';
      document.body.style.overscrollBehaviorY = '';
      document.body.style.paddingLeft = '';
      document.body.style.overflow = '';
    };
  }, []);

  // Escape key for modal
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') closeEventModal(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // All vanilla JS from index.html
  useEffect(() => {
    /* ── Language toggle ─────────────────────────────── */
    let currentLang = 'en';
    function setLang(lang) {
      currentLang = lang;
      document.querySelectorAll('[data-en]').forEach(function(el) {
        var text = el.dataset[lang];
        if (!text) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = text;
        } else {
          el.textContent = text;
        }
      });
      var btnEn = document.getElementById('btn-en');
      var btnEs = document.getElementById('btn-es');
      if (lang === 'en') {
        if (btnEn) btnEn.style.background = '#CC2222';
        if (btnEs) btnEs.style.background = '#000000';
      } else {
        if (btnEs) btnEs.style.background = '#CC2222';
        if (btnEn) btnEn.style.background = '#000000';
      }
    }
    var btnEnEl = document.getElementById('btn-en');
    var btnEsEl = document.getElementById('btn-es');
    if (btnEnEl) btnEnEl.addEventListener('click', function() { setLang('en'); });
    if (btnEsEl) btnEsEl.addEventListener('click', function() { setLang('es'); });

    /* ── Intersection Observer — fade-up on scroll ───── */
    var fadeTargets = ['private-events', 'public-events', 'make-event'];
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    fadeTargets.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    /* ── Eye tracking + blink ────────────────────────── */
    var rafId;
    var blinkInterval;
    var eyeMouseHandler;
    (function() {
      var svg      = document.getElementById('fomo-logo-svg');
      var eyeLeft  = document.getElementById('eye-left');
      var eyeRight = document.getElementById('eye-right');
      if (!svg || !eyeLeft || !eyeRight) return;
      var travelX    = 49.5;
      var travelY    = 46;
      var scaleX     = 99 / 86;
      var scaleY     = 92 / 169;
      var paddingX   = 15.5 * scaleX;
      var paddingY   = 10   * scaleY;
      var maxOffsetX = travelX - paddingX;
      var maxOffsetY = travelY - paddingY;
      var centerLX = 226.5;
      var centerRX = 620.5;
      var centerY  = 46;
      var eyeTrackingEnabled = false;
      var targetX = 0, targetY = 0;
      var currentX = 0, currentY = 0;
      var EASE = 0.18;
      window._enableEyeTracking = function() { eyeTrackingEnabled = true; };
      if (window.innerWidth >= 768) {
        eyeMouseHandler = function(e) {
          if (!eyeTrackingEnabled) return;
          var normX = (e.clientX / window.innerWidth)  * 2 - 1;
          var normY = (e.clientY / window.innerHeight) * 2 - 1;
          targetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, normX * maxOffsetX));
          targetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, normY * maxOffsetY));
        };
        document.addEventListener('mousemove', eyeMouseHandler);
        (function loop() {
          rafId = requestAnimationFrame(loop);
          if (!eyeTrackingEnabled) return;
          currentX += (targetX - currentX) * EASE;
          currentY += (targetY - currentY) * EASE;
          eyeLeft.setAttribute('x',  centerLX + currentX);
          eyeLeft.setAttribute('y',  centerY  + currentY);
          eyeRight.setAttribute('x', centerRX + currentX);
          eyeRight.setAttribute('y', centerY  + currentY);
        })();
        setTimeout(function() { eyeTrackingEnabled = true; }, 3350);
        blinkInterval = setInterval(function() {
          eyeLeft.style.transform  = 'scaleY(0.1)';
          eyeRight.style.transform = 'scaleY(0.1)';
          setTimeout(function() {
            eyeLeft.style.transform  = 'scaleY(1)';
            eyeRight.style.transform = 'scaleY(1)';
          }, 200);
        }, 3500);
      }
    })();

    /* ── Form: visibility toggle ─────────────────────── */
    document.querySelectorAll('.vis-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.vis-btn').forEach(function(b) { b.classList.remove('selected'); });
        this.classList.add('selected');
        var val = this.dataset.value;
        var note = document.getElementById('passcode-note');
        if (note) note.style.display = (val === 'private' || val === 'invitation') ? 'block' : 'none';
        var addlField = document.getElementById('additional-images-field');
        if (addlField) {
          if (val === 'private') {
            addlField.style.display = 'block';
            requestAnimationFrame(function() { addlField.style.opacity = '1'; });
          } else {
            addlField.style.opacity = '0';
            setTimeout(function() { addlField.style.display = 'none'; }, 300);
          }
        }
      });
    });

    /* ── Form: add/remove tier ───────────────────────── */
    var trashSVG =
      '<svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M1 4h14M5 4V2h6v2M2.5 4L4 16h8l1.5-12" stroke="#666666" stroke-width="1.5"' +
      ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function removeTier(btn) {
      var row = btn.closest('.tier-row');
      var container = document.getElementById('tier-container');
      if (container.querySelectorAll('.tier-row').length === 1) {
        row.querySelectorAll('input').forEach(function(inp) { inp.value = ''; });
      } else {
        row.remove();
      }
    }

    var addTierBtn = document.getElementById('add-tier-btn');
    if (addTierBtn) {
      addTierBtn.addEventListener('click', function() {
        var row = document.createElement('div');
        row.className = 'tier-row';
        row.innerHTML =
          '<input class="form-input" type="text" data-en="e.g. General" data-es="ej. General" placeholder="e.g. General" />' +
          '<input class="form-input" type="number" placeholder="$0" min="0" />' +
          '<button type="button" class="tier-delete-btn" data-en="Remove tier" data-es="Eliminar tier" title="Remove tier">' + trashSVG + '</button>';
        row.querySelector('.tier-delete-btn').addEventListener('click', function() { removeTier(this); });
        var container = document.getElementById('tier-container');
        if (container) container.appendChild(row);
      });
    }

    document.querySelectorAll('.tier-delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { removeTier(this); });
    });

    /* ── Mobile sticky logo handoff ─────────────────── */
    (function() {
      if (window.innerWidth >= 768) return;
      var logoBlock = document.querySelector('.hero-logo-block');
      var mobileBar = document.getElementById('mobile-logo-bar');
      if (!logoBlock || !mobileBar) return;
      function update() {
        var rect = logoBlock.getBoundingClientRect();
        var top  = rect.top;
        var h    = rect.height;
        if (top >= 0) {
          mobileBar.style.transform = 'translateY(-100%)';
        } else if (top <= -h) {
          mobileBar.style.transform = 'translateY(0)';
        } else {
          var progress = -top / h;
          mobileBar.style.transform = 'translateY(' + (-100 + progress * 100) + '%)';
        }
      }
      window.addEventListener('scroll', update, { passive: true });
      update();
    })();

    /* ── Mobile menu ─────────────────────────────────── */
    (function() {
      var bar       = document.getElementById('mobile-logo-bar');
      var hamburger = document.getElementById('mobileHamburger');
      var panel     = document.getElementById('mobileMenuPanel');
      if (!bar || !hamburger || !panel) return;
      bar.addEventListener('click', function(e) {
        if (hamburger.contains(e.target)) return;
        panel.classList.remove('is-open');
        var hero = document.getElementById('hero');
        if (hero) hero.scrollIntoView({ behavior: 'smooth' });
      });
      hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        panel.style.paddingTop = bar.offsetHeight + 'px';
        panel.classList.toggle('is-open');
      });
      document.querySelectorAll('[data-mobile-scroll]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var target = document.getElementById(btn.getAttribute('data-mobile-scroll'));
          if (target) target.scrollIntoView({ behavior: 'smooth' });
          panel.classList.remove('is-open');
        });
      });
      document.addEventListener('click', function(e) {
        if (!panel.classList.contains('is-open')) return;
        if (!panel.contains(e.target) && !bar.contains(e.target)) {
          panel.classList.remove('is-open');
        }
      });
    })();

    /* ── Desktop slide-out menu ─────────────────────── */
    (function() {
      var marquee  = document.querySelector('.left-marquee');
      var panel    = document.getElementById('desktopMenuPanel');
      var closeBtn = document.getElementById('desktopMenuClose');
      if (marquee && panel) {
        marquee.addEventListener('click', function() { panel.classList.toggle('is-open'); });
      }
      if (closeBtn && panel) {
        closeBtn.addEventListener('click', function() { panel.classList.remove('is-open'); });
      }
      document.querySelectorAll('[data-scroll-target]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var target = document.getElementById(btn.getAttribute('data-scroll-target'));
          if (target) target.scrollIntoView({ behavior: 'smooth' });
          if (panel) panel.classList.remove('is-open');
        });
      });
      document.addEventListener('click', function(e) {
        if (!panel || !panel.classList.contains('is-open')) return;
        if (!panel.contains(e.target) && marquee && !marquee.contains(e.target)) {
          panel.classList.remove('is-open');
        }
      });
    })();

    /* ── Private event sandbox ──────────────────────── */
    (function() {
      var searchInput = document.getElementById('private-passcode-input');
      var resultCard  = document.getElementById('priv-result-card');
      var pwTrack     = document.getElementById('priv-track');
      var pwInput     = document.getElementById('priv-pw-input');
      var pwBtn       = document.getElementById('priv-pw-btn');
      var pwError     = document.getElementById('priv-pw-error');
      if (!searchInput || !resultCard || !pwTrack) return;
      var SANDBOX_PW  = '123FOMO';
      var navToAccess = document.getElementById('priv-nav-to-access');
      var overlay     = document.getElementById('priv-event-overlay');
      function levenshtein(a, b) {
        if (a === b) return 0;
        var m = a.length, n = b.length, dp = [], i, j;
        for (i = 0; i <= m; i++) { dp[i] = [i]; }
        for (j = 0; j <= n; j++) { dp[0][j] = j; }
        for (i = 1; i <= m; i++) {
          for (j = 1; j <= n; j++) {
            dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
          }
        }
        return dp[m][n];
      }
      function fuzzyMatch(query, target) {
        query  = query.toLowerCase().trim();
        target = target.toLowerCase();
        if (query.length < 3) return false;
        if (target.includes(query)) return true;
        var qWords = query.split(/\s+/);
        var tWords = target.split(/\s+/);
        return qWords.every(function(qw) {
          if (qw.length < 3) return true;
          return tWords.some(function(tw) {
            if (tw.startsWith(qw)) return true;
            return levenshtein(qw, tw) <= (qw.length <= 4 ? 1 : 2);
          });
        });
      }
      searchInput.addEventListener('input', function() {
        resultCard.classList.toggle('is-visible', fuzzyMatch(searchInput.value, 'Trojan Fest'));
      });
      resultCard.addEventListener('click', function() {
        pwTrack.style.transform = 'translateX(-50%)';
        setTimeout(function() { if (pwInput) pwInput.focus(); }, 520);
      });
      function checkPassword() {
        if (!pwInput) return;
        if (pwInput.value === SANDBOX_PW) {
          pwError.classList.remove('is-visible');
          if (overlay) overlay.classList.add('is-visible');
        } else {
          pwInput.value = '';
          pwError.classList.add('is-visible');
          setTimeout(function() { pwError.classList.remove('is-visible'); }, 2400);
        }
      }
      if (pwBtn) pwBtn.addEventListener('click', checkPassword);
      if (pwInput) pwInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') checkPassword(); });
      if (navToAccess) navToAccess.addEventListener('click', function() {
        if (overlay) overlay.classList.remove('is-visible');
        resultCard.classList.remove('is-visible');
        setTimeout(function() {
          pwTrack.style.transition = 'none';
          pwTrack.style.transform  = 'translateX(0)';
          pwTrack.offsetHeight;
          pwTrack.style.transition = '';
          searchInput.value = '';
          if (pwInput) pwInput.value = '';
          if (pwError) pwError.classList.remove('is-visible');
        }, 650);
      });
    })();

    /* ── Mobile public events slideshow ─────────────── */
    (function() {
      if (window.innerWidth >= 768) return;
      var container = document.querySelector('.events-grid-container');
      if (!container) return;
      var origCards = Array.from(container.querySelectorAll('.pub-event-card'));
      if (origCards.length < 2) return;
      var track = document.createElement('div');
      track.className = 'events-slide-track';
      var allCards = origCards.concat(origCards.map(function(c) { return c.cloneNode(true); }));
      allCards.forEach(function(c) { track.appendChild(c); });
      container.appendChild(track);
      var gap        = 12;
      var containerW = container.offsetWidth;
      var cardW      = containerW * 0.78;
      var sideGap    = (containerW - cardW) / 2;
      var n          = origCards.length;
      allCards.forEach(function(c) { c.style.width = cardW + 'px'; });
      track.style.paddingLeft  = sideGap + 'px';
      track.style.paddingRight = sideGap + 'px';
      var current = 0;
      function setActive(idx) {
        allCards.forEach(function(c) { c.classList.remove('slide-active'); });
        allCards[idx].classList.add('slide-active');
      }
      function goTo(idx, animate) {
        if (animate === false) track.style.transition = 'none';
        else track.style.transition = 'transform 0.42s cubic-bezier(0.4,0,0.2,1)';
        track.style.transform = 'translateX(-' + (idx * (cardW + gap)) + 'px)';
        current = idx;
        setActive(idx);
      }
      track.addEventListener('transitionend', function() {
        if (current >= n) goTo(current - n, false);
      });
      goTo(0, false);
      var timer = setInterval(function() { goTo(current + 1, true); }, 3000);
      var touchStartX = 0, touchStartY = 0, dragging = false;
      container.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        dragging = false;
      }, { passive: true });
      container.addEventListener('touchmove', function(e) {
        var dx = Math.abs(e.touches[0].clientX - touchStartX);
        var dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > dy && dx > 8) { dragging = true; e.preventDefault(); }
      }, { passive: false });
      container.addEventListener('touchend', function(e) {
        var delta = e.changedTouches[0].clientX - touchStartX;
        if (delta < -40) {
          clearInterval(timer);
          goTo(current + 1, true);
          timer = setInterval(function() { goTo(current + 1, true); }, 3000);
        }
        setTimeout(function() { dragging = false; }, 0);
      });
      container.addEventListener('click', function(e) {
        if (dragging) e.stopPropagation();
      }, true);
    })();

    /* ── Intro loader sequence ──────────────────────── */
    (function() {
      var loader = document.getElementById('introLoader');
      if (!loader) return;
      var shouldPlay = !sessionStorage.getItem('fomoIntroPlayed');
      if (!shouldPlay) {
        loader.style.display = 'none';
        if (typeof window._enableEyeTracking === 'function') window._enableEyeTracking();
        return;
      }
      sessionStorage.setItem('fomoIntroPlayed', 'true');
      var eyeL = document.getElementById('intro-eye-l');
      var eyeR = document.getElementById('intro-eye-r');
      var EASE = 'cubic-bezier(0.4,0,0.2,1)';
      var DUR  = 820;
      var hSVG = document.getElementById('fomo-logo-svg');
      var hBOX = document.querySelector('.hero-logo-block');
      if (!hSVG || !hBOX || !eyeL || !eyeR) { loader.style.display = 'none'; return; }
      var hSR  = hSVG.getBoundingClientRect();
      var sX = hSR.width  / 711;
      var sY = hSR.height / 282;
      var oW = 140 * sX;
      var oH = hSR.height;
      var leftO  = { left: hSR.left + 177 * sX, top: hSR.top, width: oW, height: oH };
      var rightO = { left: hSR.left + 571 * sX, top: hSR.top, width: oW, height: oH };
      var pL = 74  * sX;
      var pT = 17  * sY;
      var pW = 41  * sX;
      var pH = 190 * sY;
      var INTRO_GAP_RATIO = 0.12;
      var gap      = rightO.left - (leftO.left + oW);
      var introGap = gap * INTRO_GAP_RATIO;
      var pairW    = 2 * oW + introGap;
      var introTop = (window.innerHeight - oH)   / 2;
      var introL   = (window.innerWidth  - pairW) / 2;
      var introR   = introL + oW + introGap;
      function place(el, l, t, w, h) {
        el.style.left = l + 'px'; el.style.top = t + 'px';
        el.style.width = w + 'px'; el.style.height = h + 'px';
      }
      place(eyeL, introL, introTop, oW, oH);
      place(eyeR, introR, introTop, oW, oH);
      loader.querySelectorAll('.intro-eye-pupil').forEach(function(p) {
        p.style.left = pL + 'px'; p.style.top = pT + 'px';
        p.style.width = pW + 'px'; p.style.height = pH + 'px';
      });
      setTimeout(function() { loader.classList.add('is-opening'); }, 300);
      setTimeout(function() { loader.classList.add('is-blinking'); }, 750);
      setTimeout(function() {
        var hBoxR = hBOX.getBoundingClientRect();
        var TRANS = DUR + 'ms ' + EASE;
        var pos   = 'left ' + TRANS + ',top ' + TRANS + ',width ' + TRANS + ',height ' + TRANS;
        loader.style.top = '0px'; loader.style.left = '0px';
        loader.style.width = window.innerWidth + 'px';
        loader.style.height = window.innerHeight + 'px';
        loader.style.overflow = 'hidden';
        eyeL.style.transition = pos; eyeR.style.transition = pos;
        loader.style.transition = pos;
        loader.offsetHeight;
        place(eyeL, leftO.left,  leftO.top,  leftO.width,  leftO.height);
        place(eyeR, rightO.left, rightO.top, rightO.width, rightO.height);
        loader.style.left   = hBoxR.left   + 'px';
        loader.style.top    = hBoxR.top    + 'px';
        loader.style.width  = hBoxR.width  + 'px';
        loader.style.height = hBoxR.height + 'px';
      }, 1700);
      setTimeout(function() {
        loader.style.transition = 'opacity 0.28s ease';
        loader.style.opacity    = '0';
        setTimeout(function() { loader.style.display = 'none'; }, 310);
      }, 2540);
    })();

    return function() {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      if (blinkInterval) clearInterval(blinkInterval);
      if (eyeMouseHandler) document.removeEventListener('mousemove', eyeMouseHandler);
    };
  }, []);

  function handleFormSubmit(e) {
    e.preventDefault();
    var msg = document.getElementById('form-submit-message');
    if (msg) {
      msg.style.display = 'block';
      msg.textContent = 'Your event has been submitted. We will review and publish it shortly.';
    }
  }

  // Determine poster background color for cards without poster images
  const POSTER_COLORS = ['#0d0d0d', '#141010', '#0d1310', '#1a0d0d', '#0d0d1a', '#111111'];

  return (
    <>
      {/* ── Intro loader ──────────────────────────────── */}
      <div id="introLoader">
        <div id="intro-eye-l" className="intro-eye"><div className="intro-eye-pupil"></div></div>
        <div id="intro-eye-r" className="intro-eye"><div className="intro-eye-pupil"></div></div>
      </div>

      {/* ── Mobile sticky logo bar ──────────────────── */}
      <div id="mobile-logo-bar">
        <button id="mobileHamburger" className="mobile-hamburger" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/FomoLogoAnimation.svg" alt="FOMO" id="mobileStickyLogo" />
        <div className="mobile-bar-spacer"></div>
      </div>

      {/* ── Mobile menu panel ───────────────────────── */}
      <div id="mobileMenuPanel" className="mobile-menu-panel">
        <nav className="mobile-menu-nav">
          <button data-mobile-scroll="hero"           data-en="home"    data-es="inicio">home</button>
          <button data-mobile-scroll="private-events" data-en="private" data-es="privado">private</button>
          <button data-mobile-scroll="public-events"  data-en="public"  data-es="público">public</button>
          <button data-mobile-scroll="make-event"     data-en="host"    data-es="organiza">host</button>
        </nav>
        <div className="mobile-menu-account" onClick={() => router.push('/signup')} style={{ cursor: 'pointer' }}>
          <div className="mobile-menu-avatar"></div>
          <span data-en="create account" data-es="crear cuenta">create account</span>
        </div>
        <div className="mobile-menu-footer">
          <button data-en="instagram" data-es="instagram">instagram</button>
          <button data-en="contact"   data-es="contacto">contact</button>
          <button data-en="about"     data-es="nosotros">about</button>
        </div>
      </div>

      {/* ── Desktop slide-out menu ───────────────────── */}
      <div className="desktop-menu-panel" id="desktopMenuPanel">
        <button className="desktop-menu-close" id="desktopMenuClose" aria-label="Close menu">×</button>
        <nav className="desktop-menu-nav">
          <button data-scroll-target="hero"           data-en="home"    data-es="inicio">home</button>
          <button data-scroll-target="private-events" data-en="private" data-es="privado">private</button>
          <button data-scroll-target="public-events"  data-en="public"  data-es="público">public</button>
          <button data-scroll-target="make-event"     data-en="host"    data-es="organiza">host</button>
        </nav>
        <div className="desktop-menu-create" onClick={() => router.push('/signup')}>
          <div className="desktop-menu-avatar"></div>
          <span data-en="create account" data-es="crear cuenta">create account</span>
        </div>
        <div className="desktop-menu-footer">
          <button data-footer-link="instagram" data-en="instagram" data-es="instagram">instagram</button>
          <button data-footer-link="contact"   data-en="contact"   data-es="contacto">contact</button>
          <button data-footer-link="about"     data-en="about"     data-es="nosotros">about</button>
        </div>
      </div>

      {/* ── Left marquee sidebar ────────────────────── */}
      <div className="left-marquee" role="button" aria-label="Open menu">
        <div className="left-marquee-track">
          <div className="marquee-group">
            <span>MENU</span><span>FOMO</span><span>MENU</span><span>FOMO</span>
            <span>MENU</span><span>FOMO</span><span>MENU</span><span>FOMO</span>
            <span>MENU</span><span>FOMO</span><span>MENU</span><span>FOMO</span>
          </div>
          <div className="marquee-group" aria-hidden="true">
            <span>MENU</span><span>FOMO</span><span>MENU</span><span>FOMO</span>
            <span>MENU</span><span>FOMO</span><span>MENU</span><span>FOMO</span>
            <span>MENU</span><span>FOMO</span><span>MENU</span><span>FOMO</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
           SECTION 1 — HERO
      ══════════════════════════════════════════════ */}
      <section id="hero">
        <div className="hero-inner">
          <div className="lang-buttons">
            <button className="lang-btn" id="btn-en">EN</button>
            <button className="lang-btn" id="btn-es">ES</button>
          </div>
          <div className="hero-logo-block">
            <svg id="fomo-logo-svg" width="711" height="282" viewBox="0 0 711 282" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="27" height="282" fill="white"/>
              <rect width="122" height="54" transform="matrix(-1 0 0 1 142 0)" fill="white"/>
              <rect width="118" height="86" transform="matrix(-1 0 0 1 142 67)" fill="white"/>
              <rect x="460" width="25" height="282" fill="white"/>
              <rect x="512" width="25" height="282" fill="white"/>
              <rect x="351" width="70" height="282" fill="white"/>
              <rect x="356" width="181" height="54" fill="white"/>
              <rect x="177" width="140" height="282" fill="white"/>
              <rect id="eye-left"  x="251" y="17" width="41" height="190" fill="black"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', transition: 'transform 0.08s ease' }}/>
              <rect x="571" width="140" height="282" fill="white"/>
              <rect id="eye-right" x="645" y="17" width="41" height="190" fill="black"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', transition: 'transform 0.08s ease' }}/>
            </svg>
          </div>
        </div>
        <div className="hero-scroll" onClick={() => document.getElementById('private-events')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="hero-scroll-label" data-en="scroll to find events" data-es="desplázate para ver eventos">scroll to find events</span>
          <svg className="hero-scroll-arrow" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 16L24 34L40 16" stroke="#aaaaaa" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
           SECTION 2 — PRIVATE EVENTS
      ══════════════════════════════════════════════ */}
      <section id="private-events">
        <div className="section-bar">
          <span className="section-bar-title" data-en="private events" data-es="eventos privados">private events</span>
        </div>
        <div className="private-content">
          <span className="priv-content-title" data-en="private events" data-es="eventos privados">private events</span>
          <div className="priv-track-wrap">
            <div className="priv-track" id="priv-track">
              <div className="priv-panel">
                <input
                  type="text"
                  className="private-input"
                  id="private-passcode-input"
                  data-en="enter event name or link to access private event"
                  data-es="ingresa el nombre o enlace para acceder al evento privado"
                  placeholder="enter event name or link to access private event"
                  autoComplete="off"
                />
                <div className="priv-result-card" id="priv-result-card">
                  <span className="priv-result-name">Trojan Fest</span>
                  <span className="priv-result-sub">This event is private</span>
                </div>
              </div>
              <div className="priv-panel">
                <p className="priv-pw-title" data-en="Enter event password" data-es="Ingresa la contraseña del evento">Enter event password</p>
                <input
                  type="password"
                  className="private-input"
                  id="priv-pw-input"
                  data-en="password"
                  data-es="contraseña"
                  placeholder="password"
                  autoComplete="off"
                />
                <button className="priv-pw-btn" id="priv-pw-btn" data-en="Submit" data-es="Ingresar">Submit</button>
                <p className="priv-pw-error" id="priv-pw-error" data-en="Incorrect password" data-es="Contraseña incorrecta">Incorrect password</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event page overlay */}
      <div id="priv-event-overlay">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="priv-event-back-btn" id="priv-nav-to-access"
                  data-en="return to access" data-es="volver al acceso">return to access</button>
          <button className="priv-event-back-btn"
                  data-en="save to my events" data-es="guardar en mis eventos">save to my events</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
           SECTION 3 — PUBLIC EVENTS
      ══════════════════════════════════════════════ */}
      <section id="public-events">
        <div className="section-bar">
          <span className="section-bar-title" data-en="public events" data-es="eventos públicos">public events</span>
        </div>
        <div className="events-grid-container">
          {events.length === 0 ? (
            <div style={{ fontFamily: 'Actay, sans-serif', fontSize: 14, color: '#888888', padding: '40px 0', gridColumn: '1/-1' }}>
              No events yet. Check back soon.
            </div>
          ) : (
            events.map(function(ev, i) {
              var bg = ev.poster_url ? undefined : POSTER_COLORS[i % POSTER_COLORS.length];
              return (
                <div key={ev.id} className="pub-event-card" onClick={() => openEventModal(ev)}>
                  <div
                    className="card-poster"
                    style={ev.poster_url
                      ? { backgroundImage: `url(${ev.poster_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: bg }
                    }
                  >
                    {!ev.poster_url && (
                      <span className="card-poster-name">{ev.title?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="card-info">
                    <p className="card-info-name">{ev.title?.toUpperCase()}</p>
                    <p className="card-info-date">{formatEventDate(ev.date)}</p>
                    <p className="card-info-location">{ev.location}</p>
                    <p className="card-info-price">{formatMinPrice(ev)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
           SECTION 4 — MAKE YOUR OWN EVENT
      ══════════════════════════════════════════════ */}
      <section id="make-event">
        <div className="section-bar">
          <span className="section-bar-title" data-en="make your own event" data-es="crea tu propio evento">make your own event</span>
        </div>
        <div className="make-content">
          <div className="form-gate-wrapper">
            <div id="auth-overlay" style={{ display: 'none' }}>
              <div className="auth-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/FomoLogoVector2.svg" alt="FOMO" className="auth-logo" />
                <p className="auth-card-title" data-en="create an account to make your event" data-es="crea una cuenta para publicar tu evento">
                  create an account to make your event
                </p>
                <button className="auth-card-btn" onClick={() => router.push('/signup')}
                        data-en="Create Account" data-es="Crear Cuenta">Create Account</button>
              </div>
            </div>
            <form id="create-event-form" onSubmit={handleFormSubmit} noValidate>
              <div className="form-field">
                <label className="form-label" data-en="Event Name" data-es="Nombre del Evento">Event Name</label>
                <input className="form-input" type="text"
                       data-en="what's the event called?" data-es="¿cómo se llama el evento?"
                       placeholder="what's the event called?" />
              </div>
              <div className="form-field">
                <label className="form-label" data-en="Event Type" data-es="Tipo de Evento">Event Type</label>
                <select className="form-select">
                  <option value="party"    data-en="Party"          data-es="Fiesta">Party</option>
                  <option value="concert"  data-en="Concert"        data-es="Concierto">Concert</option>
                  <option value="festival" data-en="Festival"       data-es="Festival">Festival</option>
                  <option value="fashion"  data-en="Fashion Show"   data-es="Desfile de Moda">Fashion Show</option>
                  <option value="sports"   data-en="Sports"         data-es="Deportes">Sports</option>
                  <option value="art"      data-en="Art & Culture"  data-es="Arte y Cultura">Art &amp; Culture</option>
                  <option value="other"    data-en="Other"          data-es="Otro">Other</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" data-en="Visibility" data-es="Visibilidad">Visibility</label>
                <div className="vis-toggle">
                  <button type="button" className="vis-btn selected" data-value="public"
                          data-en="Public" data-es="Público">Public</button>
                  <button type="button" className="vis-btn" data-value="private"
                          data-en="Private" data-es="Privado">Private</button>
                  <button type="button" className="vis-btn" data-value="invitation"
                          data-en="Invitation Only" data-es="Solo por Invitación">Invitation Only</button>
                </div>
                <p className="passcode-note" id="passcode-note" style={{ display: 'none' }}
                   data-en="A unique passcode will be generated for your event."
                   data-es="Se generará un código único para tu evento.">
                  A unique passcode will be generated for your event.
                </p>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label" data-en="Date" data-es="Fecha">Date</label>
                  <input className="form-input" type="date" />
                </div>
                <div className="form-field">
                  <label className="form-label" data-en="Time" data-es="Hora">Time</label>
                  <input className="form-input" type="time" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label" data-en="Location" data-es="Ubicación">Location</label>
                <input className="form-input" type="text"
                       data-en="venue or address" data-es="lugar o dirección"
                       placeholder="venue or address" />
              </div>
              <div className="form-field">
                <label className="form-label" data-en="Ticket Tiers" data-es="Tipos de Entrada">Ticket Tiers</label>
                <div id="tier-container">
                  <div className="tier-row">
                    <input className="form-input" type="text"
                           data-en="e.g. General" data-es="ej. General"
                           placeholder="e.g. General" />
                    <input className="form-input" type="number" placeholder="$0" min="0" />
                    <button type="button" className="tier-delete-btn"
                            data-en="Remove tier" data-es="Eliminar tier" title="Remove tier">
                      <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4h14M5 4V2h6v2M2.5 4L4 16h8l1.5-12" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <button type="button" className="add-tier-btn" id="add-tier-btn"
                        data-en="+ Add another tier" data-es="+ Agregar tipo de entrada">
                  + Add another tier
                </button>
              </div>
              <div className="form-field">
                <label className="form-label" data-en="Event Description" data-es="Descripción del Evento">Event Description</label>
                <textarea className="form-textarea" rows="4"
                          data-en="describe the experience" data-es="describe la experiencia"
                          placeholder="describe the experience"></textarea>
              </div>
              <div className="form-field">
                <label className="form-label" data-en="Event Poster" data-es="Póster del Evento">Event Poster</label>
                <input type="file" id="poster-upload" accept="image/*" />
                <label htmlFor="poster-upload" className="file-upload-label"
                       data-en="upload event poster" data-es="subir póster del evento">
                  upload event poster
                </label>
              </div>
              <div className="form-field" id="additional-images-field" style={{ display: 'none', opacity: 0 }}>
                <label className="form-label" data-en="Additional Event Images" data-es="Imágenes Adicionales">Additional Event Images</label>
                <input type="file" id="additional-images-upload" accept="image/*" multiple />
                <label htmlFor="additional-images-upload" className="file-upload-label"
                       data-en="Upload Additional Event Images" data-es="Subir Imágenes Adicionales del Evento">
                  Upload Additional Event Images
                </label>
              </div>
              <button type="submit" className="form-submit-btn"
                      data-en="Create Event" data-es="Crear Evento">Create Event</button>
              <p className="form-submit-message" id="form-submit-message" style={{ display: 'none' }}
                 data-en="Your event has been submitted. We will review and publish it shortly."
                 data-es="Tu evento ha sido enviado. Lo revisaremos y publicaremos pronto.">
                Your event has been submitted. We will review and publish it shortly.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
           FOOTER
      ══════════════════════════════════════════════ */}
      <footer id="footer">
        <div className="footer-grid">
          <div className="footer-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/FomoLogoVector2.svg" alt="FOMO" className="footer-logo" />
            <p className="footer-tagline"
               data-en="The only ticketing platform for private events in Costa Rica."
               data-es="La única plataforma de tickets para eventos privados en Costa Rica.">
              The only ticketing platform for private events in Costa Rica.
            </p>
            <p className="footer-copyright"
               data-en="© 2026 FOMO. All rights reserved."
               data-es="© 2026 FOMO. Todos los derechos reservados.">
              © 2026 FOMO. All rights reserved.
            </p>
          </div>
          <div className="footer-col">
            <span className="footer-col-title" data-en="Contact" data-es="Contacto">Contact</span>
            <div className="footer-links">
              <a href="mailto:support.fomo@gmail.com" className="footer-link">support.fomo@gmail.com</a>
            </div>
          </div>
        </div>
        <hr className="footer-divider" />
        <p className="footer-credit">Designed &amp; Built by Folio Labs · foliocr.com</p>
      </footer>

      {/* ══════════════════════════════════════════════
           REAL EVENT MODAL (controlled by React state)
      ══════════════════════════════════════════════ */}
      <div
        id="event-modal"
        className={`modal-overlay${modalEvent ? ' open' : ''}`}
        onClick={(e) => { if (e.target.id === 'event-modal') closeEventModal(); }}
      >
        {modalEvent && (
          <div className="modal-box">
            <button className="modal-close-btn" onClick={closeEventModal}>✕</button>
            <div
              className="modal-poster-panel"
              style={modalEvent.poster_url
                ? { backgroundImage: `url(${modalEvent.poster_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: '#0d0d0d' }
              }
            >
              {!modalEvent.poster_url && (
                <span className="modal-poster-name-lg">{modalEvent.title?.toUpperCase()}</span>
              )}
            </div>
            <div className="modal-details-panel">
              <h2 className="modal-event-title">{modalEvent.title?.toUpperCase()}</h2>
              <p className="modal-meta">{formatEventDate(modalEvent.date)}</p>
              <p className="modal-meta">{modalEvent.location}</p>
              {modalEvent.description && (
                <p className="modal-desc">{modalEvent.description}</p>
              )}
              <div className="modal-tiers">
                <div className="modal-tier-pill">{formatMinPrice(modalEvent)}</div>
              </div>
              <button
                className="modal-buy-btn"
                onClick={() => router.push(`/events/${modalEvent.id}`)}
              >
                Buy Tickets
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
