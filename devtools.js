// Cria o painel lateral "Lume CSS Selector" na aba Elements do DevTools
chrome.devtools.panels.elements.createSidebarPane("Lume CSS Selector", function (sidebar) {
  sidebar.setPage("panel.html");
});
