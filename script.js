/* ==========================================================
   PondPhuwin | A Sky Full of Us
   ========================================================== */
(() => {
    "use strict";

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Safe storage (can fail in private mode) */
    const store = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : JSON.parse(v);
            } catch { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
        }
    };

    /* ---------- Day / night theme ---------- */
    const root = document.documentElement;
    const themeToggle = $("#themeToggle");
    const themeMeta = $('meta[name="theme-color"]');

    function setTheme(theme, save = true) {
        root.dataset.theme = theme;
        const night = theme === "night";
        themeToggle.setAttribute("aria-pressed", String(night));
        themeToggle.setAttribute("aria-label", night ? "Switch to day sky" : "Switch to night sky");
        if (themeMeta) themeMeta.content = night ? "#17122a" : "#fff8f2";
        if (save) store.set("pp-theme", theme);
    }

    const savedTheme = store.get("pp-theme", null);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme || (prefersDark ? "night" : "day"), false);

    themeToggle.addEventListener("click", () => {
        setTheme(root.dataset.theme === "night" ? "day" : "night");
    });

    /* ---------- Header: scroll state + mobile menu + active link ---------- */
    const header = $("#siteHeader");
    const menuToggle = $("#menuToggle");
    const navLinks = $("#navLinks");

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    function setMenu(open) {
        navLinks.classList.toggle("open", open);
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    menuToggle.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
    $$("a", navLinks).forEach(a => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

    const sections = ["home", "wishes", "memories", "letter"].map(id => document.getElementById(id));
    const linkFor = id => $(`.nav-links a[href="#${id}"]`);

    const navObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            $$(".nav-links a").forEach(a => a.classList.remove("is-active"));
            linkFor(entry.target.id)?.classList.add("is-active");
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => s && navObserver.observe(s));

    /* ---------- Image fallbacks ---------- */
    function markImage(img) {
        const holder = img.closest("[data-initial]");
        if (!holder) return;
        holder.classList.toggle("has-image", img.complete && img.naturalWidth > 0);
        holder.classList.toggle("no-photo", img.complete && img.naturalWidth === 0);
    }

    $$("img[data-fallback]").forEach(img => {
        markImage(img);
        img.addEventListener("load", () => markImage(img));
        img.addEventListener("error", () => {
            const holder = img.closest("[data-initial]");
            holder?.classList.remove("has-image");
            holder?.classList.add("no-photo");
        });
    });

    /* ---------- Floating magic ---------- */
    const sky = $("#sky");
    const magicalObjects = ["🌸", "🌷", "🌼", "💮", "🦋", "♡", "💗", "✨", "⭐", "☁️", "🌙", "✿"];
    const MAX_OBJECTS = 90;

    function sprinkle(amount = 14) {
        if (reduceMotion) amount = Math.min(amount, 5);

        for (let i = 0; i < amount; i++) {
            setTimeout(() => {
                if (sky.childElementCount > MAX_OBJECTS) return;

                const el = document.createElement("span");
                el.className = "sky-object";
                el.textContent = magicalObjects[Math.floor(Math.random() * magicalObjects.length)];
                el.style.left = Math.random() * 96 + "%";
                el.style.fontSize = 16 + Math.random() * 26 + "px";
                el.style.setProperty("--duration", 5 + Math.random() * 5 + "s");
                el.style.setProperty("--drift", (Math.random() * 80 - 40) + "px");
                sky.appendChild(el);
                el.addEventListener("animationend", () => el.remove(), { once: true });
            }, i * 90);
        }
    }

    /* ---------- Wishes ---------- */
    const wishCountEls = [$("#wishCount"), $("#heroWishCount")];
    const wishMessage = $("#wishMessage");
    const wishForm = $("#wishForm");
    const wishInput = $("#wishInput");
    const wishError = $("#wishError");
    const charCount = $("#charCount");
    const wishSky = $("#wishSky");
    const wishEmpty = $("#wishEmpty");
    const clearBtn = $("#clearWishes");

    const messages = [
        "A little flower for a beautiful memory. 🌸",
        "May this little universe always hold kindness. 🦋",
        "Another wish joins the stars. ✨",
        "Sending a little happiness into the sky. 🌷",
        "Some memories deserve their own universe. ♡",
        "May every new chapter bring something beautiful. 🌼",
        "A little magic, just because. 💗",
        "The sky looks a little brighter now. ⭐"
    ];
    const randomMessage = () => messages[Math.floor(Math.random() * messages.length)];

    let totalWishes = store.get("pp-count", 0);
    let wishes = store.get("pp-wishes", []);
    if (!Array.isArray(wishes)) wishes = [];

    function renderCount() {
        wishCountEls.forEach(el => { if (el) el.textContent = totalWishes; });
    }

    function addStar(wish, animate = true) {
        const star = document.createElement("button");
        star.type = "button";
        star.className = "wish-star";
        star.textContent = "✦";
        star.style.left = wish.x + "%";
        star.style.top = wish.y + "%";
        star.style.setProperty("--delay", (Math.random() * 2).toFixed(2) + "s");
        if (!animate) star.style.animationDuration = "0s, 3s";

        const text = document.createElement("span");
        text.className = "wish-star__text";
        text.textContent = wish.text; // textContent keeps user input safe
        star.appendChild(text);

        star.addEventListener("click", () => {
            $$(".wish-star.is-open").forEach(s => { if (s !== star) s.classList.remove("is-open"); });
            star.classList.toggle("is-open");
        });

        wishSky.appendChild(star);
    }

    function renderSky(animateIndex = -1) {
        $$(".wish-star", wishSky).forEach(s => s.remove());
        wishes.forEach((w, i) => addStar(w, i === animateIndex));
        wishEmpty.hidden = wishes.length > 0;
        clearBtn.hidden = wishes.length === 0;
    }

    function registerWish() {
        totalWishes++;
        store.set("pp-count", totalWishes);
        renderCount();
        wishMessage.textContent = randomMessage();
    }

    function randomSpot() {
        // keep stars away from the edges so their notes stay visible
        for (let attempt = 0; attempt < 12; attempt++) {
            const x = 12 + Math.random() * 76;
            const y = 18 + Math.random() * 66;
            const crowded = wishes.some(w => Math.hypot(w.x - x, w.y - y) < 11);
            if (!crowded) return { x, y };
        }
        return { x: 12 + Math.random() * 76, y: 18 + Math.random() * 66 };
    }

    wishInput.addEventListener("input", () => {
        charCount.textContent = `${wishInput.value.length} / ${wishInput.maxLength}`;
        wishError.textContent = "";
    });

    wishForm.addEventListener("submit", e => {
        e.preventDefault();
        const text = wishInput.value.trim();

        if (!text) {
            wishError.textContent = "Write a few words first.";
            wishInput.focus();
            return;
        }

        const wish = { text, ...randomSpot() };
        wishes.push(wish);
        if (wishes.length > 24) wishes.shift();
        store.set("pp-wishes", wishes);

        renderSky(wishes.length - 1); // only the new star animates in

        registerWish();
        sprinkle(16);

        wishInput.value = "";
        charCount.textContent = `0 / ${wishInput.maxLength}`;
    });

    $("#wishButton").addEventListener("click", () => {
        registerWish();
        sprinkle(18);
    });

    $("#heroWish").addEventListener("click", () => {
        registerWish();
        sprinkle(14);
        $("#wishes").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });

    clearBtn.addEventListener("click", () => {
        wishes = [];
        store.set("pp-wishes", wishes);
        renderSky();
        wishMessage.textContent = "The sky is clear and ready for new wishes.";
    });

    document.addEventListener("click", e => {
        if (!e.target.closest(".wish-star")) {
            $$(".wish-star.is-open").forEach(s => s.classList.remove("is-open"));
        }
    });

    renderCount();
    renderSky();

    /* ---------- Gallery: tilt, reveal, lightbox ---------- */
    $$(".memory-card").forEach(card => {
        card.style.setProperty("--tilt", card.dataset.tilt || 0);
        card.classList.add("reveal");
    });

    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    $$(".memory-card").forEach(c => revealObserver.observe(c));

    const lightbox = $("#lightbox");
    const lightboxImg = $("#lightboxImg");
    const lightboxPhoto = $("#lightboxPhoto");
    let lastTrigger = null;

    $$(".memory-card__open").forEach(btn => {
        btn.addEventListener("click", () => {
            lastTrigger = btn;
            const img = $("img", btn);

            $("#lightboxTitle").textContent = btn.dataset.title;
            $("#lightboxText").textContent = btn.dataset.caption;

            lightboxPhoto.dataset.initial = $(".memory-card__photo", btn).dataset.initial;
            lightboxPhoto.classList.remove("has-image", "no-photo");

            if (img.complete && img.naturalWidth > 0) {
                lightboxImg.src = img.currentSrc || img.src;
                lightboxImg.alt = img.alt;
                lightboxPhoto.classList.add("has-image");
            } else {
                lightboxImg.removeAttribute("src");
                lightboxPhoto.classList.add("no-photo");
            }

            lightbox.showModal();
            sprinkle(6);
        });
    });

    function closeLightbox() { lightbox.close(); }
    $("#lightboxClose").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
    lightbox.addEventListener("close", () => lastTrigger?.focus());

    /* ---------- Letter ---------- */
    const envelope = $("#envelope");
    const hint = $(".envelope__hint", envelope);

    envelope.addEventListener("click", () => {
        const open = envelope.getAttribute("aria-expanded") !== "true";
        envelope.setAttribute("aria-expanded", String(open));
        hint.textContent = open ? "" : "Open the letter";
        if (open) sprinkle(8);
    });

    const surpriseButton = $("#surpriseButton");
    const surpriseMessage = $("#surpriseMessage");

    surpriseButton.addEventListener("click", () => {
        const show = surpriseMessage.hidden;
        surpriseMessage.hidden = !show;
        surpriseButton.setAttribute("aria-expanded", String(show));
        surpriseButton.textContent = show ? "Keep this little wish ♡" : "Open your little surprise ♡";
        if (show) sprinkle(12);
    });

    /* ---------- Sparkle trail (mouse only) ---------- */
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (finePointer && !reduceMotion) {
        const trail = $("#trail");
        const glyphs = ["✦", "✧", "♡", "✿"];
        let last = 0;

        window.addEventListener("pointermove", e => {
            const now = performance.now();
            if (now - last < 70) return;
            last = now;

            const dot = document.createElement("span");
            dot.className = "trail-dot";
            dot.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
            dot.style.left = e.clientX + "px";
            dot.style.top = e.clientY + "px";
            dot.style.fontSize = 9 + Math.random() * 9 + "px";
            trail.appendChild(dot);
            dot.addEventListener("animationend", () => dot.remove(), { once: true });
        }, { passive: true });
    }
})();
