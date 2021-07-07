const readline = require('readline');
const qs = require('query-string');
const axios = require('axios');
const _ = require('lodash');

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
        })
    }

    async cmd_api(...args) {
        const api_base_url = 'http://localhost:'+parseInt(ctx.config.api.port)+'/v1/api/';
        const api_cmd = args.shift();
        try {
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

            const url = api_base_url + api_cmd + '?' + params;
            console.log('Querying '+url);
            const response = await axios.get(url);
            return response.data
        } catch (e) {
            return {error: `Error fetching ${api_cmd} : ${e.message}`,
                    status: e.response.status,
                    statusText: e.response.statusText}
        }
    }

    async cmd_api_post(host, api_cmd, body) {
        const api_base_url = 'http://localhost:'+parseInt(ctx.config.api.port)+'/v1/api/';
        try {
            const url = api_base_url + api_cmd ;
            console.log('Post to:'+url);
            console.log('Post body:', body);
            const response = await axios.post(url, body, {
                headers: {
                  'host': host,
                  'Content-Type': 'application/json'
                }
            })
            return response.data
        } catch (e) {
            return {error: `Error posting ${api_cmd} : ${e.message}`,
                    status: e.response.status,
                    statusText: e.response.statusText}
        }
    }
}

module.exports = Console;