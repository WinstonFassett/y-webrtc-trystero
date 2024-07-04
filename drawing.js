import { f as fromCamelCase, p as parseElement, q as querySelector, e as emitCustomEvent, a as addEventListener, b as assign, k as keys, s as stringify, i as isNaN, c as equalityFlat, d as from, g as querySelectorAll, h as checkNodeType, r as remove, j as parseFragment, l as replaceWith, m as appendChild, n as parse, E as ELEMENT_NODE, Y as YMap, o as YArray, t as drawingContent } from './index2.js';

/* eslint-env browser */

/**
 * @type {CustomElementRegistry}
 */
const registry = customElements;

/**
 * @param {string} name
 * @param {any} constr
 * @param {ElementDefinitionOptions} [opts]
 */
const define = (name, constr, opts) => registry.define(name, constr, opts);

const upgradedEventName = 'upgraded';
const connectedEventName = 'connected';
const disconnectedEventName = 'disconnected';

/**
 * @param {any} val
 * @param {"json"|"string"|"number"} type
 * @return {string}
 */
const encodeAttrVal = (val, type) => {
  if (type === 'json') {
    val = stringify(val);
  }
  return val + ''
};

/**
 * @param {any} val
 * @param {"json"|"string"|"number"|"bool"} type
 * @return {any}
 */
const parseAttrVal = (val, type) => {
  switch (type) {
    case 'json':
      return parse(val)
    case 'number':
      return Number.parseFloat(val)
    case 'string':
      return val
    case 'bool':
      return val != null
    default:
      return null
  }
};

/**
 * @typedef {Object} CONF
 * @property {string?} [CONF.template] Template for the shadow dom.
 * @property {string} [CONF.style] shadow dom style. Is only used when
 * `CONF.template` is defined
 * @property {S} [CONF.state] Initial component state.
 * @property {function(S,S|null,Lib0Component<S>):void} [CONF.onStateChange] Called when
 * the state changes.
 * @property {Object<string,function(any, any):Object>} [CONF.childStates] maps from
 * CSS-selector to transformer function. The first element that matches the
 * CSS-selector receives state updates via the transformer function.
 * @property {Object<string,"json"|"number"|"string"|"bool">} [CONF.attrs]
 * attrs-keys and state-keys should be camelCase, but the DOM uses kebap-case. I.e.
 * `attrs = { myAttr: 4 }` is represeted as `<my-elem my-attr="4" />` in the DOM
 * @property {Object<string, function(CustomEvent, Lib0Component<any>):boolean|void>} [CONF.listeners] Maps from dom-event-name
 * to event listener.
 * @property {function(S, S, Lib0Component<S>):Object<string,string>} [CONF.slots] Fill slots
 * automatically when state changes. Maps from slot-name to slot-html.
 * @template S
 */

/**
 * @template T
 * @param {string} name
 * @param {CONF<T>} cnf
 * @return {typeof Lib0Component}
 */
const createComponent = (name, { template, style = '', state: defaultState, onStateChange = () => {}, childStates = { }, attrs = {}, listeners = {}, slots = () => ({}) }) => {
  /**
   * Maps from camelCase attribute name to kebap-case attribute name.
   * @type {Object<string,string>}
   */
  const normalizedAttrs = {};
  for (const key in attrs) {
    normalizedAttrs[fromCamelCase(key, '-')] = key;
  }
  const templateElement = template
    ? /** @type {HTMLTemplateElement} */ (parseElement(`
      <template>
        <style>${style}</style>
        ${template}
      </template>
      `))
    : null;

  class _Lib0Component extends HTMLElement {
    /**
     * @param {T} [state]
     */
    constructor (state) {
      super();
      /**
       * @type {Array<{d:Lib0Component<T>, s:function(any, any):Object}>}
       */
      this._childStates = [];
      /**
       * @type {Object<string,string>}
       */
      this._slots = {};
      this._init = false;
      /**
       * @type {any}
       */
      this._internal = {};
      /**
       * @type {any}
       */
      this.state = state || null;
      this.connected = false;
      // init shadow dom
      if (templateElement) {
        const shadow = /** @type {ShadowRoot} */ (this.attachShadow({ mode: 'open' }));
        shadow.appendChild(templateElement.content.cloneNode(true));
        // fill child states
        for (const key in childStates) {
          this._childStates.push({
            d: /** @type {Lib0Component<T>} */ (querySelector(/** @type {any} */ (shadow), key)),
            s: childStates[key]
          });
        }
      }
      emitCustomEvent(this, upgradedEventName, { bubbles: true });
    }

    connectedCallback () {
      this.connected = true;
      if (!this._init) {
        this._init = true;
        const shadow = this.shadowRoot;
        if (shadow) {
          addEventListener(shadow, upgradedEventName, event => {
            this.setState(this.state, true);
            event.stopPropagation();
          });
        }
        /**
         * @type {Object<string, any>}
         */
        const startState = this.state || assign({}, defaultState);
        if (attrs) {
          for (const key in attrs) {
            const normalizedKey = fromCamelCase(key, '-');
            const val = parseAttrVal(this.getAttribute(normalizedKey), attrs[key]);
            if (val) {
              startState[key] = val;
            }
          }
        }
        // add event listeners
        for (const key in listeners) {
          addEventListener(shadow || this, key, event => {
            if (listeners[key](/** @type {CustomEvent} */ (event), this) !== false) {
              event.stopPropagation();
              event.preventDefault();
              return false
            }
          });
        }
        // first setState call
        this.state = null;
        this.setState(startState);
      }
      emitCustomEvent(/** @type {any} */ (this.shadowRoot || this), connectedEventName, { bubbles: true });
    }

    disconnectedCallback () {
      this.connected = false;
      emitCustomEvent(/** @type {any} */ (this.shadowRoot || this), disconnectedEventName, { bubbles: true });
      this.setState(null);
    }

    static get observedAttributes () {
      return keys(normalizedAttrs)
    }

    /**
     * @param {string} name
     * @param {string} oldVal
     * @param {string} newVal
     *
     * @private
     */
    attributeChangedCallback (name, oldVal, newVal) {
      const curState = /** @type {any} */ (this.state);
      const camelAttrName = normalizedAttrs[name];
      const type = attrs[camelAttrName];
      const parsedVal = parseAttrVal(newVal, type);
      if (curState && (type !== 'json' || stringify(curState[camelAttrName]) !== newVal) && curState[camelAttrName] !== parsedVal && !isNaN(parsedVal)) {
        this.updateState({ [camelAttrName]: parsedVal });
      }
    }

    /**
     * @param {any} stateUpdate
     */
    updateState (stateUpdate) {
      this.setState(assign({}, this.state, stateUpdate));
    }

    /**
     * @param {any} state
     */
    setState (state, forceStateUpdates = false) {
      const prevState = this.state;
      this.state = state;
      if (this._init && (!equalityFlat(state, prevState) || forceStateUpdates)) {
        // fill slots
        if (state) {
          const slotElems = slots(state, prevState, this);
          for (const key in slotElems) {
            const slotContent = slotElems[key];
            if (this._slots[key] !== slotContent) {
              this._slots[key] = slotContent;
              const currentSlots = /** @type {Array<any>} */ (key !== 'default' ? from(querySelectorAll(this, `[slot="${key}"]`)) : from(this.childNodes).filter(/** @param {any} child */ child => !checkNodeType(child, ELEMENT_NODE) || !child.hasAttribute('slot')));
              currentSlots.slice(1).map(remove);
              const nextSlot = parseFragment(slotContent);
              if (key !== 'default') {
                from(nextSlot.children).forEach(c => c.setAttribute('slot', key));
              }
              if (currentSlots.length > 0) {
                replaceWith(currentSlots[0], nextSlot);
              } else {
                appendChild(this, nextSlot);
              }
            }
          }
        }
        onStateChange(state, prevState, this);
        if (state != null) {
          this._childStates.forEach(cnf => {
            const d = cnf.d;
            if (d.updateState) {
              d.updateState(cnf.s(state, this));
            }
          });
        }
        for (const key in attrs) {
          const normalizedKey = fromCamelCase(key, '-');
          if (state == null) {
            this.removeAttribute(normalizedKey);
          } else {
            const stateVal = state[key];
            const attrsType = attrs[key];
            if (!prevState || prevState[key] !== stateVal) {
              if (attrsType === 'bool') {
                if (stateVal) {
                  this.setAttribute(normalizedKey, '');
                } else {
                  this.removeAttribute(normalizedKey);
                }
              } else if (stateVal == null && (attrsType === 'string' || attrsType === 'number')) {
                this.removeAttribute(normalizedKey);
              } else {
                this.setAttribute(normalizedKey, encodeAttrVal(stateVal, attrsType));
              }
            }
          }
        }
      }
    }
  }
  define(name, _Lib0Component);
  // @ts-ignore
  return _Lib0Component
};

/**
 * @typedef {object} Coordinate
 * @property {number} Coordinate.x
 * @property {number} Coordinate.y
 */

const calculateCoordinateFromEvent = (event, el) => {
  const canvasRect = /** @type {HTMLElement} */ (querySelector(el.shadowRoot, 'canvas')).getBoundingClientRect();
  return { x: (event.clientX - canvasRect.left) / canvasRect.width, y: (event.clientY - canvasRect.top) / canvasRect.height }
};

const drawStart = (coord, el) => {
  if (coord.target == null || coord.target.nodeName === 'CANVAS') {
    const drawElement = new YMap();
    drawElement.set('color', el._internal.currentColor);
    drawElement.set('type', 'path');
    drawElement.set('coordinate', calculateCoordinateFromEvent(coord, el));
    el._internal.currPath = new YArray();
    drawElement.set('path', el._internal.currPath);
    drawingContent.push([drawElement]);
  }
  return false
};

const clearCurrPath = (event, el) => {
  el._internal.currPath = null;
  return false
};

const moveDraw = (coord, el) => {
  if (coord.target == null || coord.target.nodeName === 'CANVAS') {
    if (el._internal.currPath !== null) {
      el._internal.currPath.push([calculateCoordinateFromEvent(coord, el)]);
    }
  }
  return false
};

createComponent('y-demo-drawing', {
  template: `
  <input id="drawing-menubar-checkbox" type="checkbox">
  <div id="drawing-menubar">
    <div id="drawing-menubar-action-close">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"/></svg>
    </div>
    <div id="drawing-menubar-action-color">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M204.3 5C104.9 24.4 24.8 104.3 5.2 203.4c-37 187 131.7 326.4 258.8 306.7 41.2-6.4 61.4-54.6 42.5-91.7-23.1-45.4 9.9-98.4 60.9-98.4h79.7c35.8 0 64.8-29.6 64.9-65.3C511.5 97.1 368.1-26.9 204.3 5zM96 320c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm32-128c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm128-64c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm128 64c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"/></svg>
    </div>
    <div id="drawing-menubar-action-clear">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"/></svg>
    </div>
  </div>
  <div id="drawing-menubar-colors">
    <div id="drawer-menubar-colors-black"></div>
    <div id="drawer-menubar-colors-orange"></div>
    <div id="drawer-menubar-colors-blue"></div>
    <div id="drawer-menubar-colors-green"></div>
  </div>
  <canvas width="2000" height="2000"></canvas>
  `,
  listeners: {
    mousedown: drawStart,
    /**
     * @param {any} event
     */
    touchstart: (event, el) => {
      if (event.touches.length === 1) {
        drawStart(event.touches[0], el);
      }
      return false
    },
    mouseleave: clearCurrPath,
    mouseup: clearCurrPath,
    touchcancel: clearCurrPath,
    touchend: clearCurrPath,
    mousemove: moveDraw,
    /**
     * @param {any} event
     * @param {any} el
     */
    touchmove: (event, el) => {
      if (event.touches.length === 1) {
        moveDraw(event.touches[0], el);
      }
      return false
    }
  },
  onStateChange: (state, prevState, el) => {
    const shadow = /** @type {any} */ (el.shadowRoot);
    const drawingCanvas = /** @type {HTMLCanvasElement} */ (querySelector(shadow, 'canvas'));
    const drawingMenubarCheckbox = /** @type {HTMLInputElement} */ (querySelector(shadow, '#drawing-menubar-checkbox'));
    const drawingMenubarColors = querySelector(shadow, '#drawing-menu-colors');
    const drawingMenubarActionColor = /** @type {HTMLElement} */ (querySelector(shadow, '#drawing-menubar-action-color'));
    const drawingMenubarActionClear = /** @type {HTMLElement} */ (querySelector(shadow, '#drawing-menubar-action-clear'));

    // clear all existing state
    el._internal.currPath = null;
    el._internal.currentColor = '#333';
    if (el._internal.unregisterYDraw) {
      el._internal.unregisterYDraw;
    }
    if (el._internal.unregister) {
      el._internal.unregister();
    }
    if (state) {
      // draw state
      const ctx = /** @type {CanvasRenderingContext2D} */ (drawingCanvas.getContext('2d'));
      const yDrawingContent = drawingContent;

      const requestAnimationFrame = window.requestAnimationFrame || setTimeout;

      let needToRedraw = true;

      /**
       * Draw the canvas
       */
      const draw = () => {
        if (needToRedraw) {
          needToRedraw = false;
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          const width = ctx.canvas.width;
          const height = ctx.canvas.height;
          yDrawingContent.forEach(drawElement => {
            if (drawElement.get('type') === 'path') {
              const coordinate = /** @type {Coordinate} */ (drawElement.get('coordinate'));
              const color = /** @type {string} */ (drawElement.get('color'));
              const path = /** @type {Y.Array<Coordinate>} */ (drawElement.get('path'));
              if (path) {
                ctx.beginPath();
                ctx.lineWidth = 5;
                ctx.lineJoin = ctx.lineCap = 'round';
                ctx.shadowBlur = 2;
                ctx.shadowColor = color;
                ctx.beginPath();
                ctx.moveTo(coordinate.x * width, coordinate.y * height);
                ctx.strokeStyle = color;
                let lastPoint = coordinate;
                path.forEach(c => {
                  // @todo this can be optimized by considering the previous coordinates too
                  const pointBetween = {
                    x: (c.x + lastPoint.x) / 2,
                    y: (c.y + lastPoint.y) / 2
                  };
                  ctx.quadraticCurveTo(lastPoint.x * width, lastPoint.y * height, pointBetween.x * width, pointBetween.y * height);
                  lastPoint = c;
                });
                ctx.lineTo(lastPoint.x * width, lastPoint.y * height);
                ctx.stroke();
              }
            }
          });
        }
      };
      const requestDrawAnimationFrame = () => {
        needToRedraw = true;
        requestAnimationFrame(draw);
      };
      yDrawingContent.observeDeep(requestDrawAnimationFrame);
      el._internal.unregisterYDraw = () => yDrawingContent.unobserveDeep(requestDrawAnimationFrame);
      requestDrawAnimationFrame();

      /**
       * @param {string} color
       */
      const createColorChanger = color => () => {
        drawingMenubarActionColor.style.backgroundColor = color;
        el._internal.currentColor = color;
      };

      const cBlack = createColorChanger('#333');
      const cOrange = createColorChanger('#ffbc42');
      const cBlue = createColorChanger('#30bced');
      const cGreen = createColorChanger('#6eeb83');
      const cClear = () => {
        yDrawingContent.delete(0, yDrawingContent.length);
        drawingMenubarCheckbox.checked = false;
      };

      const menuBlack = /** @type {HTMLElement} */ (querySelector(shadow, '#drawer-menubar-colors-black'));
      const menuOrange = /** @type {HTMLElement} */ (querySelector(shadow, '#drawer-menubar-colors-orange'));
      const menuBlue = /** @type {HTMLElement} */ (querySelector(shadow, '#drawer-menubar-colors-blue'));
      const menuGreen = /** @type {HTMLElement} */ (querySelector(shadow, '#drawer-menubar-colors-green'));

      menuBlack.addEventListener('click', cBlack);
      menuOrange.addEventListener('click', cOrange);
      menuBlue.addEventListener('click', cBlue);
      menuGreen.addEventListener('click', cGreen);
      drawingMenubarActionClear.addEventListener('click', cClear);

      if (el._internal.unregister) {
        el._internal.unregister();
      }
      el._internal.unregister = () => {
        menuBlack.removeEventListener('click', cBlack);
        menuOrange.removeEventListener('click', cOrange);
        menuBlue.removeEventListener('click', cBlue);
        menuGreen.removeEventListener('click', cGreen);
        drawingMenubarActionClear.removeEventListener('click', cClear);
      };
    }
  },
  style: `
  :host {
    position: relative;
    display: block;
    touch-action: none;
  }

  canvas {
    width: 100%;
    background-image: -webkit-repeating-radial-gradient(center center, rgba(0,0,0,.2), rgba(0,0,0,.2) 1px, transparent 1px, transparent 100%);
    background-size: 1rem 1rem;
  }
  
  #drawing-area {
    position: relative;
  }
  
  #drawing-menubar-checkbox {
    position: absolute;
    right: .5rem;
    top: .5rem;
    width: var(--drawing-menubar-icon-size);
    height: var(--drawing-menubar-icon-size);
    cursor: pointer;
    opacity: 0;
    z-index: 3;
  }
  
  #drawing-menubar {
    position: absolute;
    right: .5rem;
    top: .5rem;
    width: var(--drawing-menubar-icon-size);
    height: var(--drawing-menubar-icon-size);;
    /* padding-top: calc(var(--drawing-menubar-icon-size) - .6rem);*/
    background-color: var(--theme-highlight);
    overflow: hidden;
    border-radius: 50%;
    border: .3rem solid var(--theme-highlight);
    box-shadow: inset 0 0 0 .1rem var(--background-color);
    box-sizing: border-box;
    transition: box-shadow .5s, height .5s, border .2s, border-radius .5s, background-color .2s;
  }
  
  #drawing-menubar-checkbox:checked ~ #drawing-menubar {
    height: calc(3 * var(--drawing-menubar-icon-size));
    box-shadow: inset 0 0 0 0 var(--theme-highlight);
    border-radius: .3rem;
    border: 0 solid var(--theme-yellow);
    background-color: var(--theme-highlight-complementary);
  }
  
  #drawing-menubar > div {
    height: var(--drawing-menubar-icon-size);
    width: var(--drawing-menubar-icon-size);
    cursor: pointer;
    display: flex;
    transition: background-color .1s;
  }
  
  #drawing-menubar-action-close svg {
    opacity: 0;
  }
  
  #drawing-menubar-checkbox:checked ~ #drawing-menubar > #drawing-menubar-action-close svg {
    opacity: 1;
    transform: rotate(90deg);
    transition: opacity .5s, transform .5s;
    transition-delay: .2s;
  }
  
  #drawing-menubar-action-color {
    background-color: var(--theme-blue)
  }
  
  #drawing-menubar-action-clear {
    background-color: var(--theme-highlight-light)
  }
  
  #drawing-menubar svg {
    fill: var(--background-color);
    margin: auto;
    height: 2rem;
  }
  
  #drawing-menubar-checkbox:not(:checked) ~ #drawing-menubar > div:not(:first-child) {
    background-color: var(--theme-highlight) !important;
    transition: background-color .2s;
  }
  
  #drawing-menubar-colors {
    position: absolute;
    top: calc(1.41 * var(--drawing-menubar-icon-size));
    right: calc(1.3 * var(--drawing-menubar-icon-size));
    display: flex;
    justify-content: space-between;
    width: 0;
  }
  
  #drawing-menubar-colors > div {
    border-radius: 50%;
    width: 1.9rem;
    height: 1.9rem;
    box-sizing: border-box;
    cursor: pointer;
  }
  
  #drawing-menubar-colors > div:hover {
    transform: scale(1.2);
    transition: all .2s;
  }
  
  #drawing-menubar-checkbox:checked ~ #drawing-menubar-colors {
    width: 10rem;
    transition: width .5s;
    transition-delay: .7s;
  }
  
  #drawer-menubar-colors-black {
    background-color: #333;
  }
  #drawer-menubar-colors-orange {
    background-color: var(--theme-orange);
  }
  #drawer-menubar-colors-blue {
    background-color: var(--theme-blue);
  }
  #drawer-menubar-colors-green {
    background-color: var(--theme-green);
  }  
  `
});
//# sourceMappingURL=drawing.js.map
