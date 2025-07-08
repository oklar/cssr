(() => {
  if (document.__cssar_mo) return;

  const styleEl = document.head.appendChild(document.createElement("style"));
  const seen = new Set();
  const rules = [];

  const escapeClass = (cls) => "." + CSS.escape(cls);

  const parseDecls = (str) =>
    str
      ? str
          .split(";")
          .map((d) => d.split(/:(.+)/))
          .filter(([p, v]) => p && v != null)
          .map(([p, v]) => {
            let val = v.replace(/_/g, " ").trim();
            // space‑wrap math ops between non‑spaces
            val = val.replace(/(\S)([+\-*/])(\S)/g, "$1 $2 $3");
            return [p.trim(), val];
          })
      : [];

  const addRule = (sel, decls, tok) => {
    if (!decls.length || seen.has(tok)) return;
    rules.push(`${sel}{${decls.map(([p, v]) => `${p}:${v};`).join("")}}`);
    seen.add(tok);
  };

  const handleToken = (token) => {
    if (seen.has(token) || !token.includes(":")) return;

    // our supported pseudos
    const pseudos = new Set([
      "hover",
      "active",
      "focus",
      "visited",
      "disabled",
      "required",
    ]);

    // split into segments on every colon
    const parts = token.split(":");
    let idx = 0;

    let selectorPrefix = ""; // will become something like ".\&\>div:hover"
    let property, value;

    // 1) Does the first part look like a nested selector?
    const first = parts[idx];
    const isSelector =
      first.startsWith("&") || first.startsWith("#") || first.startsWith(".");
    if (isSelector) {
      // build the selector path from that first segment
      const raw = first.startsWith("&") ? first.slice(1) : first;
      const path = raw
        .replace(/([>+~])/g, " $1 ")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      selectorPrefix = escapeClass(token) + path;
      idx++;
    }

    // pseudo?
    let pseudo = "";
    const maybePseudo = parts[idx];
    if (pseudos.has(maybePseudo)) {
      pseudo = maybePseudo;
      idx++;
    }

    // 3) We **must** now have property and value
    if (parts.length - idx < 2) {
      return;
    }
    property = parts[idx++];
    value = parts.slice(idx).join(":");

    // If there was no selectorPrefix, we apply to the element itself:
    let fullSelector = selectorPrefix || escapeClass(token);
    if (pseudo) {
      fullSelector += `:${pseudo}`;
    }

    // 5) Normalize the value: underscores -> spaces, math ops spacing
    let normalized = value
      .replace(/_/g, " ")
      .replace(/(\S)([+\-*/])(\S)/g, "$1 $2 $3")
      .trim();

    addRule(fullSelector, [[property.trim(), normalized]], token);
  };

  const processNode = (n) =>
    (n.className || "").split(/\s+/).filter(Boolean).forEach(handleToken);

  const processTree = (root) =>
    root.querySelectorAll('[class*=":"]').forEach(processNode);

  const flush = () => {
    if (!rules.length) return;
    styleEl.textContent += "\n" + rules.join("\n");
    rules.length = 0;
  };

  document.__cssar_mo = new MutationObserver((muts) => {
    muts.forEach((m) =>
      m.addedNodes.forEach(
        (n) => n.nodeType === 1 && (processNode(n), processTree(n))
      )
    );
    flush();
  });

  document.addEventListener("DOMContentLoaded", () => {
    processTree(document.body);
    document.__cssar_mo.observe(document.body, {
      childList: true,
      subtree: true,
    });
    flush();
  });
})();
