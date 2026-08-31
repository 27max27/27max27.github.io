'use strict';

/* ============================================================
   NAVBAR — Scrolled state + Mobile toggle
   ============================================================ */
function initNavbar() {
    const navbar  = document.getElementById('navbar');
    const toggle  = document.querySelector('.nav-toggle');
    const navEl   = navbar.querySelector('nav');
    const links   = document.querySelectorAll('.nav-link, .nav-cta');

    if (!navbar || !toggle || !navEl) return;

    // Scrolled class
    const onScroll = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Hamburger toggle
    toggle.addEventListener('click', () => {
        const isOpen = navEl.classList.toggle('is-open');
        toggle.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link click
    links.forEach(link => {
        link.addEventListener('click', () => {
            navEl.classList.remove('is-open');
            toggle.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });
}

/* ============================================================
   HERO SLIDESHOW
   ============================================================ */
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots   = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;

    let current = 0;
    let timer;

    function goTo(index) {
        slides[current].classList.remove('active');
        dots[current]?.classList.remove('active');
        current = (index + slides.length) % slides.length;
        slides[current].classList.add('active');
        dots[current]?.classList.add('active');
    }

    function autoPlay() {
        timer = setInterval(() => goTo(current + 1), 12000);
    }

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            clearInterval(timer);
            goTo(i);
            autoPlay();
        });
    });

    autoPlay();
}

/* ============================================================
   COUNTDOWN TIMER
   ============================================================ */
function initCountdown() {
    const endDate = new Date('2026-09-01T12:40:00+02:00').getTime();

    const els = {
        days:    document.getElementById('days'),
        hours:   document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds'),
    };

    if (!els.days) return;

    function pad(n) { return String(n).padStart(2, '0'); }

    function showOpened() {
        const card = document.querySelector('.countdown-inner');
        if (card) {
            card.innerHTML = `
                <div class="countdown-opened">
                    <span class="countdown-opened-icon"><i class="fas fa-door-open"></i></span>
                    <h3 class="countdown-opened-title">Nová expozice otevřena!</h3>
                    <p class="countdown-opened-text">Speciální výstava věnovaná vývoji japonských sedanů je právě otevřena. Přijďte se podívat!</p>
                    <a href="#rezervace" class="btn-primary countdown-opened-btn">Rezervovat vstupenku →</a>
                </div>
            `;
        }
    }

    let intervalId = null;

    function tick() {
        const diff = endDate - Date.now();

        if (diff <= 0) {
            if (intervalId) clearInterval(intervalId);
            showOpened();
            return;
        }

        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        els.days.textContent    = pad(d);
        els.hours.textContent   = pad(h);
        els.minutes.textContent = pad(m);
        els.seconds.textContent = pad(s);
    }

    tick();
    intervalId = setInterval(tick, 1000);
}

/* ============================================================
   CSV PARSER & EXHIBITION LOADER
   ============================================================ */
function parseCSV(csvText) {
    const rows = [];
    let current = '';
    let row = [];
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char     = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            row.push(current.trim());
            current = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            row.push(current.trim());
            if (row.some(cell => cell.length > 0)) rows.push(row);
            row = [];
            current = '';
        } else {
            current += char;
        }
    }

    if (current || row.length) {
        row.push(current.trim());
        if (row.some(cell => cell.length > 0)) rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows.map(values =>
        headers.reduce((entry, header, index) => {
            entry[header] = values[index] || '';
            return entry;
        }, {})
    );
}

function createExpoCarouselSlide(exhibition) {
    const slide = document.createElement('div');
    slide.className = 'expo-carousel-slide';

    const img = document.createElement('img');
    img.src     = exhibition.obrazek;
    img.alt     = exhibition.nazev;
    img.loading = 'lazy';

    // Card body (below image)
    const body = document.createElement('div');
    body.className = 'expo-carousel-body';

    if (exhibition.kategorie) {
        const tag = document.createElement('span');
        tag.className   = 'expo-carousel-tag';
        tag.textContent = exhibition.kategorie;
        body.appendChild(tag);
    }

    const title = document.createElement('h3');
    title.className   = 'expo-carousel-title';
    title.textContent = exhibition.nazev;
    body.appendChild(title);

    if (exhibition.popis) {
        const desc = document.createElement('p');
        desc.className   = 'expo-carousel-desc';
        desc.textContent = exhibition.popis;
        body.appendChild(desc);
    }

    // Obal obrázku – řídí aspect-ratio, object-fit: contain (celé auto viditelné)
    const imgWrap = document.createElement('div');
    imgWrap.className = 'expo-carousel-img-wrap';
    imgWrap.appendChild(img);

    slide.append(imgWrap, body);
    return slide;
}

async function loadExhibitions() {
    const track   = document.getElementById('expo-carousel-track');
    if (!track) return;

    try {
        const response = await fetch('expozice.csv', { cache: 'no-store' });
        if (!response.ok) throw new Error('CSV se nepodařilo načíst.');

        const csvText     = await response.text();
        const exhibitions = parseCSV(csvText).filter(item => item.nazev && item.obrazek);

        if (!exhibitions.length) throw new Error('CSV neobsahuje žádné platné expozice.');

        exhibitions.forEach(exhibition => {
            track.appendChild(createExpoCarouselSlide(exhibition));
        });

        // Tečky (dots) se vytvoří uvnitř initExpoCarousel() — jejich počet
        // závisí na počtu viditelných karet (počet pozic = slides − viditelné + 1).
        initExpoCarousel();

        // Trigger reveal for newly added elements
        initReveal();
    } catch (err) {
        const msg = document.createElement('p');
        msg.className   = 'csv-error';
        msg.textContent = 'Expozice se nepodařilo načíst. Spusťte web přes lokální server.';
        track.appendChild(msg);
        console.error(err);
    }
}

/* ============================================================
   EXPO CAROUSEL CONTROLLER — Multi-item
   (completely independent from Hero slider)
   ============================================================ */
function initExpoCarousel() {
    const carousel = document.getElementById('expo-carousel');
    const track    = document.getElementById('expo-carousel-track');
    const dotsBox  = document.getElementById('expo-carousel-dots');
    const slides   = track ? Array.from(track.querySelectorAll('.expo-carousel-slide')) : [];
    const prevBtn  = document.getElementById('expo-carousel-prev');
    const nextBtn  = document.getElementById('expo-carousel-next');

    if (!track || slides.length === 0) return;

    let current = 0;
    let expoTimer;
    const GAP = 20; // 1.25rem v px – musí odpovídat gapu v CSS .expo-carousel-track

    // Kolik karet je vidět podle šířky okna. Musí odpovídat CSS breakpointu
    // pro .expo-carousel-slide (≤768 px = 1 karta), jinak by nesouhlasil
    // počet teček ani krok posuvu s tím, co je reálně vidět.
    function getVisibleCount() {
        return window.innerWidth <= 768 ? 1 : 2;
    }

    // Počet pozic posuvu. Krok je vždy 1 karta, takže poslední pozice
    // je tam, kde je vidět posledních `getVisibleCount()` karet.
    function getMaxIndex() {
        return Math.max(0, slides.length - getVisibleCount());
    }

    function updatePosition() {
        const slideWidth = slides[0].offsetWidth;
        const offset = current * (slideWidth + GAP);
        track.style.transform = `translateX(-${offset}px)`;
    }

    function updateDots() {
        if (!dotsBox) return;
        Array.from(dotsBox.children).forEach((d, i) => {
            d.classList.toggle('is-active', i === current);
        });
    }

    // Vytvoří jednu tečku na každou pozici posuvu (počet závisí na tom,
    // kolik karet je vidět). Volá se po načtení CSV i při změně breakpointu.
    function buildDots() {
        if (!dotsBox) return;
        const count = getMaxIndex() + 1;
        dotsBox.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const dot = document.createElement('button');
            dot.className = 'expo-carousel-dot' + (i === current ? ' is-active' : '');
            dot.setAttribute('aria-label', `Expozice ${i + 1}`);
            dot.dataset.index = i;
            dot.addEventListener('click', () => {
                stopAutoPlay();
                goTo(i);
                startAutoPlay();
            });
            dotsBox.appendChild(dot);
        }
    }

    function goTo(index) {
        current = Math.max(0, Math.min(index, getMaxIndex()));
        updatePosition();
        updateDots();
    }

    // Cyklický posun – na konci se vrátí na začátek a naopak (carousel cyklí).
    function next() { goTo(current >= getMaxIndex() ? 0 : current + 1); }
    function prev() { goTo(current <= 0 ? getMaxIndex() : current - 1); }

    function startAutoPlay() {
        stopAutoPlay();
        expoTimer = setInterval(next, 5000);
    }

    function stopAutoPlay() {
        if (expoTimer) clearInterval(expoTimer);
    }

    // Šipky
    if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoPlay(); prev(); startAutoPlay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoPlay(); next(); startAutoPlay(); });

    // Dotyk / swipe
    let startX = 0;
    let isDragging = false;

    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        stopAutoPlay();
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? next() : prev();
        }
        startAutoPlay();
    }, { passive: true });

    // Klávesnice
    if (carousel) {
        carousel.setAttribute('tabindex', '0');
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft')  { stopAutoPlay(); prev(); startAutoPlay(); }
            if (e.key === 'ArrowRight') { stopAutoPlay(); next(); startAutoPlay(); }
        });
    }

    // Přepočet při změně velikosti okna; když se změní počet viditelných
    // karet (desktop ↔ mobil), přestaví se i počet teček.
    let resizeTimeout;
    let lastVisible = getVisibleCount();
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (current > getMaxIndex()) current = getMaxIndex();
            const vis = getVisibleCount();
            if (vis !== lastVisible) {
                lastVisible = vis;
                buildDots();
            }
            updatePosition();
            updateDots();
        }, 100);
    });

    // Výchozí stav – běží až po vložení karet z CSV, takže aktivní tečka sedí.
    buildDots();
    goTo(0);
    startAutoPlay();
}

/* ============================================================
   STATS COUNTER ANIMATION
   ============================================================ */
function animateCounter(el, target) {
    const duration  = 1800;
    const start     = performance.now();
    const isYear    = target > 1000; // don't animate from 0 for large numbers
    const startVal  = isYear ? target - 30 : 0;

    const step = (now) => {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease     = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current  = Math.round(startVal + (target - startVal) * ease);
        el.textContent = current.toLocaleString('cs');
        if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

function initStats() {
    const statNums = document.querySelectorAll('.stat-number[data-target]');
    if (!statNums.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el     = entry.target;
                const target = parseInt(el.dataset.target, 10);
                animateCounter(el, target);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    statNums.forEach(el => observer.observe(el));
}

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
function initReveal() {
    const elements = document.querySelectorAll('.reveal:not(.is-visible)');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    elements.forEach(el => observer.observe(el));
}

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
function initFaq() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', function () {
            const answer  = this.nextElementSibling;
            const isOpen  = this.getAttribute('aria-expanded') === 'true';

            // Close all others
            document.querySelectorAll('.faq-question[aria-expanded="true"]').forEach(other => {
                if (other !== this) {
                    other.setAttribute('aria-expanded', 'false');
                    const otherAnswer = other.nextElementSibling;
                    otherAnswer.classList.remove('open');
                    otherAnswer.style.maxHeight = '0';
                }
            });

            // Toggle current
            if (isOpen) {
                this.setAttribute('aria-expanded', 'false');
                answer.classList.remove('open');
                answer.style.maxHeight = '0';
            } else {
                this.setAttribute('aria-expanded', 'true');
                answer.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 40 + 'px';
            }
        });
    });
}

/* ============================================================
   TICKET BUILDER
   ============================================================ */

const TICKET_TYPES = [
    { value: 'Dospělý',               label: 'Dospělý',               price: 250 },
    { value: 'Senior',                label: 'Senior (65+)',           price: 120 },
    { value: 'Student / dítě',        label: 'Student / dítě',        price: 150 },
    { value: 'Rodinné',               label: 'Rodinné (2+2)',          price: 650 },
    { value: 'Komentovaná prohlídka', label: 'Komentovaná prohlídka', price: 350 },
    { value: 'ZTP',                   label: 'ZTP / ZTP/P',            price: 0   },
];

let ticketRowId = 0;

function getTypePrice(value) {
    const t = TICKET_TYPES.find(t => t.value === value);
    return t ? t.price : 0;
}

function getTypeLabel(value) {
    const t = TICKET_TYPES.find(t => t.value === value);
    return t ? t.label : value;
}

function buildTypeOptions(selectedValue) {
    return TICKET_TYPES.map(t =>
        `<option value="${t.value}"${t.value === selectedValue ? ' selected' : ''}>
            ${t.label}${t.price > 0 ? ' – ' + t.price + ' Kč' : ' – zdarma'}
        </option>`
    ).join('');
}

function refreshSummary() {
    const rows = document.querySelectorAll('.ticket-row');
    const summaryRows = document.getElementById('ticket-summary-rows');
    const totalEl     = document.getElementById('ticket-total-price');
    if (!summaryRows || !totalEl) return;

    let total = 0;
    summaryRows.innerHTML = '';

    rows.forEach(row => {
        const typeVal = row.querySelector('.ticket-row-type').value;
        const qty     = parseInt(row.querySelector('.ticket-qty-num').value, 10) || 1;
        const price   = getTypePrice(typeVal);
        const subtotal = price * qty;
        total += subtotal;

        // Update per-row price display
        row.querySelector('.ticket-row-price').textContent =
            price === 0 ? 'zdarma' : subtotal.toLocaleString('cs') + ' Kč';

        if (typeVal) {
            const line = document.createElement('div');
            line.className = 'ticket-summary-line';
            line.innerHTML = `
                <span>${qty}× ${getTypeLabel(typeVal)}</span>
                <span>${price === 0 ? 'zdarma' : subtotal.toLocaleString('cs') + ' Kč'}</span>
            `;
            summaryRows.appendChild(line);
        }
    });

    totalEl.textContent = total > 0 ? total.toLocaleString('cs') + ' Kč' : '0 Kč';

    // Update remove button disabled state
    const removeButtons = document.querySelectorAll('.ticket-row-remove');
    removeButtons.forEach(btn => {
        btn.disabled = removeButtons.length <= 1;
    });
}

function createTicketRow(typeValue) {
    const id  = ++ticketRowId;
    const row = document.createElement('div');
    row.className    = 'ticket-row';
    row.dataset.rowId = id;

    row.innerHTML = `
        <select class="ticket-row-type" name="ticket-type-${id}" aria-label="Typ vstupenky">
            <option value="">Vyberte typ</option>
            ${buildTypeOptions(typeValue || '')}
        </select>

        <div class="ticket-qty-wrap">
            <button type="button" class="ticket-qty-btn ticket-qty-minus" aria-label="Snížit počet">−</button>
            <input
                type="number"
                class="ticket-qty-num"
                name="ticket-qty-${id}"
                value="1"
                min="1"
                max="20"
                aria-label="Počet vstupenek"
            >
            <button type="button" class="ticket-qty-btn ticket-qty-plus" aria-label="Zvýšit počet">+</button>
        </div>

        <span class="ticket-row-price">—</span>

        <button type="button" class="ticket-row-remove" aria-label="Odebrat řádek">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Type change
    row.querySelector('.ticket-row-type').addEventListener('change', refreshSummary);

    // Qty stepper
    const qtyInput = row.querySelector('.ticket-qty-num');

    row.querySelector('.ticket-qty-minus').addEventListener('click', () => {
        const v = parseInt(qtyInput.value, 10);
        if (v > 1) { qtyInput.value = v - 1; refreshSummary(); }
    });

    row.querySelector('.ticket-qty-plus').addEventListener('click', () => {
        const v = parseInt(qtyInput.value, 10);
        if (v < 20) { qtyInput.value = v + 1; refreshSummary(); }
    });

    qtyInput.addEventListener('change', () => {
        let v = parseInt(qtyInput.value, 10);
        if (isNaN(v) || v < 1)  v = 1;
        if (v > 20)              v = 20;
        qtyInput.value = v;
        refreshSummary();
    });

    // Remove button
    row.querySelector('.ticket-row-remove').addEventListener('click', () => {
        const allRows = document.querySelectorAll('.ticket-row');
        if (allRows.length <= 1) return; // keep at least one row

        row.style.opacity  = '0';
        row.style.transform = 'translateY(-4px)';
        row.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        setTimeout(() => {
            row.remove();
            refreshSummary();
        }, 200);
    });

    return row;
}

function initTicketBuilder() {
    const container = document.getElementById('ticket-rows');
    const addBtn    = document.getElementById('ticket-add-btn');
    if (!container || !addBtn) return;

    // Start with one empty row
    container.appendChild(createTicketRow(''));
    refreshSummary();

    // Add row on click
    addBtn.addEventListener('click', () => {
        container.appendChild(createTicketRow(''));
        refreshSummary();

        // Scroll the new row into view nicely
        container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

/* ============================================================
   RESERVATION FORM
   ============================================================ */
function initReservationForm() {
    const form      = document.getElementById('reservation-form');
    const status    = document.getElementById('reservation-status');
    const dateInput = document.getElementById('visit-date');
    if (!form || !status || !dateInput) return;

    // Set minimum date to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateInput.min = today.toISOString().split('T')[0];

    form.addEventListener('submit', event => {
        event.preventDefault();
        status.className   = 'form-status';
        status.textContent = '';

        const builder = document.querySelector('.ticket-builder');

        // Validate basic fields
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            status.textContent = 'Zkontrolujte prosím všechna povinná pole.';
            status.classList.add('is-error');
            return;
        }

        // Validate that all ticket rows have a type selected
        const rows = document.querySelectorAll('.ticket-row');
        let ticketValid = true;
        rows.forEach(row => {
            if (!row.querySelector('.ticket-row-type').value) ticketValid = false;
        });

        if (!ticketValid) {
            if (builder) builder.classList.add('has-error');
            status.textContent = 'Vyberte prosím typ u každé vstupenky.';
            status.classList.add('is-error');
            return;
        }

        if (builder) builder.classList.remove('has-error');

        // Build ticket summary string
        const data = new FormData(form);
        const ticketLines = [];
        let totalPeople = 0;

        rows.forEach(row => {
            const typeVal = row.querySelector('.ticket-row-type').value;
            const qty     = parseInt(row.querySelector('.ticket-qty-num').value, 10) || 1;
            const price   = getTypePrice(typeVal);
            totalPeople  += qty;
            ticketLines.push(`${qty}× ${getTypeLabel(typeVal)} (${price === 0 ? 'zdarma' : price * qty + ' Kč'})`);
        });

        const totalEl    = document.getElementById('ticket-total-price');
        const totalPrice = totalEl ? totalEl.textContent : '';

        status.textContent = `✓ Rezervace přijata: ${data.get('visit-date')} v ${data.get('visit-time')}, ${totalPeople} os. — ${ticketLines.join(', ')} — celkem ${totalPrice}. Potvrzení zašleme na ${data.get('email')}.`;
        status.classList.add('is-success');

        // Reset form and ticket builder
        form.reset();
        form.classList.remove('was-validated');
        dateInput.min = today.toISOString().split('T')[0];

        const container = document.getElementById('ticket-rows');
        if (container) {
            container.innerHTML = '';
            container.appendChild(createTicketRow(''));
            refreshSummary();
        }
    });

    // Clear error state when user fixes tickets
    form.addEventListener('change', () => {
        const builder = document.querySelector('.ticket-builder');
        if (builder) builder.classList.remove('has-error');
    });
}

/* ============================================================
   INIT ALL
   ============================================================ */
function initPage() {
    initNavbar();
    initHeroSlider();
    initCountdown();
    loadExhibitions();  // also calls initExpoCarousel() after CSV loads
    initStats();
    initReveal();
    initFaq();
    initTicketBuilder();
    initReservationForm();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}
