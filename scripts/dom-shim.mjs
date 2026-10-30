// ============================================================================
// dom-shim.mjs — Minimal DOM shim sufficient to exercise the view render()
// functions under Node. This is NOT a full DOM (no layout, no CSS cascade);
// its job is to let `el()` build a tree and let render() run to completion so
// structural bugs (e.g. a root that closes early) surface as exceptions.
// ============================================================================

function makeContext2D() {
  // Any method call is a no-op; any property write is remembered.
  return new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

class FakeClassList {
  constructor() {
    this._set = new Set();
  }
  add(...names) {
    names.forEach((n) => this._set.add(n));
  }
  remove(...names) {
    names.forEach((n) => this._set.delete(n));
  }
  toggle(name, force) {
    if (force === undefined) {
      if (this._set.has(name)) {
        this._set.delete(name);
        return false;
      }
      this._set.add(name);
      return true;
    }
    if (force) this._set.add(name);
    else this._set.delete(name);
    return !!force;
  }
  contains(name) {
    return this._set.has(name);
  }
}

class Node {}

class FakeElement extends Node {
  constructor(tag) {
    super();
    this.nodeType = 1;
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.style = {};
    this._classList = new FakeClassList();
    this._listeners = {};
    this.hidden = false;
    this.value = '';
    this.checked = false;
    this.textContent = '';
    this.innerHTML = '';
    this.attributes = {};
    this.id = '';
    this.disabled = false;
    this.required = false;
    this.type = '';
    this.max = '';
    this.rows = 0;
  }

  get classList() {
    return this._classList;
  }

  set className(v) {
    this._classList._set = new Set(String(v).split(/\s+/).filter(Boolean));
  }

  get className() {
    return [...this._classList._set].join(' ');
  }

  setAttribute(name, value) {
    const str = String(value);
    this.attributes[name] = str;
    if (name === 'id') this.id = str;
    if (name === 'class') this.className = str;
    if (name === 'value') this.value = str;
  }

  getAttribute(name) {
    return name in this.attributes ? this.attributes[name] : null;
  }

  addEventListener(type, fn) {
    (this._listeners[type] ||= []).push(fn);
  }

  removeEventListener(type, fn) {
    this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== fn);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    return child;
  }

  remove() {
    if (this.parentElement) this.parentElement.removeChild(this);
  }

  append(...nodes) {
    for (const n of nodes.flat(Infinity)) {
      if (n == null || n === false) continue;
      this.appendChild(typeof n === 'string' ? document.createTextNode(n) : n);
    }
  }

  replaceChildren(...nodes) {
    for (const c of this.children) c.parentElement = null;
    this.children = [];
    this.append(...nodes);
  }

  focus() {}

  getBoundingClientRect() {
    return { width: 640, height: 0, left: 0, top: 0 };
  }

  get offsetWidth() {
    return 640;
  }

  get firstChild() {
    return this.children[0] || null;
  }

  getContext() {
    return makeContext2D();
  }

  // --- Limited selector support: tag, .class, #id, [attr], [attr=v] ---------

  _descendants() {
    const out = [];
    const walk = (el) => {
      if (!Array.isArray(el.children)) return;
      for (const c of el.children) {
        if (c.nodeType === 1) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }

  _matches(sel) {
    const el = this;
    let i = 0;
    const m = sel.match(/^([a-zA-Z][a-zA-Z0-9-]*)?(#[\w-]+)?((\.[\w-]+)*)(\[[^\]]*\])?$/);
    if (!m) return false;
    const tag = m[1];
    const id = m[2];
    const classes = m[4] ? m[4].split('.').filter(Boolean) : [];
    const attr = m[5];
    if (tag && el.tagName !== tag.toUpperCase()) return false;
    if (id && el.id !== id.slice(1)) return false;
    for (const cls of classes) {
      if (!el.classList.contains(cls)) return false;
    }
    if (attr) {
      const inner = attr.slice(1, -1);
      const eq = inner.indexOf('=');
      if (eq === -1) {
        if (!(inner in el.attributes)) return false;
      } else {
        const key = inner.slice(0, eq);
        const val = inner.slice(eq + 1);
        if (el.getAttribute(key) !== val) return false;
      }
    }
    return true;
  }

  querySelector(sel) {
    return this._descendants().find((el) => el._matches(sel)) || null;
  }

  querySelectorAll(sel) {
    return this._descendants().filter((el) => el._matches(sel));
  }
}

class FakeText extends Node {
  constructor(text) {
    super();
    this.nodeType = 3;
    this.textContent = String(text);
    this.parentElement = null;
    this.children = [];
  }

  remove() {
    if (this.parentElement) this.parentElement.removeChild(this);
  }
}

const documentElement = new FakeElement('html');
const body = new FakeElement('body');

const document = {
  nodeType: 9,
  documentElement,
  body,
  title: '',
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => new FakeText(text),
  getElementById: (id) =>
    documentElement._descendants().find((el) => el.id === id) || body._descendants().find((el) => el.id === id) || null,
  querySelectorAll: () => [],
};

const window = {
  addEventListener() {},
  removeEventListener() {},
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};

export function installDom() {
  globalThis.Node = Node;
  globalThis.document = document;
  globalThis.window = window;
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
  return { document, window };
}

export function makeContainer() {
  return new FakeElement('div');
}
