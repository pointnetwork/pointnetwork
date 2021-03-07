const fs = require('fs');

// todo: Security: don't allow dapps to access the routes here!

class WebController {
    constructor(ctx) {
        this.ctx = ctx;
        this.webPath = './api/web/';
    }

    index(request, reply) {
        reply.type('text/html');
        return this._view('index');
    }

    static(request, reply) {
        const file = request.params.file;
        const fullFilePath = this.webPath+'static/'+file;
        if (!file) {
            console.error('WebController.static(): File not specified');
            return Error('WebController.static(): File not specified');
            // todo: throw an actual error into the browser
        }
        if (!fs.existsSync(fullFilePath)) {
            console.error('WebController.static(): File not found: '+file);
            return Error('WebController.static(): File not found: '+file);
            // todo: throw an actual error into the browser
        }

        switch(file.split('.').slice(-1)) {
            case 'js':
                reply.type('text/javascript');
                break;
            case 'css':
                reply.type('text/css');
                break;
            default:
                reply.type('text/plain');
        }

        return fs.readFileSync(fullFilePath, 'utf-8'); // todo: security! possible injection!
    }

    _view(viewName) {
        return fs.readFileSync(this.webPath+viewName+'.html', 'utf-8'); // todo: make sure it's sanitized or at least picked from a list
    }
}

module.exports = WebController;