(() => {
  if (document.__cssar_mo) return;

  const styleEl = document.head.appendChild(document.createElement('style'));
  const seen = new Set();
  const rules = [];

  const escapeClass = cls => '.' + CSS.escape(cls);

  const parseDecls = str =>
    str
      ? str
          .split(';')
          .map(d => d.split(/:(.+)/))
          .filter(([p, v]) => p && v != null)
          .map(([p, v]) => {
            let val = v.replace(/_/g, ' ').trim();
            // space‑wrap math ops between non‑spaces
            val = val.replace(/(\S)([+\-*/])(\S)/g, '$1 $2 $3');
            return [p.trim(), val];
          })
      : [];

  const addRule = (sel, decls, tok) => {
    if (!decls.length || seen.has(tok)) return;
    rules.push(`${sel}{${decls.map(([p, v])=>`${p}:${v};`).join('')}}`);
    seen.add(tok);
  };

  const handleToken = (token) => {
    // 1) Skip if already seen or not a CSS token
    if (seen.has(token) || !token.includes(':')) return;
  
    // 2) Which pseudos we support
    const pseudos = ['hover','active','focus','visited','disabled','required'];
  
    // 3) Split on the *first* colon only
    //    e.g. ['hover', '#submitBtn:background-color:green;color:white']
    const [selPart, rest] = token.split(/:(.+)/);
  
    if (selPart.startsWith('&')) {
      // ─── Nested selector branch ───
      // Strip leading &, handle > + ~ and underscores
      const raw = selPart.slice(1);
      const path = raw
        .replace(/([>+~])/g, ' $1 ')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
  
      addRule(
        escapeClass(token) + path,
        parseDecls(rest),
        token
      );
  
    } else if (pseudos.includes(selPart)) {
      // ─── Pseudo‑class branch ───
      // rest might be:
      //   a) property:value…           (apply to the element itself)
      //   b) selector:property:value…  (apply to a nested selector)
      const [maybeSel, declsPart] = rest.split(/:(.+)/);
  
      if (/^[#.]/.test(maybeSel) || maybeSel.startsWith('&')) {
        // 3a) Pseudo on a nested selector
        const raw = maybeSel.startsWith('&')
          ? maybeSel.slice(1)
          : maybeSel;
        const path = raw
          .replace(/([>+~])/g, ' $1 ')
          .replace(/_/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
  
        addRule(
          // .<full‑token‑class>:hover<div selector>
          `${escapeClass(token)}:${selPart}${path}`,
          parseDecls(declsPart),
          token
        );
      } else {
        // 3b) Pseudo on the element itself
        addRule(
          // .<full‑token‑class>:hover
          `${escapeClass(token)}:${selPart}`,
          parseDecls(rest),
          token
        );
      }
  
    } else {
      // ─── Simple property:value branch ───
      // single declaration—do math‑spacing & underscore conversion
      const property = selPart.trim();
      let value = rest
        .replace(/_/g, ' ')
        .replace(/(\S)([+\-*/])(\S)/g, '$1 $2 $3')
        .trim();
  
      addRule(
        escapeClass(token),
        [[property, value]],
        token
      );
    }
  };
  

  const processNode = n =>
    (n.className || '')
      .split(/\s+/)
      .filter(Boolean)
      .forEach(handleToken);

  const processTree = root =>
    root.querySelectorAll('[class*=":"]').forEach(processNode);

  const flush = () => {
    if (!rules.length) return;
    styleEl.textContent += '\n' + rules.join('\n');
    rules.length = 0;
  };

  document.__cssar_mo = new MutationObserver(muts => {
    muts.forEach(m =>
      m.addedNodes.forEach(n =>
        n.nodeType === 1 && (processNode(n), processTree(n))
      )
    );
    flush();
  });

  document.addEventListener('DOMContentLoaded', () => {
    processTree(document.body);
    document.__cssar_mo.observe(document.body, {
      childList: true,
      subtree: true
    });
    flush();
  });
})();
