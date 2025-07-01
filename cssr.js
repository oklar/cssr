(() => {
  if (document.__cssr_mo) return;

  let styleElement = document.head.appendChild(document.createElement("style"));
  let generatedTokens = new Set();
  let pendingRules = [];

  let escapeClassSelector = (className) => {
    return "." + CSS.escape(className);
  };

  let parseDeclarations = (styleString) => {
    if (!styleString) return [];
    return styleString
      .split(";")
      .map((decl) => {
        let [property, value] = decl.split(/:(.+)/);
        if (!property || !value) return null;
        return [property.trim(), value.replace(/_/g, " ").trim()];
      })
      .filter(Boolean);
  };

  let queueRule = (selector, declarations, token) => {
    if (declarations.length === 0) return;
    let ruleBody = declarations
      .map(([prop, val]) => {
        if (!CSS.supports || !CSS.supports(prop, val)) {
          console.warn(`(Warning) Possibly unsupported CSS: ${prop}: ${val}`);
        }
        return `${prop}: ${val};`;
      })
      .join(" ");
    pendingRules.push(`${selector} { ${ruleBody} }`);
    generatedTokens.add(token);
  };

  let processClassToken = (token) => {
    if (generatedTokens.has(token)) return;
    if (!token.includes(":")) return;
    if (token.startsWith("&")) {
      let firstColon = token.indexOf(":");
      let selectorPart = token.slice(0, firstColon);
      let stylePart = token.slice(firstColon + 1);
      let baseSelector = escapeClassSelector(token);
      let restSelector = selectorPart
        .slice(1)
        .replace(/_>_/g, " > ")
        .replace(/_/g, " ");
      let fullSelector = baseSelector + restSelector;
      let declarations = parseDeclarations(stylePart);
      queueRule(fullSelector, declarations, token);
    } else {
      let firstColon = token.indexOf(":");
      let property = token.slice(0, firstColon);
      let value = token.slice(firstColon + 1).replace(/_/g, " ");
      let selector = escapeClassSelector(token);
      queueRule(selector, [[property, value]], token);
    }
  };

  let processNode = (node) => {
    let classAttr = node.getAttribute("class") || "";
    let tokens = classAttr.split(/\s+/).filter((t) => t.length > 0);
    tokens.forEach(processClassToken);
    flushRules();
  };

  let flushRules = () => {
    if (pendingRules.length > 0) {
      styleElement.textContent += "\n" + pendingRules.join("\n");
      pendingRules = [];
    }
  };

  let processTree = (root) => {
    root.querySelectorAll('[class*=":"]').forEach(processNode);
    flushRules();
  };

  document.__cssr_mo = new MutationObserver((mutations) => {
    mutations.forEach((mutation) =>
      mutation.addedNodes.forEach(
        (node) => node.nodeType === 1 && (processNode(node), processTree(node))
      )
    );
    flushRules();
  });

  document.addEventListener("DOMContentLoaded", () => {
    processTree(document.body);
    document.__cssr_mo.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
})();
