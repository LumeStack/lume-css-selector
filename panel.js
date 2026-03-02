// ============================================================
//  Lume CSS Selector – panel.js
//  Roda no contexto do DevTools (acesso direto a chrome.devtools.*)
// ============================================================

'use strict';

// --------------- Script injetado na página inspecionada ---------------

const GET_ELEMENT_INFO = `(function () {
  var el = $0;
  if (!el || !el.tagName) return null;

  function esc(str) {
    try { return CSS.escape(str); } catch(e) { return str; }
  }

  function getAllAttrs(element) {
    var result = [];
    for (var i = 0; i < element.attributes.length; i++) {
      var a = element.attributes[i];
      if (a.name === 'class' || a.name === 'id') continue;
      result.push({ name: a.name, value: a.value });
    }
    return result;
  }

  function getNthChild(element) {
    if (!element.parentElement) return 1;
    return Array.prototype.indexOf.call(element.parentElement.children, element) + 1;
  }

  function buildPath(element) {
    var path = [];
    var cur = element;
    var depth = 0;
    while (cur && cur.tagName && cur.tagName.toLowerCase() !== 'html' && depth < 15) {
      var hasUniqueId = cur.id
        ? document.querySelectorAll('#' + esc(cur.id)).length === 1
        : false;
      path.unshift({
        tag: cur.tagName.toLowerCase(),
        id: cur.id || '',
        classes: Array.prototype.slice.call(cur.classList),
        attrs: getAllAttrs(cur),
        nthChild: getNthChild(cur),
        hasUniqueId: hasUniqueId
      });
      cur = cur.parentElement;
      depth++;
    }
    return path;
  }

  return { path: buildPath(el) };
})()`;

// --------------- Estado global ---------------

/** @type {{ path: Array } | null} */
let currentInfo    = null;
let nodeStates     = [];      // [{tag,id,classes:Set,attrs:Set,nth}] por nó
let chipCountCache = {};      // "type:nodeIdx:value" -> count
let matchTotal     = 0;
let matchCurrent   = -1;      // -1 = sem navegação; 0-based quando navegando
let onlyVisible    = false;

// --------------- DevTools: escuta mudança de seleção ---------------

document.addEventListener('DOMContentLoaded', function () {
  chrome.devtools.panels.elements.onSelectionChanged.addListener(fetchInfo);
  bindEvents();
  fetchInfo();
});

function fetchInfo() {
  chrome.devtools.inspectedWindow.eval(GET_ELEMENT_INFO, function (result, isException) {
    if (isException || !result || !result.path || result.path.length === 0) {
      showEmpty();
    } else {
      onNewElement(result);
    }
  });
}

// --------------- Inicialização ---------------

function onNewElement(info) {
  currentInfo  = info;
  nodeStates   = info.path.map(function () {
    return { tag: false, id: false, classes: new Set(), attrs: new Set(), nth: false };
  });
  chipCountCache = {};
  matchTotal     = 0;
  matchCurrent   = -1;

  renderHierarchy(info);
  showPanel();
  updateCounter();
  updateStatus('Click attributes to build query');
  removeHighlights();
}

// --------------- Mostrar / ocultar estados ---------------

function showPanel() {
  document.getElementById('state-empty').classList.add('hidden');
  document.getElementById('hierarchy-container').classList.remove('hidden');
  document.getElementById('bottom-bar').classList.remove('hidden');
}

function showEmpty() {
  document.getElementById('state-empty').classList.remove('hidden');
  document.getElementById('hierarchy-container').classList.add('hidden');
  document.getElementById('bottom-bar').classList.add('hidden');
  currentInfo = null;
  nodeStates  = [];
  removeHighlights();
}

// --------------- Renderizar hierarquia ---------------

function renderHierarchy(info) {
  var container = document.getElementById('hierarchy');
  container.innerHTML = '';

  info.path.forEach(function (node, idx) {
    var isTarget = idx === info.path.length - 1;
    var row = document.createElement('div');
    row.className = 'h-row' + (isTarget ? ' is-target' : '');
    row.dataset.nodeIndex = idx;

    // Tag chip
    row.appendChild(createChip('tag', node.tag, idx, null, null));

    // ID chip
    if (node.id) {
      row.appendChild(createChip('id', '#' + node.id, idx, node.id, null));
    }

    // Classe chips
    node.classes.forEach(function (cls) {
      row.appendChild(createChip('class', '.' + cls, idx, cls, null));
    });

    // Todos os atributos (não filtramos aqui: mostramos tudo)
    node.attrs.forEach(function (attr) {
      row.appendChild(createChip('attr', makeAttrLabel(attr.name, attr.value), idx, attr.name, attr));
    });

    // nth-child chip
    row.appendChild(createChip('nth', ':nth-child(' + node.nthChild + ')', idx, null, null));

    container.appendChild(row);
  });
}

/** Gera o rótulo truncado de um atributo para exibição no chip */
function makeAttrLabel(name, value) {
  if (value === '') return '[' + name + ']';
  var full = '[' + name + '="' + value + '"]';
  if (full.length <= 34) return full;
  // Trunca só o valor, mantendo name visível
  var maxVal = Math.max(5, 34 - ('[' + name + '=""]').length);
  return '[' + name + '="' + value.substring(0, maxVal) + '..."]';
}

// --------------- Criação de chips ---------------

function createChip(type, label, nodeIndex, value, attrObj) {
  var chip = document.createElement('span');
  chip.className = 'chip ' + resolveChipClass(type, attrObj);
  chip.textContent = label;
  chip.title = label;  // tooltip com texto completo
  chip.dataset.type      = type;
  chip.dataset.nodeIndex = nodeIndex;
  if (value !== null && value !== undefined) chip.dataset.value = value;

  chip.addEventListener('click', function (e) {
    e.stopPropagation();
    handleChipClick(chip, type, nodeIndex, value, attrObj);
  });

  return chip;
}

function resolveChipClass(type, attrObj) {
  if (type === 'tag')   return 'chip-tag';
  if (type === 'id')    return 'chip-id';
  if (type === 'class') return 'chip-class';
  if (type === 'nth')   return 'chip-nth';
  if (type === 'attr' && attrObj) {
    var name = attrObj.name;
    if (name.startsWith('data-'))               return 'chip-attr-data';
    if (name === 'style')                        return 'chip-attr-style';
    if (name.startsWith('aria-') || name === 'role') return 'chip-attr-aria';
    return 'chip-attr-other';
  }
  return 'chip-attr-other';
}

// --------------- Clique em chip ---------------

function handleChipClick(chip, type, nodeIndex, value, attrObj) {
  var st = nodeStates[nodeIndex];
  if (!st) return;

  var selected;

  if (type === 'tag') {
    st.tag   = !st.tag;
    selected = st.tag;
  } else if (type === 'id') {
    st.id    = !st.id;
    selected = st.id;
  } else if (type === 'class') {
    if (st.classes.has(value)) { st.classes.delete(value); selected = false; }
    else                       { st.classes.add(value);    selected = true;  }
  } else if (type === 'attr') {
    if (st.attrs.has(value))   { st.attrs.delete(value);   selected = false; }
    else                       { st.attrs.add(value);      selected = true;  }
  } else if (type === 'nth') {
    st.nth   = !st.nth;
    selected = st.nth;
  }

  chip.classList.toggle('selected', selected);

  // Badge com contagem individual (class e attr)
  if (selected) {
    var chipSel  = buildChipCountSelector(type, value, attrObj);
    if (chipSel) {
      var cacheKey = type + ':' + nodeIndex + ':' + (value || '');
      if (chipCountCache[cacheKey] !== undefined) {
        showBadge(chip, chipCountCache[cacheKey]);
      } else {
        fetchIndividualCount(chip, chipSel, cacheKey);
      }
    }
  } else {
    removeBadge(chip);
  }

  // Atualizar seletor combinado
  matchCurrent = -1;
  onSelectorChanged();
}

/** Seletor CSS para contagem individual de um chip (class/attr) */
function buildChipCountSelector(type, value, attrObj) {
  if (type === 'class') {
    return '.' + cssEscape(value);
  }
  if (type === 'attr' && attrObj) {
    if (attrObj.value === '') return '[' + attrObj.name + ']';
    return '[' + attrObj.name + '="' + attrObj.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
  }
  return null;
}

// --------------- Construção do seletor combinado ---------------

function buildSelector() {
  if (!currentInfo) return '';

  var parts = [];
  currentInfo.path.forEach(function (node, idx) {
    var sel = buildNodeSelector(node, nodeStates[idx]);
    if (sel) parts.push({ idx: idx, sel: sel });
  });

  if (parts.length === 0) return '';

  var result = '';
  for (var i = 0; i < parts.length; i++) {
    var cur = parts[i];
    if (i === 0) {
      result = cur.sel;
    } else {
      var prev       = parts[i - 1];
      var combinator = (cur.idx === prev.idx + 1) ? ' > ' : ' ';
      result += combinator + cur.sel;
    }
  }
  return result;
}

function buildNodeSelector(node, st) {
  var sel = '';
  if (st.tag)        sel += node.tag;
  if (st.id && node.id) sel += '#' + cssEscape(node.id);

  st.classes.forEach(function (cls) {
    sel += '.' + cssEscape(cls);
  });

  st.attrs.forEach(function (attrName) {
    var attrObj = node.attrs.find(function (a) { return a.name === attrName; });
    if (!attrObj) return;
    if (attrObj.value === '') {
      sel += '[' + attrObj.name + ']';
    } else {
      sel += '[' + attrObj.name + '="' + attrObj.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
    }
  });

  if (st.nth) sel += ':nth-child(' + node.nthChild + ')';
  return sel;
}

// --------------- Seletor mudou: highlight + contagem ---------------

function onSelectorChanged() {
  var selector = buildSelector();

  if (!selector) {
    matchTotal = 0;
    updateCounter();
    updateStatus('Click attributes to build query');
    removeHighlights();
    return;
  }

  updateStatus(selector);

  // Destaca elementos E retorna contagem em uma só chamada eval
  var script = makeHighlightScript(selector);
  chrome.devtools.inspectedWindow.eval(script, function (count, isException) {
    matchTotal = (!isException && typeof count === 'number') ? count : 0;

    // Único match: rola automaticamente até o elemento para que o highlight fique visível
    if (matchTotal === 1) {
      matchCurrent = 0;
      scrollToMatch(selector, 0);
    }

    updateCounter();
  });
}

// --------------- Contagem individual por chip ---------------

function fetchIndividualCount(chip, chipSelector, cacheKey) {
  var script = makeCountScript(chipSelector, false);
  chrome.devtools.inspectedWindow.eval(script, function (count, isException) {
    if (isException || count < 0) return;
    chipCountCache[cacheKey] = count;
    if (chip.classList.contains('selected')) {
      showBadge(chip, count);
    }
  });
}

// --------------- Navegação entre matches ---------------

function navigateTo(direction) {
  if (matchTotal <= 0) return;
  var selector = buildSelector();
  if (!selector) return;

  if (matchCurrent === -1) {
    matchCurrent = direction > 0 ? 0 : matchTotal - 1;
  } else {
    matchCurrent = (matchCurrent + direction + matchTotal) % matchTotal;
  }

  updateCounter();
  scrollToMatch(selector, matchCurrent);
}

function scrollToMatch(selector, index) {
  var selJson  = JSON.stringify(selector);
  var visCheck = onlyVisible
    ? 'function iv(e){var s=window.getComputedStyle(e);return s.display!=="none"&&s.visibility!=="hidden"&&e.offsetWidth>0&&e.offsetHeight>0;}'
    : 'function iv(){return true;}';

  var script =
    '(function(sel,idx){' +
      visCheck +
      'try{' +
        'var els=Array.prototype.filter.call(document.querySelectorAll(sel),iv);' +
        'var el=els[idx];if(!el)return;' +
        'el.scrollIntoView({behavior:"instant",block:"center"});' +
        'el.style.setProperty("outline","3px solid #ff8c00","important");' +
        'el.style.setProperty("outline-offset","2px","important");' +
        'setTimeout(function(){' +
          'el.style.removeProperty("outline");' +
          'el.style.removeProperty("outline-offset");' +
        '},800);' +
      '}catch(e){}' +
    '})(' + selJson + ',' + index + ')';

  chrome.devtools.inspectedWindow.eval(script, function () {});
}

// --------------- Scripts injetados ---------------

function makeHighlightScript(selector) {
  var selJson  = JSON.stringify(selector);
  var visCheck = onlyVisible
    ? 'function iv(e){var s=window.getComputedStyle(e);return s.display!=="none"&&s.visibility!=="hidden"&&s.opacity!=="0"&&e.offsetWidth>0&&e.offsetHeight>0;}'
    : 'function iv(){return true;}';

  return '(function(sel){' +
    visCheck +
    // Remove highlights anteriores
    'var prev=document.querySelectorAll("[data-css-lume]");' +
    'Array.prototype.forEach.call(prev,function(e){e.removeAttribute("data-css-lume");});' +
    'var ps=document.getElementById("__css-lume-style");if(ps)ps.remove();' +
    'try{' +
      'var els=Array.prototype.filter.call(document.querySelectorAll(sel),iv);' +
      'if(els.length===0)return 0;' +
      // Injeta estilo de highlight
      'var st=document.createElement("style");' +
      'st.id="__css-lume-style";' +
      'st.textContent="[data-css-lume]{outline:2px solid #4d9cf9!important;outline-offset:1px!important;background-color:rgba(77,156,249,0.06)!important;}";' +
      'document.head.appendChild(st);' +
      'Array.prototype.forEach.call(els,function(e){e.setAttribute("data-css-lume","true");});' +
      'return els.length;' +
    '}catch(e){return -1;}' +
  '})(' + selJson + ')';
}

function makeCountScript(selector, useVisibility) {
  var selJson  = JSON.stringify(selector);
  var visCheck = useVisibility
    ? 'function iv(e){var s=window.getComputedStyle(e);return s.display!=="none"&&s.visibility!=="hidden"&&e.offsetWidth>0&&e.offsetHeight>0;}'
    : 'function iv(){return true;}';

  return '(function(sel){' +
    visCheck +
    'try{return Array.prototype.filter.call(document.querySelectorAll(sel),iv).length;}' +
    'catch(e){return -1;}' +
  '})(' + selJson + ')';
}

function removeHighlights() {
  chrome.devtools.inspectedWindow.eval(
    '(function(){' +
      'var prev=document.querySelectorAll("[data-css-lume]");' +
      'Array.prototype.forEach.call(prev,function(e){e.removeAttribute("data-css-lume");});' +
      'var ps=document.getElementById("__css-lume-style");if(ps)ps.remove();' +
    '})()',
    function () {}
  );
}

// --------------- Atualizações de UI ---------------

function updateCounter() {
  var el   = document.getElementById('counter');
  var prev = document.getElementById('btn-prev');
  var next = document.getElementById('btn-next');

  if (matchTotal <= 0) {
    el.textContent = '- / -';
    prev.disabled  = true;
    next.disabled  = true;
    return;
  }

  el.textContent = matchCurrent === -1
    ? ('- / ' + matchTotal)
    : ((matchCurrent + 1) + ' / ' + matchTotal);

  prev.disabled = matchTotal <= 1;
  next.disabled = matchTotal <= 1;
}

function updateStatus(text) {
  var el = document.getElementById('status-text');
  var isSelector = text && text !== 'Click attributes to build query';
  el.textContent = text || 'Click attributes to build query';
  el.className   = isSelector ? 'has-selector' : '';
}

function showBadge(chip, count) {
  removeBadge(chip);
  var badge = document.createElement('span');
  badge.className   = 'chip-badge';
  badge.textContent = count;
  chip.appendChild(badge);
}

function removeBadge(chip) {
  var b = chip.querySelector('.chip-badge');
  if (b) b.remove();
}

// --------------- Eventos ---------------

function bindEvents() {
  document.getElementById('btn-prev').addEventListener('click', function () {
    navigateTo(-1);
  });

  document.getElementById('btn-next').addEventListener('click', function () {
    navigateTo(1);
  });

  document.getElementById('btn-refresh').addEventListener('click', function () {
    fetchInfo();
  });

  document.getElementById('btn-visibility').addEventListener('click', function () {
    onlyVisible = !onlyVisible;
    this.dataset.active = onlyVisible ? 'true' : 'false';
    matchCurrent = -1;
    // Reaplica highlight com novo filtro
    onSelectorChanged();
  });

  document.getElementById('btn-copy').addEventListener('click', function () {
    var selector = buildSelector();
    if (!selector) return;
    navigator.clipboard.writeText(selector).then(function () {
      var btn = document.getElementById('btn-copy');
      btn.style.color = '#4ec9b0';
      setTimeout(function () { btn.style.color = ''; }, 1200);
    });
  });

}

// --------------- Helpers ---------------

function cssEscape(str) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(str);
  return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}
