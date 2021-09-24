const readline = require('readline');
const axios = require('axios');

const PROMPT = '> ';

class Console {
    constructor(ctx) {
        this.ctx = ctx;
    }

    start() {
        console.log('Welcome to Point Network!');

        this._console = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: PROMPT
        });

        this._console.prompt();
        this._console.on('line', async (line) => {
            let [cmd, ...args] = line.trim().split(' ');

            if (cmd === "exit") this._console.close();

            const method = "cmd_"+cmd.replace('.', '_');

            if (this[method] && typeof this[method] === 'function') {
                await this[method](...args);
            } else {
                console.error('Invalid command');
            }

            this._console.prompt();
        });
        this._console.on('close', () => {
            console.log('console dead, exiting');
            process.exit(1);
            //todo: more, close gracefully
        });
    }

    async cmd_api(...args) {
        return await this.cmd_api_get('localhost', args.shift(), ...args);
    }

    async cmd_api_get(_host, cmd, ...args) {
        _host = (_host === 'localhost') ? this.host : _host;
        try {
            const params = this.buildURLParams(args);
            const url = this.buildApiBaseUrl() + cmd + '?' + params;
            const response = await axios.get(url, {
                headers: {
                    'host': _host,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (e) {
            return {error: `Error fetching ${cmd} : ${e.message}`};
        }
    }

    async cmd_api_post_formdata(cmd, request) {
        const FormData = require('form-data');

        const filename = 'tmpfile';

        // create formData for request:
        const thisForm = new FormData();

        // passing a file buffer:
        thisForm.append('file', request, { filename });

        const api_base_url = this.buildApiBaseUrl();
        const url = api_base_url + cmd;

        const response = await axios.post(url, thisForm, {headers: { ...thisForm.getHeaders() }});

        return response.data;
    }

    async cmd_api_post(_headers, cmd, body) {
        const api_base_url = this.buildApiBaseUrl();
        try {
            const url = api_base_url + cmd;
            const response = await axios.post(url, body, _headers);
            return response.data;
        } catch (e) {
            return {
                error: `Error posting ${cmd} : ${e.message}`,
                status: e.response && e.response.status,
                statusText: e.response && e.response.statusText
            };
        }
    }

    // Private helpers

    buildURLParams(args) {
        // Note: args must be "="-delimited strings, or just strings, e.g. ["a=b", "c=d"] or ["b", "d"]
        // Don't send an array or object! Use function arguments
        let params = "";

        for(let p of args) {
            if ((typeof p) !== 'string') {
                throw Error('Invalid type of parameter sent to cmd_api: '+typeof p);
            }
            if (p.split('=').length === 2) {
                params += p;
            } else {
                params += 'p0=' + p;
            }
            params += '&';
        }

        return params;
    }

    get host() {
        return `http://localhost:${parseInt(this.ctx.config.api.port)}`;
    }

    get path() {
        return '/v1/api/';
    }

    buildApiBaseUrl() {
        return `${this.host}${this.path}`;
    }
}

module.exports = Console;