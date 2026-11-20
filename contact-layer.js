const LINKEDIN_URL = "#";

const contactButton = document.querySelector(".contact-toggle");

if (contactButton) {
  const EMAIL = "chrissykuang@gmail.com";
  const EMAIL_LABEL = "Email: chrissykuang@gmail.com";
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const inProject = /\/projects\//.test(location.pathname);
  const assetRoot = inProject ? "../" : "";

  const layer = document.createElement("div");
  layer.id = "contact-layer";
  layer.className = "contact-layer";
  layer.setAttribute("aria-hidden", "true");

  const lines = document.createElement("nav");
  lines.className = "contact-lines";
  lines.setAttribute("aria-label", "Contact");

  function addLink(label, href, extra) {
    const link = document.createElement("a");
    link.className = extra || "";
    link.href = href;
    link.textContent = label;
    lines.appendChild(link);
    return link;
  }

  const phone = addLink("+33 7 59 52 00 15", "tel:+33759520015");
  const email = addLink(EMAIL_LABEL, "#email");
  const instagram = addLink("Instagram: @croireenmoi", "https://www.instagram.com/croireenmoi/", "contact-gap");
  const linkedin = addLink("Linkedin: Chrissy Kuang", LINKEDIN_URL);
  const cv = addLink("Download my CV", assetRoot + "assets/chrissy-kuang-cv.pdf", "contact-gap");
  cv.setAttribute("download", "chrissy-kuang-cv.pdf");
  [instagram].forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
  if (LINKEDIN_URL !== "#") {
    linkedin.target = "_blank";
    linkedin.rel = "noopener noreferrer";
  } else {
    linkedin.addEventListener("click", (event) => event.preventDefault());
  }

  document.body.appendChild(layer);
  document.body.appendChild(lines);

  const links = [phone, email, instagram, linkedin, cv];
  let open = false;
  let floating = false;
  let placeholder = null;
  let closeTimer = 0;
  let copyTimer = 0;
  let htmlOverflow = "";
  let bodyOverflow = "";

  function wordBox() {
    const word = contactButton.querySelector(".contact-word") || contactButton;
    return word.getBoundingClientRect();
  }

  function place() {
    if (floating && placeholder) {
      const cell = placeholder.getBoundingClientRect();
      contactButton.style.top = cell.top + "px";
      contactButton.style.left = cell.left + "px";
      contactButton.style.width = cell.width + "px";
      contactButton.style.height = cell.height + "px";
    }
    const word = wordBox();
    const header = document.querySelector(".site-header");
    const navBottom = header ? header.getBoundingClientRect().bottom : 80;
    lines.style.top = navBottom + 24 + "px";
    lines.style.right = window.innerWidth - word.right + "px";
  }

  function floatButton() {
    if (floating) return;
    placeholder = document.createElement("span");
    placeholder.className = "contact-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    contactButton.parentNode.insertBefore(placeholder, contactButton);
    document.body.appendChild(contactButton);
    contactButton.classList.add("is-floating");
    floating = true;
    place();
  }

  function dockButton() {
    if (!floating) return;
    contactButton.classList.remove("is-floating");
    contactButton.style.top = "";
    contactButton.style.left = "";
    contactButton.style.width = "";
    contactButton.style.height = "";
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(contactButton, placeholder);
      placeholder.remove();
    }
    placeholder = null;
    floating = false;
  }

  function lockScroll() {
    htmlOverflow = document.documentElement.style.overflow;
    bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    document.documentElement.style.overflow = htmlOverflow;
    document.body.style.overflow = bodyOverflow;
  }

  function focusables() {
    return [contactButton, ...links];
  }

  const copied = document.createElement("span");
  copied.className = "copied-label";
  copied.setAttribute("role", "status");
  copied.setAttribute("aria-live", "polite");
  document.body.appendChild(copied);

  let copiedX = 0;
  let copiedY = 0;
  let copiedTargetX = 0;
  let copiedTargetY = 0;
  let copiedFollow = false;
  let copiedFrame = 0;
  let copiedFadeTimer = 0;
  let pointerKind = "";

  function placeCopied() {
    copied.style.transform = "translate(" + copiedX + "px, " + copiedY + "px)";
  }

  function copiedTick() {
    copiedFrame = 0;
    const dx = copiedTargetX - copiedX;
    const dy = copiedTargetY - copiedY;
    if (reduceQuery.matches || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) {
      copiedX = copiedTargetX;
      copiedY = copiedTargetY;
    } else {
      copiedX += dx * 0.2;
      copiedY += dy * 0.2;
    }
    placeCopied();
    if (copiedFollow && (Math.abs(copiedTargetX - copiedX) > 0.5 || Math.abs(copiedTargetY - copiedY) > 0.5)) {
      copiedFrame = requestAnimationFrame(copiedTick);
    }
  }

  function followCopied(x, y) {
    copiedTargetX = x + 12;
    copiedTargetY = y + 12;
    if (!copiedFrame) copiedFrame = requestAnimationFrame(copiedTick);
  }

  function hideCopied() {
    copied.classList.remove("is-on");
    copied.classList.add("is-out");
    window.clearTimeout(copiedFadeTimer);
    copiedFadeTimer = window.setTimeout(() => {
      copiedFollow = false;
      copied.classList.remove("is-out");
      copied.textContent = "";
    }, 250);
  }

  function showCopied(x, y, follow) {
    window.clearTimeout(copyTimer);
    window.clearTimeout(copiedFadeTimer);
    copiedFollow = follow;
    if (follow) {
      copiedX = x + 12;
      copiedY = y + 12;
      copiedTargetX = copiedX;
      copiedTargetY = copiedY;
    } else {
      const rect = email.getBoundingClientRect();
      copiedX = rect.left;
      copiedY = rect.bottom;
    }
    placeCopied();
    copied.textContent = "(copied)";
    copied.classList.remove("is-on", "is-out");
    void copied.offsetWidth;
    copied.classList.add("is-on");
    copyTimer = window.setTimeout(hideCopied, 1250);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      return true;
    } catch (error) {
      try {
        const area = document.createElement("textarea");
        area.value = EMAIL;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
      } catch (err) {
        return false;
      }
    }
  }

  function openLayer() {
    window.clearTimeout(closeTimer);
    if (open) return;
    open = true;
    floatButton();
    lockScroll();
    contactButton.setAttribute("aria-expanded", "true");
    layer.setAttribute("aria-hidden", "false");
    lines.classList.remove("is-closing");
    void lines.offsetWidth;
    layer.classList.add("is-open");
    lines.classList.add("is-open");
    place();
    phone.focus({ preventScroll: true });
  }

  function finishClose() {
    if (open) return;
    lines.classList.remove("is-closing");
    dockButton();
    unlockScroll();
    layer.setAttribute("aria-hidden", "true");
    contactButton.focus({ preventScroll: true });
  }

  function closeLayer() {
    if (!open) return;
    open = false;
    contactButton.setAttribute("aria-expanded", "false");
    layer.classList.remove("is-open");
    lines.classList.remove("is-open");
    lines.classList.add("is-closing");
    closeTimer = window.setTimeout(finishClose, reduceQuery.matches ? 150 : 250);
  }

  contactButton.addEventListener("click", () => {
    if (open) closeLayer();
    else openLayer();
  });

  layer.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    closeLayer();
  });

  email.addEventListener("pointerdown", (event) => {
    pointerKind = event.pointerType;
  });

  email.addEventListener("click", (event) => {
    event.preventDefault();
    const kind = pointerKind;
    const x = event.clientX;
    const y = event.clientY;
    pointerKind = "";
    copyEmail().then((ok) => {
      if (ok) showCopied(x, y, kind === "mouse");
    });
  });

  document.addEventListener("pointermove", (event) => {
    if (!copiedFollow || event.pointerType !== "mouse") return;
    followCopied(event.clientX, event.clientY);
  });

  document.addEventListener("keydown", (event) => {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLayer();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables();
    const index = items.indexOf(document.activeElement);
    event.preventDefault();
    if (event.shiftKey) {
      const next = index <= 0 ? items.length - 1 : index - 1;
      items[next].focus();
      return;
    }
    const next = index === -1 || index === items.length - 1 ? 0 : index + 1;
    items[next].focus();
  });

  window.addEventListener("resize", () => {
    if (open) place();
  });

  const params = new URLSearchParams(location.search);
  if (params.get("contact") === "1") {
    params.delete("contact");
    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : "") + location.hash);
    openLayer();
  }
}
