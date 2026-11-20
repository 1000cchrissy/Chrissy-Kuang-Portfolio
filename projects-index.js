(function () {
  const projects = window.PROJECTS || [];
  if (!projects.length) return;

  const parts = location.pathname.split("/");
  const file = parts.pop() || "";
  const inFolder = parts[parts.length - 1] === "projects";
  const currentSlug = inFolder ? file.replace(/\.html$/, "") : "";

  const entries = projects.map((project, index) => ({
    project,
    no: index + 1,
    href: (inFolder ? "" : "projects/") + project.slug + ".html",
  }));

  let sortKey = "no";
  let sortDir = 1;

  const root = document.createElement("div");
  root.className = "projects-index";
  root.id = "projects-index";

  const tableWrap = document.createElement("div");
  tableWrap.className = "index-table-wrap";
  tableWrap.inert = true;

  const tableScroll = document.createElement("div");
  tableScroll.className = "index-table-scroll";

  const table = document.createElement("table");
  table.className = "index-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const noHeader = document.createElement("th");
  noHeader.scope = "col";
  noHeader.textContent = "No.";
  headRow.appendChild(noHeader);

  const columns = [
    { key: "name", label: "Project" },
    { key: "type", label: "Type" },
  ];
  const headerButtons = {};

  columns.forEach((column) => {
    const th = document.createElement("th");
    th.scope = "col";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "index-sort";
    button.addEventListener("click", () => {
      if (sortKey === column.key) sortDir *= -1;
      else {
        sortKey = column.key;
        sortDir = 1;
      }
      render();
    });
    th.appendChild(button);
    headRow.appendChild(th);
    headerButtons[column.key] = { button, th, label: column.label };
  });

  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  table.append(thead, tbody);
  tableScroll.appendChild(table);
  tableWrap.appendChild(tableScroll);

  const bar = document.createElement("div");
  bar.className = "index-bar";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "index-toggle";
  toggle.setAttribute("aria-expanded", "false");

  const icon = document.createElement("span");
  icon.className = "index-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "+";

  const toggleLabel = document.createElement("span");
  toggleLabel.className = "index-toggle-label";
  toggleLabel.textContent = "Projects Index";

  toggle.append(icon, toggleLabel);

  const label = document.createElement("span");
  label.className = "index-label";
  label.textContent = "Projects Index";

  const search = document.createElement("input");
  search.className = "index-search";
  search.type = "search";
  search.placeholder = "Search";
  search.setAttribute("aria-label", "Search");
  search.autocomplete = "off";
  search.spellcheck = false;
  search.tabIndex = -1;

  bar.append(toggle, label, search);
  root.append(tableWrap, bar);
  document.body.appendChild(root);

  function rememberClosedWidth() {
    if (root.classList.contains("is-open")) return;
    root.style.setProperty("--closed-w", "max-content");
    const width = root.getBoundingClientRect().width;
    root.style.setProperty("--closed-w", width + "px");
  }

  rememberClosedWidth();
  if (document.fonts) {
    document.fonts.ready.then(() => {
      rememberClosedWidth();
      measureMarquees();
    });
  }
  window.addEventListener("resize", () => {
    rememberClosedWidth();
    measureMarquees();
  });

  function listOf(value) {
    if (Array.isArray(value)) return value;
    if (value) return [value];
    return [];
  }

  function kinds(project) {
    const labels = listOf(project.labels);
    if (labels.length) return labels;
    return listOf(project.type);
  }

  function primaryType(project) {
    return kinds(project)[0] || "";
  }

  function indexName(project) {
    if (project.slug === "paris-photography") return "Photography";
    if (project.slug === "dodo-jewels") return "DoDo Jewels";
    return project.name;
  }

  function compare(a, b) {
    let result = 0;
    if (sortKey === "name") result = indexName(a.project).localeCompare(indexName(b.project));
    else if (sortKey === "type") result = primaryType(a.project).localeCompare(primaryType(b.project));
    else result = a.no - b.no;
    if (!result) result = a.no - b.no;
    return result * sortDir;
  }

  function typeText(project) {
    return kinds(project).map((label) => `(${String(label).toLowerCase()})`).join(" ");
  }

  function matches(project, query) {
    if (!query) return true;
    const fields = [indexName(project), project.name, typeText(project), ...kinds(project), ...listOf(project.tags)];
    return fields.some((field) => String(field).toLowerCase().includes(query));
  }

  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function reduceMotion() {
    return reduceQuery.matches;
  }

  function measureMarquees() {
    if (!root.classList.contains("is-open")) return;
    const reduced = reduceMotion();
    root.querySelectorAll(".index-type").forEach((cell) => {
      const text = cell.querySelector(".index-marquee-text");
      const track = cell.querySelector(".index-marquee-track");
      if (!text || !track) return;
      cell.classList.remove("is-overflow");
      const clone = track.querySelector("[data-clone]");
      if (clone) clone.remove();
      track.style.removeProperty("--shift");
      track.style.removeProperty("--marquee-duration");
      if (reduced) return;
      const available = cell.clientWidth;
      const needed = text.scrollWidth;
      if (available > 0 && needed > available + 1) {
        const extra = text.cloneNode(true);
        extra.setAttribute("aria-hidden", "true");
        extra.dataset.clone = "true";
        track.appendChild(extra);
        const shift = needed + 40;
        track.style.setProperty("--shift", shift + "px");
        track.style.setProperty("--marquee-duration", (shift / 30) + "s");
        cell.classList.add("is-overflow");
      }
    });
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    Object.keys(headerButtons).forEach((key) => {
      const column = headerButtons[key];
      const active = key === sortKey;
      column.button.replaceChildren(document.createTextNode(column.label));
      if (active) {
        const arrow = document.createElement("span");
        arrow.className = "index-arrow";
        arrow.textContent = sortDir < 0 ? "↓" : "↑";
        column.button.appendChild(arrow);
      }
      column.th.setAttribute("aria-sort", active ? (sortDir < 0 ? "descending" : "ascending") : "none");
    });

    tbody.replaceChildren();
    entries
      .filter((entry) => matches(entry.project, query))
      .sort(compare)
      .forEach((entry) => {
        const tr = document.createElement("tr");
        if (entry.project.slug === currentSlug) tr.className = "is-current";

        const noCell = document.createElement("td");
        noCell.textContent = String(entry.no);

        const nameCell = document.createElement("td");
        const link = document.createElement("a");
        link.href = entry.href;
        link.textContent = indexName(entry.project);
        if (entry.project.slug === currentSlug) link.setAttribute("aria-current", "page");
        nameCell.appendChild(link);

        const typeCell = document.createElement("td");
        typeCell.className = "index-type";
        const marquee = document.createElement("span");
        marquee.className = "index-marquee";
        const track = document.createElement("span");
        track.className = "index-marquee-track";
        const typeLabel = document.createElement("span");
        typeLabel.className = "index-marquee-text";
        typeLabel.textContent = typeText(entry.project);
        track.appendChild(typeLabel);
        marquee.appendChild(track);
        typeCell.appendChild(marquee);

        tr.append(noCell, nameCell, typeCell);
        tr.addEventListener("click", (event) => {
          if (event.target.closest("a")) return;
          location.href = link.href;
        });
        tbody.appendChild(tr);
      });
    measureMarquees();
  }

  const CLIP_MS = 450;
  const CLIP_EASE = "cubic-bezier(0.7, 0, 0.2, 1)";
  let animTimer = 0;
  let restoreOnClose = false;

  function openerLink() {
    return document.querySelector(".index-open");
  }

  function insetForLink() {
    const panel = root.getBoundingClientRect();
    const link = openerLink();
    if (!link || !panel.width || !panel.height) return "inset(0)";
    const box = link.getBoundingClientRect();
    const top = box.top - panel.top;
    const right = panel.right - box.right;
    const bottom = panel.bottom - box.bottom;
    const left = box.left - panel.left;
    return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  }

  function playClip(to) {
    const current = getComputedStyle(root).clipPath;
    root.style.transition = "none";
    root.style.clipPath = !current || current === "none" ? "inset(0px)" : current;
    root.getBoundingClientRect();
    if (reduceMotion()) {
      root.style.transition = "none";
      root.style.clipPath = to;
      return;
    }
    root.style.transition = `clip-path ${CLIP_MS}ms ${CLIP_EASE}`;
    root.style.clipPath = to;
  }

  function finishClose() {
    root.classList.remove("is-open", "is-closing", "is-revealed");
    root.style.transition = "";
    root.style.clipPath = "";
    toggle.setAttribute("aria-expanded", "false");
    toggle.removeAttribute("aria-label");
    icon.textContent = "+";
    tableWrap.inert = true;
    search.tabIndex = -1;
    if (!restoreOnClose) return;
    const link = openerLink();
    if (link) link.focus();
  }

  function openIndex() {
    if (window.matchMedia("(max-width: 768px)").matches) return;
    if (root.classList.contains("is-open") && !root.classList.contains("is-closing")) return;
    window.clearTimeout(animTimer);
    root.classList.remove("is-closing");
    root.classList.add("is-open");
    root.classList.remove("is-revealed");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close projects index");
    icon.textContent = "×";
    tableWrap.inert = false;
    search.tabIndex = 0;
    render();
    if (reduceMotion()) {
      root.style.transition = "none";
      root.style.clipPath = "inset(0)";
      root.classList.add("is-revealed");
    } else {
      root.style.transition = "none";
      root.style.clipPath = insetForLink();
      root.getBoundingClientRect();
      root.style.transition = `clip-path ${CLIP_MS}ms ${CLIP_EASE}`;
      root.style.clipPath = "inset(0)";
      root.classList.add("is-revealed");
    }
    search.focus();
  }

  function closeIndex(restoreFocus) {
    if (!root.classList.contains("is-open") || root.classList.contains("is-closing")) return;
    restoreOnClose = !!restoreFocus;
    root.classList.add("is-closing");
    root.classList.remove("is-revealed");
    tableWrap.inert = true;
    search.tabIndex = -1;
    if (reduceMotion()) {
      finishClose();
      return;
    }
    playClip(insetForLink());
    animTimer = window.setTimeout(finishClose, CLIP_MS);
  }

  window.openProjectsIndex = function () {
    if (root.classList.contains("is-closing") || !root.classList.contains("is-open")) openIndex();
    else closeIndex(true);
  };

  toggle.addEventListener("click", () => {
    if (root.classList.contains("is-open")) closeIndex(true);
    else openIndex();
  });

  search.addEventListener("input", render);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !root.classList.contains("is-open")) return;
    event.preventDefault();
    closeIndex(true);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!root.classList.contains("is-open")) return;
    if (root.contains(event.target)) return;
    if (event.target.closest(".index-open")) return;
    closeIndex(false);
  });

  render();
})();
