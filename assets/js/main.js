/* ==========================================================================
   Abogada de la Tierra — main.js
   Vanilla JS · No dependencies
   ========================================================================== */

;(function () {
  'use strict'

  /* -----------------------------------------------------------------------
     0. DOM CACHE
     ----------------------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel)
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)]

  const header      = $('#header')
  const menuToggle  = $('#menu-toggle')
  const nav         = $('#main-nav')
  const contactForm = $('#contact-form')
  const yearSpan    = $('#current-year')


  /* -----------------------------------------------------------------------
     1. MOBILE MENU
     ----------------------------------------------------------------------- */
  let overlay = null

  function createOverlay () {
    if (overlay) return
    overlay = document.createElement('div')
    overlay.classList.add('nav-overlay')
    overlay.setAttribute('aria-hidden', 'true')
    document.body.appendChild(overlay)
    overlay.addEventListener('click', closeMenu)
  }

  function openMenu () {
    createOverlay()
    menuToggle.setAttribute('aria-expanded', 'true')
    menuToggle.setAttribute('aria-label', 'Cerrar menú de navegación')
    nav.classList.add('is-open')
    overlay.classList.add('is-visible')
    document.body.classList.add('menu-open')
  }

  function closeMenu () {
    menuToggle.setAttribute('aria-expanded', 'false')
    menuToggle.setAttribute('aria-label', 'Abrir menú de navegación')
    nav.classList.remove('is-open')
    if (overlay) overlay.classList.remove('is-visible')
    document.body.classList.remove('menu-open')
  }

  function toggleMenu () {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true'
    isOpen ? closeMenu() : openMenu()
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMenu)
  }

  // Close menu when clicking a nav link (mobile)
  $$('.nav__link', nav).forEach(link => {
    link.addEventListener('click', () => {
      if (nav.classList.contains('is-open')) closeMenu()
    })
  })

  // Close menu on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) closeMenu()
  })


  /* -----------------------------------------------------------------------
     2. HEADER SCROLL EFFECT
     ----------------------------------------------------------------------- */
  let lastScroll   = 0
  let headerShadow = false

  function onScroll () {
    const scrollY = window.scrollY

    // Add shadow after scrolling past threshold
    if (scrollY > 50 && !headerShadow) {
      header.classList.add('header--scrolled')
      headerShadow = true
    } else if (scrollY <= 50 && headerShadow) {
      header.classList.remove('header--scrolled')
      headerShadow = false
    }

    lastScroll = scrollY
  }

  // Throttle scroll listener
  let ticking = false
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScroll()
        ticking = false
      })
      ticking = true
    }
  }, { passive: true })


  /* -----------------------------------------------------------------------
     3. ACTIVE NAV LINK (scroll spy)
     ----------------------------------------------------------------------- */
  const sections = $$('section[id]')
  const navLinks = $$('.nav__link[href^="#"]')

  function setActiveLink (id) {
    navLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${id}`
      link.classList.toggle('nav__link--active', isActive)
      if (isActive) {
        link.setAttribute('aria-current', 'true')
      } else {
        link.removeAttribute('aria-current')
      }
    })
  }

  // Use IntersectionObserver instead of reading offsetTop/offsetHeight on every
  // scroll — that querying forces synchronous layout (reflow). The observer marks
  // a section active as it crosses a thin band near the middle of the viewport,
  // with no geometry queries on the scroll path.
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveLink(entry.target.id)
      })
    }, { rootMargin: '-45% 0px -55% 0px', threshold: 0 })

    sections.forEach(section => spy.observe(section))
  }


  /* -----------------------------------------------------------------------
     4. SCROLL REVEAL (IntersectionObserver)
     ----------------------------------------------------------------------- */
  function initScrollReveal () {
    const revealElements = $$('.reveal')
    if (!revealElements.length) return

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealElements.forEach(el => el.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
      }
    )

    revealElements.forEach(el => observer.observe(el))
  }

  // Auto-tag elements for reveal
  function tagRevealElements () {
    const selectors = [
      '.about__content',
      '.about__image-col',
      '.service-card',
      '.testimonial-card',
      '.contact__info',
      '.contact__form',
      '.rural__content'
    ]

    selectors.forEach(sel => {
      $$(sel).forEach(el => el.classList.add('reveal'))
    })

    // Stagger containers
    $$('.services__grid, .testimonials__grid').forEach(grid => {
      grid.classList.add('reveal-stagger')
    })
  }

  tagRevealElements()
  initScrollReveal()


  /* -----------------------------------------------------------------------
     5. CONTACT FORM VALIDATION
     ----------------------------------------------------------------------- */
  const validators = {
    name:    v => v.trim().length >= 2,
    email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    subject: v => v !== '',
    message: v => v.trim().length >= 10,
    phone:   v => { const t = v.trim(); return t === '' || /^\+?(?:[\s.\(\)+\-]*\d){9,}[\s.\(\)+\-]*$/.test(t) },
    privacy: (_, el) => el.checked
  }

  const errorMessages = {
    name:    'Introduce tu nombre (mínimo 2 caracteres).',
    email:   'Introduce un email válido.',
    subject: 'Selecciona un tipo de consulta.',
    message: 'Cuéntame un poco más (mínimo 10 caracteres).',
    phone:   'Introduce un teléfono válido (al menos 9 dígitos).',
    privacy: 'Debes aceptar la política de privacidad.'
  }

  function validateField (name, value, element) {
    const validator = validators[name]
    if (!validator) return true

    const isValid = validator(value, element)
    const errorEl = $(`#error-${name}`)
    const input   = element || $(`#contact-${name}`)

    if (isValid) {
      if (errorEl) errorEl.textContent = ''
      if (input) input.classList.remove('is-invalid')
    } else {
      if (errorEl) errorEl.textContent = errorMessages[name]
      if (input) input.classList.add('is-invalid')
    }

    return isValid
  }

  function validateForm () {
    let isValid = true

    const fields = [
      { name: 'name',    value: $('#contact-name').value,                element: $('#contact-name') },
      { name: 'email',   value: $('#contact-email').value,               element: $('#contact-email') },
      { name: 'phone',   value: $('#contact-phone').value,               element: $('#contact-phone') },
      { name: 'subject', value: $('#contact-subject').value,             element: $('#contact-subject') },
      { name: 'message', value: $('#contact-message').value,             element: $('#contact-message') },
      { name: 'privacy', value: $('#contact-privacy').checked.toString(), element: $('#contact-privacy') }
    ]

    fields.forEach(({ name, value, element }) => {
      if (!validateField(name, value, element)) {
        isValid = false
      }
    })

    return isValid
  }

  if (contactForm) {
    // Render the form feedback panel: heading + body text/links.
    function renderStatus (type, title, bodyNodes) {
      const statusEl = $('#form-status')
      statusEl.className = `form__status form__status--${type}`
      statusEl.textContent = ''

      const titleEl = document.createElement('p')
      titleEl.className = 'form__status-title'
      titleEl.textContent = title

      const textEl = document.createElement('p')
      textEl.className = 'form__status-text'
      bodyNodes.forEach(n => textEl.appendChild(
        typeof n === 'string' ? document.createTextNode(n) : n
      ))

      statusEl.append(titleEl, textEl)
    }

    // Validate on blur
    $$('.form__input, .form__select, .form__textarea', contactForm).forEach(input => {
      input.addEventListener('blur', () => {
        const name = input.name || input.id.replace('contact-', '')
        validateField(name, input.value, input)
      })
    })

    // Validate checkbox on change
    const privacyCheckbox = $('#contact-privacy')
    if (privacyCheckbox) {
      privacyCheckbox.addEventListener('change', () => {
        validateField('privacy', privacyCheckbox.checked.toString(), privacyCheckbox)
      })
    }

    // Submit
    contactForm.addEventListener('submit', e => {
      e.preventDefault()

      if (!validateForm()) {
        // Focus on first invalid field
        const firstInvalid = $('.is-invalid', contactForm)
        if (firstInvalid) firstInvalid.focus()
        return
      }

      const submitBtn = $('#form-submit')
      const statusEl  = $('#form-status')
      const RECIPIENT = 'lrg.administrativo@gmail.com'

      // Collect the field values
      const subjectEl    = $('#contact-subject')
      const subjectLabel = subjectEl.options[subjectEl.selectedIndex].text
      const name    = $('#contact-name').value.trim()
      const email   = $('#contact-email').value.trim()
      const phone   = $('#contact-phone').value.trim()
      const message = $('#contact-message').value.trim()

      // Build a mailto: URL as a graceful fallback if the backend is unreachable.
      const mailSubject = `Consulta web — ${subjectLabel} — ${name}`
      const mailBody = [
        `Nombre: ${name}`,
        `Email: ${email}`,
        phone ? `Teléfono: ${phone}` : null,
        `Tipo de consulta: ${subjectLabel}`,
        '',
        'Mensaje:',
        message,
        '',
        '— Enviado desde el formulario de abogadadelatierra.es'
      ].filter(line => line !== null).join('\r\n')

      const mailtoUrl =
        `mailto:${RECIPIENT}` +
        `?subject=${encodeURIComponent(mailSubject)}` +
        `&body=${encodeURIComponent(mailBody)}`

      submitBtn.classList.add('is-loading')
      submitBtn.disabled = true
      statusEl.className = 'form__status'
      statusEl.textContent = ''

      const restoreButton = () => {
        submitBtn.classList.remove('is-loading')
        submitBtn.disabled = false
      }

      // If the backend can't take over, offer the mailto: route instead.
      const showMailtoFallback = () => {
        const fallbackLink = document.createElement('a')
        fallbackLink.href = mailtoUrl
        fallbackLink.textContent = RECIPIENT
        renderStatus('error', 'No hemos podido enviarlo automáticamente', [
          'Ha ocurrido un problema al enviar tu consulta. Inténtalo de nuevo en ' +
          'unos minutos o escríbenos directamente a ',
          fallbackLink,
          '.'
        ])
      }

      // Primary path: POST to the Cloudflare Function, which emails Lucía.
      fetch(contactForm.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(contactForm)
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json().catch(() => ({}))
        })
        .then(() => {
          contactForm.reset()
          renderStatus('success', 'Mensaje enviado', [
            'Gracias por tu consulta. Hemos hecho llegar tu mensaje a Lucía, que ' +
            'te responderá lo antes posible.'
          ])
        })
        .catch(showMailtoFallback)
        .finally(restoreButton)
    })
  }


  /* -----------------------------------------------------------------------
     6. CURRENT YEAR
     ----------------------------------------------------------------------- */
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear()
  }


  /* -----------------------------------------------------------------------
     7. FULL-RESOLUTION IMAGE (right-click opens the original JPG)

     Smooth in-page scrolling is handled entirely in CSS
     (html { scroll-behavior: smooth; scroll-padding-top: … }), which also
     offsets for the fixed header and honours prefers-reduced-motion. No JS
     needed for anchor navigation.
     ----------------------------------------------------------------------- */
  $$('picture[data-fullres]').forEach(pic => {
    pic.addEventListener('contextmenu', e => {
      const url = pic.dataset.fullres
      if (!url) return
      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (opened) e.preventDefault()
    })
  })

})()
