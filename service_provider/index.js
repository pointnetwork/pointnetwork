// const Storage = require('./storage');
//
// class ServiceProvider {
//     constructor(ctx) {
//         this.ctx = ctx;
//         this.config = this.ctx.config.service_provider;
//     }
//
//     async start() {
//         await this.init();
//
//         // todo: rewrite with threads!
//         this.timeout = this.ctx.config.simulation_delay;
//         this.timerFn = null;
//         this.timerFn = async() => {
//             await this.cycle();
//             setTimeout(this.timerFn, this.timeout);
//         };
//         this.timerFn();
//     }
//
//     async init() {
//         this.storage = new Storage(ctx);
//         this.storage.start();
//
//         // todo: other services
//     }
//
//     async cycle() {
//         // todo
//     }
//
//     async newMessage(from, message, parameters) {
//         switch(message) {
//             case 'PUT_CHUNK':
//                 await this.storage.cmd_put_chunk(parameters);
//                 break;
//             case 'GET_CHUNK':
//                 await this.storage.cmd_get_chunk(parameters);
//                 break;
//             default:
//                 // todo: ?
//         }
//         // todo
//     }
// }
//
// module.exports = ServiceProvider;