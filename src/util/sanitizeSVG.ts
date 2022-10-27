import jsdom from 'jsdom';
import isSVG from 'is-svg';

const {JSDOM} = jsdom;
const dom = new JSDOM();

export const sanitizeSVG = (content: Buffer | string): string => {
    const original = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
    if (!isSVG(original)) {
        throw new Error('Not a valid SVG.');
    }

    const div = dom.window.document.createElement('div');
    div.innerHTML = original;
    const svgEl = div.querySelector('svg');

    if (!svgEl) {
        throw new Error('Not a valid SVG.');
    }

    // Remove script tags.
    svgEl.childNodes.forEach(child => {
        if (child.nodeName === 'script') {
            child.remove();
        }
    });

    // Remove script attributes (such as `onload`).
    Array.from(svgEl.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
            svgEl.removeAttribute(attr.name);
        }
    });

    return div.innerHTML;
};
