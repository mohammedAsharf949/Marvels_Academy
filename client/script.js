// Mobile Navigation Toggle
const hamburger =
  document.querySelector(".hamburger") ||
  document.querySelector(".ped-hamburger");
const navMenu =
  document.querySelector(".nav-menu") ||
  document.querySelector(".ped-nav-menu");

if (hamburger && navMenu) {
  hamburger.addEventListener("click", () => {
    navMenu.classList.toggle("active");
    hamburger.classList.toggle("active");
  });
}

// Close mobile menu when clicking on a link
document.querySelectorAll(".nav-link").forEach((n) =>
  n.addEventListener("click", () => {
    if (hamburger) hamburger.classList.remove("active");
    if (navMenu) navMenu.classList.remove("active");
  }),
);

// Smooth scrolling for navigation links
const links = document.querySelectorAll('a[href^="#"]');
for (const link of links) {
  link.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      if (navMenu && navMenu.classList.contains("active")) {
        navMenu.classList.remove("active");
      }
    }
  });
}

// Header background change on scroll
window.addEventListener("scroll", () => {
  const header = document.querySelector(".header");
  if (!header) return;
  if (window.scrollY > 100) {
    header.style.background = "rgba(255, 255, 255, 0.98)";
    header.style.boxShadow = "0 2px 20px rgba(0, 0, 0, 0.1)";
  } else {
    header.style.background = "rgba(255, 255, 255, 0.95)";
    header.style.boxShadow = "none";
  }
});

(() => {
  const rootId = "marvels-ai-widget-root";
  const tokenStorageKey = "marvels_token";
  const savedRoot = document.getElementById(rootId);
  if (savedRoot) return;

  function getApiOrigin() {
    // During production build, Vite replaces import.meta.env
    if (
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_URL
    ) {
      return import.meta.env.VITE_API_URL;
    }
    // Fallback to window config or localhost for development
    if (window.MARVELS_CONFIG && window.MARVELS_CONFIG.API_URL) {
      return window.MARVELS_CONFIG.API_URL;
    }
    const isFile = window.location.protocol === "file:";
    const host = String(window.location.hostname || "").toLowerCase();
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    const port = String(window.location.port || "");
    if (isFile) return "http://localhost:3000";
    if (isLocal && port && port !== "3000") return "http://localhost:3000";
    return window.location.origin;
  }

  function loadScriptOnce(id, src) {
    return new Promise((resolve, reject) => {
      if (id && document.getElementById(id)) return resolve();
      const s = document.createElement("script");
      if (id) s.id = id;
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("load_failed"));
      document.head.appendChild(s);
    });
  }

  function ensureTailwind() {
    if (window.tailwind && document.getElementById("marvels-tailwind")) {
      return Promise.resolve();
    }
    window.tailwind = {
      config: {
        darkMode: "class",
        corePlugins: { preflight: false },
      },
    };
    return loadScriptOnce(
      "marvels-tailwind",
      "https://cdn.tailwindcss.com?plugins=forms",
    );
  }

  async function ensureReactStack() {
    if (!window.React) {
      await loadScriptOnce(
        "marvels-react",
        "https://unpkg.com/react@18/umd/react.production.min.js",
      );
    }
    if (!window.ReactDOM) {
      await loadScriptOnce(
        "marvels-react-dom",
        "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
      );
    }
    if (!window.io) {
      await loadScriptOnce(
        "marvels-sio-client",
        "https://cdn.socket.io/4.8.1/socket.io.min.js",
      );
    }
  }

  function getContextSummary() {
    const parts = [];
    const role = document.body?.dataset?.role || "guest";
    const gradeId = document.body?.dataset?.gradeId || "";
    parts.push(`role=${role}`);
    if (gradeId) parts.push(`gradeId=${gradeId}`);
    parts.push(`page=${window.location.pathname || ""}`);
    if (document.title) parts.push(`title=${document.title}`);

    const path = String(window.location.pathname || "").toLowerCase();
    if (path.includes("live")) {
      const room =
        document.getElementById("selectedRoomTitle")?.textContent || "";
      if (room && room.toLowerCase() !== "select a room") {
        parts.push(`selectedRoom=${room}`);
      }
    }
    if (path.includes("recorded")) {
      const unit =
        document.getElementById("playerSessionTitle")?.textContent || "";
      const lesson =
        document.getElementById("playerLessonName")?.textContent || "";
      if (unit && unit.toLowerCase() !== "select a session")
        parts.push(`unit=${unit}`);
      if (lesson) parts.push(`lesson=${lesson}`);
    }
    return parts.join(" | ");
  }

  function mountWidget() {
    const container = document.createElement("div");
    container.id = rootId;
    container.style.position = "fixed";
    container.style.left = "0";
    container.style.top = "0";
    container.style.zIndex = "999999";
    container.style.pointerEvents = "auto";
    document.body.appendChild(container);

    const e = window.React.createElement;
    const { useEffect, useMemo, useRef, useState } = window.React;

    function Widget() {
      const apiOrigin = useMemo(() => getApiOrigin(), []);
      const [open, setOpen] = useState(false);
      const [dark, setDark] = useState(false);
      const [speak, setSpeak] = useState(false);
      const [connected, setConnected] = useState(false);
      const [input, setInput] = useState("");
      const [messages, setMessages] = useState([]);

      const socketRef = useRef(null);
      const scrollRef = useRef(null);
      const recognitionRef = useRef(null);
      const [listening, setListening] = useState(false);

      useEffect(() => {
        if (socketRef.current) return;
        const token = localStorage.getItem(tokenStorageKey) || "";
        const socket = window.io(apiOrigin, {
          transports: ["websocket", "polling"],
          auth: { token },
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          setConnected(true);
          socket.emit("ai:init", { pagePath: window.location.pathname || "/" });
        });
        socket.on("disconnect", () => setConnected(false));
        socket.on("ai:history", (payload) => {
          const list = Array.isArray(payload?.messages) ? payload.messages : [];
          setMessages(
            list.map((m) => ({
              id: m.id || String(Math.random()),
              sender: m.sender || "assistant",
              content: String(m.content || ""),
              createdAt: m.createdAt || null,
            })),
          );
        });
        socket.on("ai:message", (payload) => {
          const msg = {
            id: payload?.id || String(Math.random()),
            sender: payload?.sender || "assistant",
            content: String(payload?.content || ""),
            createdAt: payload?.createdAt || null,
          };
          setMessages((prev) => [...prev, msg]);
          if (speak && msg.sender === "assistant") {
            try {
              const u = new SpeechSynthesisUtterance(msg.content);
              u.rate = 1;
              u.pitch = 1;
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(u);
            } catch {}
          }
        });

        return () => {
          try {
            socket.disconnect();
          } catch {}
        };
      }, [apiOrigin, speak]);

      useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, [messages, open]);

      function send() {
        const text = String(input || "").trim();
        if (!text) return;
        setInput("");
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()) + "-u",
            sender: "user",
            content: text,
            createdAt: new Date().toISOString(),
          },
        ]);
        const socket = socketRef.current;
        if (!socket) return;
        socket.emit("ai:message", {
          text,
          pagePath: window.location.pathname || "/",
          contextSummary: getContextSummary(),
        });
      }

      function startListening() {
        const SR =
          window.SpeechRecognition || window.webkitSpeechRecognition || null;
        if (!SR) return;
        if (!recognitionRef.current) {
          const rec = new SR();
          const pageLang = String(
            document.documentElement?.lang || document.body?.lang || "",
          ).toLowerCase();
          const navLang = String(navigator.language || "").toLowerCase();
          const preferArabic =
            pageLang.startsWith("ar") || navLang.startsWith("ar");
          rec.lang = preferArabic ? "ar-EG" : "en-US";
          rec.interimResults = false;
          rec.maxAlternatives = 1;
          rec.onresult = (event) => {
            const t = event.results?.[0]?.[0]?.transcript || "";
            if (t) setInput((prev) => (prev ? prev + " " + t : t));
          };
          rec.onend = () => setListening(false);
          rec.onerror = () => setListening(false);
          recognitionRef.current = rec;
        }
        try {
          setListening(true);
          recognitionRef.current.start();
        } catch {
          setListening(false);
        }
      }

      function stopListening() {
        try {
          recognitionRef.current?.stop();
        } catch {}
        setListening(false);
      }

      const isMobile = window.matchMedia("(max-width: 640px)").matches;

      return e(
        "div",
        {
          className: dark ? "dark" : "",
          style: {
            position: "fixed",
            right: "calc(16px + env(safe-area-inset-right, 0px))",
            bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
            pointerEvents: "auto",
            fontFamily: '"Inter", Arial, sans-serif',
          },
        },
        e(
          "div",
          {
            className:
              "absolute bottom-16 right-0 w-[380px] max-w-[92vw] " +
              (open
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3 pointer-events-none") +
              " transition-all duration-200 ease-out",
          },
          e(
            "div",
            {
              className:
                "rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-[0_20px_60px_rgba(2,38,97,0.35)] overflow-hidden",
              style: { width: isMobile ? "min(92vw, 420px)" : undefined },
            },
            e(
              "div",
              {
                className:
                  "px-4 py-3 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#041842] to-[#022661] text-white",
              },
              e(
                "div",
                { className: "flex items-center gap-2" },
                e(
                  "div",
                  {
                    className:
                      "w-8 h-8 rounded-full bg-white/15 ring-1 ring-white/20 flex items-center justify-center font-extrabold",
                  },
                  "M",
                ),
                e(
                  "div",
                  null,
                  e(
                    "div",
                    {
                      className: "font-extrabold leading-tight",
                    },
                    "Marvels Academy Assistant",
                  ),
                  e(
                    "div",
                    {
                      className: "text-xs font-semibold text-white/80",
                    },
                    e(
                      "span",
                      { className: "inline-flex items-center gap-2" },
                      e("span", {
                        className:
                          "inline-block w-2 h-2 rounded-full " +
                          (connected ? "bg-emerald-400" : "bg-rose-300"),
                      }),
                      connected ? "Connected" : "Disconnected",
                    ),
                  ),
                ),
              ),
              e("div", { className: "flex items-center gap-2" }),
            ),
            e(
              "div",
              {
                ref: scrollRef,
                className:
                  "px-4 py-3 h-[60vh] max-h-[420px] overflow-auto bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-950",
              },
              messages.length
                ? messages.map((m) =>
                    e(
                      "div",
                      { key: m.id, className: "mb-3" },
                      e(
                        "div",
                        {
                          className:
                            (m.sender === "user"
                              ? "ml-auto bg-gradient-to-r from-[#041842] to-[#022661] text-white"
                              : "mr-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/70 dark:border-slate-800") +
                            " max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                        },
                        m.content,
                      ),
                    ),
                  )
                : e(
                    "div",
                    {
                      className:
                        "text-sm text-slate-500 dark:text-slate-400 text-center py-8",
                    },
                    e("i", {
                      className: "fas fa-robot text-3xl mb-3 block opacity-20",
                    }),
                    "Ask me anything about your homework, lessons, or quizzes. I'm here to help!",
                  ),
            ),
            e(
              "div",
              {
                className:
                  "p-3 border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950",
              },
              e(
                "div",
                { className: "flex items-end gap-2" },
                e("textarea", {
                  value: input,
                  onChange: (ev) => setInput(ev.target.value),
                  onKeyDown: (ev) => {
                    if (ev.key === "Enter" && !ev.shiftKey) {
                      ev.preventDefault();
                      send();
                    }
                  },
                  placeholder: "Type your message...",
                  className:
                    "flex-1 resize-none min-h-[44px] max-h-[120px] rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#022661] transition-all",
                }),
                e(
                  "button",
                  {
                    type: "button",
                    className:
                      "w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-[#022661] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all",
                    onClick: () => {
                      if (listening) stopListening();
                      else startListening();
                    },
                    disabled: !(
                      window.SpeechRecognition || window.webkitSpeechRecognition
                    ),
                  },
                  e("i", {
                    className: listening
                      ? "fas fa-stop text-red-500 animate-pulse"
                      : "fas fa-microphone",
                  }),
                ),
                e(
                  "button",
                  {
                    type: "button",
                    className:
                      "w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#041842] to-[#022661] text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all",
                    onClick: send,
                  },
                  e("i", { className: "fas fa-paper-plane" }),
                ),
              ),
              e(
                "div",
                {
                  className:
                    "mt-2 text-[10px] text-slate-400 dark:text-slate-500 text-center",
                },
                "Tip: Shift+Enter for a new line",
              ),
            ),
          ),
        ),
        e(
          "button",
          {
            type: "button",
            className:
              "w-14 h-14 rounded-full bg-gradient-to-br from-[#041842] to-[#022661] shadow-[0_12px_40px_rgba(2,38,97,0.45)] text-white flex items-center justify-center select-none ring-4 ring-white/10 hover:scale-110 active:scale-90 transition-all duration-300 group",
            onClick: () => setOpen((v) => !v),
          },
          open
            ? e("i", { className: "fas fa-times text-xl" })
            : e("img", {
                src: "./site/White_Black_Monogram_M_Business_Logo___1000_x_500_px_-removebg-preview.png",
                className: "w-10 h-10 object-contain brightness-0 invert",
                alt: "M",
              }),
        ),
      );
    }

    window.ReactDOM.createRoot(container).render(e(Widget));
  }

  async function init() {
    try {
      await ensureTailwind();
      await ensureReactStack();
      mountWidget();
    } catch {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

(() => {
  const state = { user: null, loaded: false };
  const tokenStorageKey = "marvels_token";

  function getApiOrigin() {
    // During production build, Vite replaces import.meta.env
    if (
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_URL
    ) {
      return import.meta.env.VITE_API_URL;
    }
    // Fallback to window config or localhost for development
    if (window.MARVELS_CONFIG && window.MARVELS_CONFIG.API_URL) {
      return window.MARVELS_CONFIG.API_URL;
    }
    const isFile = window.location.protocol === "file:";
    const host = String(window.location.hostname || "").toLowerCase();
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    const port = String(window.location.port || "");
    if (isFile) return "http://localhost:3000";
    if (isLocal && port && port !== "3000") return "http://localhost:3000";
    return window.location.origin;
  }

  const defaultApiOrigin = getApiOrigin();

  function setDisabled(el, disabled) {
    if (!el) return;
    if (!disabled) {
      el.classList.remove("is-disabled");
      el.removeAttribute("aria-disabled");
      el.removeAttribute("tabindex");
      return;
    }
    el.classList.add("is-disabled");
    el.setAttribute("aria-disabled", "true");
    el.setAttribute("tabindex", "-1");
  }

  async function apiFetch(url, options = {}) {
    const savedToken = localStorage.getItem(tokenStorageKey);
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (savedToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${savedToken}`);
    }

    let targetUrl = url;
    if (typeof url === "string" && url.startsWith("/")) {
      targetUrl = `${defaultApiOrigin}${url}`;
    }

    const res = await fetch(targetUrl, {
      ...options,
      headers,
      credentials: "include",
    });
    return res;
  }

  async function fetchMe() {
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) {
        if (res.status === 401) localStorage.removeItem(tokenStorageKey);
        return null;
      }
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  function canAccessManage(role) {
    return role === "administrator";
  }

  function canAccessRecorded(role) {
    return role === "administrator" || role === "recorded_student";
  }

  function applyNav(user) {
    const role = user?.role || "guest";

    const manageLink = document.querySelector('[data-nav="manage"]');
    setDisabled(manageLink, !canAccessManage(role));

    const recordedLink = document.querySelector('[data-nav="recorded"]');
    setDisabled(recordedLink, !canAccessRecorded(role));

    const authLink = document.querySelector('[data-nav="auth"]');
    if (authLink) {
      authLink.replaceWith(authLink.cloneNode(true));
    }

    const freshAuthLink = document.querySelector('[data-nav="auth"]');
    if (!freshAuthLink) return;

    if (!user) {
      freshAuthLink.textContent = "Login";
      freshAuthLink.setAttribute("href", "login.html");
      setDisabled(freshAuthLink, false);
      return;
    }

    freshAuthLink.textContent = "Logout";
    freshAuthLink.setAttribute("href", "#");
    setDisabled(freshAuthLink, false);
    freshAuthLink.addEventListener("click", async (e) => {
      e.preventDefault();
      await apiFetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem(tokenStorageKey);
      window.location.href = "index.html";
    });
  }

  window.MarvelsPlatform = {
    apiFetch,
    getUser: () => state.user,
    setToken: (token) => {
      if (!token) return;
      localStorage.setItem(tokenStorageKey, String(token));
    },
    clearToken: () => localStorage.removeItem(tokenStorageKey),
    whenReady: async () => {
      if (state.loaded) return state.user;
      state.user = await fetchMe();
      state.loaded = true;
      return state.user;
    },
  };

  document.addEventListener("DOMContentLoaded", async () => {
    state.user = await fetchMe();
    state.loaded = true;
    const role = state.user?.role || "guest";
    document.body.dataset.role = role;
    document.body.dataset.gradeId = state.user?.gradeId || "";

    const path = (window.location.pathname || "").toLowerCase();
    const isOnSetPassword =
      path.endsWith("/set-password.html") ||
      path.endsWith("\\set-password.html");
    const isOnLogin =
      path.endsWith("/login.html") || path.endsWith("\\login.html");

    if (state.user?.pwdNeedsReset && !isOnSetPassword) {
      window.location.href = "set-password.html";
      return;
    }

    if (!state.user && isOnSetPassword) {
      window.location.href = "login.html";
      return;
    }

    applyNav(state.user);

    window.dispatchEvent(
      new CustomEvent("auth:ready", { detail: { user: state.user } }),
    );
  });
})();

// Intersection Observer for animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe elements for animation
document.addEventListener("DOMContentLoaded", () => {
  const animatedElements = document.querySelectorAll(
    ".about-card, .rating-card, .service-card, .stat-item",
  );

  animatedElements.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
});

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);

  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = target.toLocaleString();
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start).toLocaleString();
    }
  }, 16);
}

// Animate stats when they come into view
const statsObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const statItems = entry.target.querySelectorAll(".stat-item h3");
        statItems.forEach((item) => {
          const text = item.textContent;
          const number = parseInt(text.replace(/[^\d]/g, ""));
          if (number) {
            animateCounter(item, number);
          }
        });
        statsObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 },
);

document.addEventListener("DOMContentLoaded", () => {
  const statsSection = document.querySelector(".stats");
  if (statsSection) {
    statsObserver.observe(statsSection);
  }
});

// Initialize floating formulas
document.addEventListener("DOMContentLoaded", () => {
  // Service card hover effects
  const serviceCards = document.querySelectorAll(".service-card");

  serviceCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-15px) scale(1.02)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0) scale(1)";
    });
  });
});

// Rating card interaction
document.addEventListener("DOMContentLoaded", () => {
  const ratingCards = document.querySelectorAll(".rating-card");

  ratingCards.forEach((card) => {
    card.addEventListener("click", () => {
      // Add a subtle click effect
      card.style.transform = "scale(0.98)";
      setTimeout(() => {
        card.style.transform = "translateY(-5px)";
      }, 150);
    });
  });
});

// Form validation (if forms are added later)
function validateForm(form) {
  const inputs = form.querySelectorAll("input[required], textarea[required]");
  let isValid = true;

  inputs.forEach((input) => {
    if (!input.value.trim()) {
      input.style.borderColor = "#ef4444";
      isValid = false;
    } else {
      input.style.borderColor = "#10b981";
    }
  });

  return isValid;
}

// Add loading animation
window.addEventListener("load", () => {
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 0.5s ease";

  setTimeout(() => {
    document.body.style.opacity = "1";
  }, 100);
});

// Parallax effect for hero section
window.addEventListener("scroll", () => {
  const scrolled = window.pageYOffset;
  const hero = document.querySelector(".hero");
  const mathAnimation = document.querySelector(".math-animation");

  if (hero && mathAnimation) {
    const rate = scrolled * -0.5;
    mathAnimation.style.transform = `translateY(${rate}px)`;
  }
});

// Dynamic content loading simulation
function simulateContentLoading() {
  const loadingElements = document.querySelectorAll(
    ".service-card, .rating-card",
  );

  loadingElements.forEach((element, index) => {
    element.style.opacity = "0";
    element.style.transform = "translateY(30px)";

    setTimeout(() => {
      element.style.transition = "all 0.6s ease";
      element.style.opacity = "1";
      element.style.transform = "translateY(0)";
    }, index * 200);
  });
}

// Initialize content loading animation
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(simulateContentLoading, 500);
});

// Add keyboard navigation support
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Close mobile menu on escape
    if (hamburger) hamburger.classList.remove("active");
    if (navMenu) navMenu.classList.remove("active");
  }
});

// Add touch support for mobile devices
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener("touchstart", (e) => {
  touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener("touchend", (e) => {
  touchEndY = e.changedTouches[0].screenY;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartY - touchEndY;

  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // Swipe up - could trigger some action
      console.log("Swipe up detected");
    } else {
      // Swipe down - could trigger some action
      console.log("Swipe down detected");
    }
  }
}

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Apply debouncing to scroll events
const debouncedScrollHandler = debounce(() => {
  // Scroll-based animations and effects
}, 16);

window.addEventListener("scroll", debouncedScrollHandler);

// Add accessibility improvements
document.addEventListener("DOMContentLoaded", () => {
  // Add focus indicators for keyboard navigation
  const focusableElements = document.querySelectorAll(
    "a, button, input, textarea, select",
  );

  focusableElements.forEach((element) => {
    element.addEventListener("focus", () => {
      element.style.outline = "2px solid #2563eb";
      element.style.outlineOffset = "2px";
    });

    element.addEventListener("blur", () => {
      element.style.outline = "none";
    });
  });
});

// Console welcome message
console.log(`
🎓 Welcome to MathMaster Pro! 
📚 Your journey to mathematical excellence starts here.
🚀 Built with modern web technologies for the best learning experience.
`);

// Worksheets filter functionality
if (window.location.pathname.includes("worksheets.html")) {
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".filters-form");
    const gradeSelect = form.querySelector('select[name="grade"]');
    const searchInput = form.querySelector(".filter-search");
    const worksheetCards = document.querySelectorAll(".worksheet-card");

    // Helper to get grade from card
    function getCardGrade(card) {
      const text = card.querySelector("p").textContent;
      const match = text.match(/Grade\s([A-Za-z0-9]+)/);
      return match ? match[1].toLowerCase() : "";
    }

    // Helper to get title from card
    function getCardTitle(card) {
      return card.querySelector("h3").textContent.toLowerCase();
    }

    function filterWorksheets(e) {
      if (e) e.preventDefault();
      const selectedGrade = gradeSelect.value;
      const searchTerm = searchInput.value.trim().toLowerCase();

      worksheetCards.forEach((card) => {
        const cardGrade = getCardGrade(card);
        const cardTitle = getCardTitle(card);
        let gradeMatch =
          !selectedGrade ||
          (selectedGrade === "k"
            ? cardGrade === "kindergarten"
            : cardGrade === selectedGrade);
        let searchMatch = !searchTerm || cardTitle.includes(searchTerm);
        if (gradeMatch && searchMatch) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    }

    form.addEventListener("submit", filterWorksheets);
    gradeSelect.addEventListener("change", filterWorksheets);
    searchInput.addEventListener("input", filterWorksheets);
  });
}

// Global carousel functions - available immediately
let currentSlideIndex = 0;
let slides = [];

function goNext() {
  console.log("goNext called");
  if (slides.length > 0) {
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    showCurrentSlide();
  }
}

function goPrev() {
  console.log("goPrev called");
  if (slides.length > 0) {
    currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
    showCurrentSlide();
  }
}

function showCurrentSlide() {
  console.log("Showing slide:", currentSlideIndex);
  slides.forEach((slide, index) => {
    if (index === currentSlideIndex) {
      slide.style.display = "flex";
    } else {
      slide.style.display = "none";
    }
  });
}

// Initialize carousel when page loads
window.addEventListener("load", function () {
  console.log("Page loaded, initializing carousel...");

  slides = document.querySelectorAll(".carousel-slide");
  console.log("Found slides:", slides.length);

  if (slides.length > 0) {
    showCurrentSlide();
    // Auto-advance every 5 seconds
    setInterval(goNext, 5000);
  }

  // Debug: Check if stats are visible
  const stats = document.querySelectorAll(".stat-item");
  console.log("Found stat items:", stats.length);
  stats.forEach((stat, index) => {
    console.log(`Stat ${index + 1}:`, stat.textContent.trim());
    const h3 = stat.querySelector("h3");
    const p = stat.querySelector("p");
    console.log(`Stat ${index + 1} h3:`, h3 ? h3.textContent : "NOT FOUND");
    console.log(`Stat ${index + 1} p:`, p ? p.textContent : "NOT FOUND");
  });

  // Debug: Check if carousel is visible
  const carousel = document.querySelector(".reviews-carousel");
  if (carousel) {
    console.log("Carousel found:", carousel);
    console.log("Carousel display:", window.getComputedStyle(carousel).display);
    console.log(
      "Carousel visibility:",
      window.getComputedStyle(carousel).visibility,
    );
  }

  // Debug: Check if ratings section is visible
  const ratingsSection = document.querySelector(".ratings");
  if (ratingsSection) {
    console.log("Ratings section found:", ratingsSection);
    console.log(
      "Ratings section display:",
      window.getComputedStyle(ratingsSection).display,
    );
    console.log(
      "Ratings section visibility:",
      window.getComputedStyle(ratingsSection).visibility,
    );
    console.log(
      "Ratings section height:",
      window.getComputedStyle(ratingsSection).height,
    );
  }
});

// Grades Page Functionality
document.addEventListener("DOMContentLoaded", () => {
  // Add click handlers for quiz buttons
  const quizButtons = document.querySelectorAll(".quiz-btn");

  quizButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();

      // Get lesson title
      const lessonTitle = button.previousElementSibling.textContent;
      const gradeCard = button.closest(".grade-card");
      const gradeTitle =
        gradeCard.querySelector(".grade-header h2").textContent;
      const unitTitle = button.closest(".unit").querySelector("h3").textContent;

      // Show alert for now (can be replaced with actual quiz functionality)
      alert(
        `Opening quiz for ${lessonTitle} in ${unitTitle} of ${gradeTitle}!`,
      );

      // Add click effect
      button.style.transform = "scale(0.95)";
      setTimeout(() => {
        button.style.transform = "scale(1)";
      }, 150);
    });
  });

  // Add hover effects for grade cards
  const gradeCards = document.querySelectorAll(".grade-card");

  gradeCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-10px) scale(1.02)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0) scale(1)";
    });
  });

  // Add animation for units when they appear
  const units = document.querySelectorAll(".unit");

  units.forEach((unit, index) => {
    unit.style.opacity = "0";
    unit.style.transform = "translateY(20px)";
    unit.style.transition = "all 0.3s ease";

    setTimeout(() => {
      unit.style.opacity = "1";
      unit.style.transform = "translateY(0)";
    }, index * 100);
  });

  // Add grade card entrance animation
  gradeCards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(50px)";
    card.style.transition = "all 0.6s ease";

    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 200);
  });

  // Function to handle quiz navigation (placeholder)
  function openQuiz(grade, unit, lesson) {
    // This function can be expanded to handle actual quiz functionality
    console.log(`Opening quiz for ${lesson} in ${unit} of ${grade}`);

    // For now, show a placeholder message
    const message = `Opening quiz for ${lesson} in ${unit} of ${grade}!`;

    // Create a modal or notification
    showNotification(message);
  }

  // Function to show notifications
  function showNotification(message) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 1rem 2rem;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      font-weight: 500;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
});
