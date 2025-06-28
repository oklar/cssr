(() => {
  if (document.__cssr_mo) return;
  let sheet = document.head.appendChild(document.createElement("style")).sheet;
  let gen = new Set();

  document.__cssr_mo = new MutationObserver((muts) =>
    muts.forEach((m) =>
      m.addedNodes.forEach(
        (n) => n.nodeType === 1 && (processNode(n), processTree(n))
      )
    )
  );

  let processNode = (node) => {
    (node.getAttribute("class") || "")
      .split(/\s+/)
      .filter((t) => t.includes(":"))
      .forEach((token) => {
        if (gen.has(token)) return;

        let [prop, val] = token.split(/:(.+)/);
        let cssValue = val.replace(/_/g, " ");

        if (!CSS.supports(prop, cssValue)) {
          console.warn(`Unsupported CSS: ${prop}: ${cssValue}`);
          return;
        }

        let rule = `.${CSS.escape(token)} { ${prop}: ${cssValue}; }`;
        sheet.insertRule(rule, sheet.cssRules.length);

        gen.add(token);
      });
  };

  let processTree = (root) => {
    root.querySelectorAll('[class*=":"]').forEach(processNode);
  };

  document.addEventListener("DOMContentLoaded", () => {
    processTree(document.body);
    document.__cssr_mo.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
})();
