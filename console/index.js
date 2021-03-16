const readline = require('readline');
const querystring = require('querystring');
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
                await this[method](args);
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
        const api_base_url = 'http://localhost:'+parseInt(ctx.config.api.port)+'/api/';
        const api_cmd = args.shift();
        try {
            let params = "";

            for(let p of args) {
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
            console.log(response.data);
            return response.data
        } catch (e) {
            return {error: `Error fetching ${api_cmd} : ${e.message}`}
        }
    }

    cmd_ping() {
        // in the console type 'ping'
        // > ping
        // pong
        console.log('pong')
    }
}

module.exports = Console;