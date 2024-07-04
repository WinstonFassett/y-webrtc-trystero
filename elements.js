
/**
 * @param {string} selector
 * @return {HTMLElement}
 */
export const find = selector => /** @type {HTMLElement} */ (document.body.querySelector(selector))

export const drawingDemo = find('y-demo-drawing')
