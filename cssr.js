(() => {
  if (document.__cssr_mo) return;
  let styleEl = document.head.appendChild(document.createElement("style"));
  let gen = new Set();
  let newRules = [];

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
        newRules.push(rule);
        gen.add(token);
      });
  };

  let updateStyle = () => {
    if (newRules.length > 0) {
      styleEl.textContent += "\n" + newRules.join("\n");
      newRules = [];
    }
  };

  let processTree = (root) => {
    root.querySelectorAll('[class*=":"]').forEach((node) => processNode(node));
    updateStyle();
  };

  document.__cssr_mo = new MutationObserver((muts) => {
    muts.forEach((m) =>
      m.addedNodes.forEach(
        (n) => n.nodeType === 1 && (processNode(n), processTree(n))
      )
    );
    updateStyle();
  });

  document.addEventListener("DOMContentLoaded", () => {
    processTree(document.body);
    document.__cssr_mo.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
})();
