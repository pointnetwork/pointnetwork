// NB: Consult https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet

module.exports = {
    allowedTags: [
        // enabled by default in sanitize-html
        'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
        'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
        'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'iframe',
        // additionally enabled
        '!doctype', 'html', 'head', 'title', 'link', 'body',
        'h1', 'h2', 'img', 'p', 'header', 'footer', 'main',
        'form', 'textarea', 'input', 'button', 'meta'
    ],
    allowedAttributes: {
        '*': [ 'id', 'class', 'style', 'alt' ],
        html: ['lang'],
        a: [ 'href', 'name', 'target' ],
        img: [ 'src', 'srcset' ],
        link: [ 'href', 'type', 'rel' ],
        form: [ 'method', 'action' ],
        textarea: [ 'rows', 'cols', 'name' ],
        input: [ 'type', 'name', 'value' ],
        button: [ 'type' ],
        meta: ['http-equiv', 'content'],
        td: ['colspan'],
    },
    // Lots of these won't come up by default because we don't allow them
    selfClosing: [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta', '!doctype' ],
    // URL schemes permitted
    allowedSchemes: [ 'data', 'http', 'https', /*'ftp', 'mailto'todo*/ ],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: [ 'href', 'src', 'cite' ],
    allowProtocolRelative: true
};
// todo: enable svg with all additional <g>, <circle> etc.
//  todo: svg can contain xss, see the link!

// todo: allow link rel=stylesheet etc.