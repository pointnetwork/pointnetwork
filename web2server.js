const fastify = require('fastify');
const proxy = require('fastify-http-proxy');
const server = fastify({logger: true});
const point =
    'window.eval(`window.point=(${(e=>{class r extends Error{}class s' +
    ' extends Error{}class t extends Error{}class n extends Error{}cl' +
    'ass a extends Error{}class o extends Error{}const i=async(s,t)=>' +
    '{try{const n=await window.top.fetch(`${e}/v1/api/${s}`,{cache:"n' +
    'o-cache",credentials:"include",keepalive:!0,...t,headers:{"Conte' +
    'nt-Type":"application/json",...t?.headers}});if(!n.ok){const{ok:' +
    'e,status:s,statusText:t,headers:a}=n;throw console.error("SDK ca' +
    'll failed:",{ok:e,status:s,statusText:t,headers:Object.fromEntri' +
    'es([...a.entries()])}),new r("Point SDK request failed")}try{ret' +
    'urn await n.json()}catch(e){throw console.error("Point API respo' +
    'nse parsing error:",e),e}}catch(e){throw console.error("Point AP' +
    'I call failed:",e),e}},g={get:(e,r,s)=>i(`${e}${r?"?":""}${new U' +
    'RLSearchParams(r).toString()}`,{method:"GET",headers:s}),post:(e' +
    ',r,s)=>i(e,{method:"POST",headers:s,body:JSON.stringify(r)}),pos' +
    'tFile:(s,t)=>(async(s,t)=>{try{const n=await window.top.fetch(`$' +
    '{e}/${s}`,{cache:"no-cache",credentials:"include",keepalive:!0,.' +
    '..t});if(!n.ok){const{ok:e,status:s,statusText:t,headers:a}=n;th' +
    'row console.error("SDK ZProxy call failed:",{ok:e,status:s,statu' +
    'sText:t,headers:Object.fromEntries([...a.entries()])}),new r("Po' +
    'int SDK request failed")}try{return await n.json()}catch(e){thro' +
    'w console.error("Point API response parsing error:",e),e}}catch(' +
    'e){throw console.error("Point API call failed:",e),e}})(s,{metho' +
    'd:"POST",body:t})};function m(e){return new Promise((r=>setTimeo' +
    'ut(r,e)))}const l={},A={},c={},d="subscription_confirmation",x="' +
    'subscription_cancellation",u="subscription_event",p="subscriptio' +
    'n_error",f="subscribeContractEvent",b="removeSubscriptionById",w' +
    '=({type:e,params:{contract:r,event:s}={}})=>`${e}_${r}_${s}`,h=e' +
    '=>A[e]||(A[e]=[]),y={},v=(e,{messageQueueSizeLimit:r=1e3}={})=>n' +
    'ew Promise(((i,g)=>{if(void 0!==l[e])return void i(l[e]);const v' +
    '=new WebSocket(e);v.onopen=()=>i(Object.assign(l[e]=v,{async sub' +
    'scribeToContractEvent(e){const r={type:f,params:e},s=w(r);y[s]=f' +
    'unction(){let e=()=>{},r=()=>{};return Object.assign(new Promise' +
    '(((s,t)=>{e=s,r=t})),{resolve:e,reject:r})}(),await v.send(JSON.' +
    'stringify(r));const t=await Promise.race([y[s],(n=1e4,new Promis' +
    'e(((e,r)=>setTimeout((()=>r(new a("Subscription confirmation tim' +
    'eout"))),n))))]);var n;const o=h(t);return Object.assign((async(' +
    ')=>{for(;;)try{const e=c[t];if(e)throw e;if(o.length)return o.sh' +
    'ift();await m(100)}catch(e){throw console.error("subscribed mess' +
    'age error:",e),e}}),{unsubscribe:()=>v.send(JSON.stringify({type' +
    ':b,params:{subscriptionId:t}}))})}})),v.onerror=e=>{for(const r ' +
    'in A)c[r]||(c[r]=new t(e.toString()))},v.onclose=r=>{delete l[e]' +
    ';for(const e in A)c[e]||(c[e]=new n(r.toString()));1e3===r.code?' +
    'i(void 0):g()},v.onmessage=e=>{try{const{type:t,request:n,subscr' +
    'iptionId:a,data:i}=JSON.parse(e.data);switch(t){case d:{const e=' +
    'w(n),{resolve:r,reject:s}=y[e]||{};"string"!=typeof a?"function"' +
    '==typeof s&&s(new o(`Invalid subscription id "${a}" for request ' +
    'id: "${e}"`)):"function"==typeof r&&r(a);break}case x:a&&(consol' +
    'e.info({type:t,request:n,subscriptionId:a,data:i}),delete A[a],d' +
    'elete c[a]);break;case u:if(a){const e=h(a);e.length>r?c[a]=new ' +
    's("ZProxy WS message queue overflow"):e.push(i)}else console.err' +
    'or("Unable to identify subscription channel",{subscriptionId:a,r' +
    'equest:n,data:i});break;case p:a?c[a]=new o(JSON.stringify(i)):c' +
    'onsole.error("Unable to identify subscription channel",{subscrip' +
    'tionId:a,request:n,data:i});break;default:console.error("Unsuppo' +
    'rted event type:",{type:t,request:n,subscriptionId:a,data:i})}}c' +
    'atch(e){console.log("Web Socket onmessage error:",e)}}}));return' +
    '{version:"0.0.1",status:{ping:()=>g.get("status/ping",void 0,{"w' +
    'allet-token":"WALLETID-PASSCODE"})},contract:{load:({contract:e,' +
    '...r})=>g.get(`contract/load/${e}`,r,{"wallet-token":"WALLETID-P' +
    'ASSCODE"}),call:e=>g.post("contract/call",e,{"wallet-token":"WAL' +
    'LETID-PASSCODE"}),send:e=>g.post("contract/send",e,{"wallet-toke' +
    'n":"WALLETID-PASSCODE"}),async subscribe({contract:s,event:t,...' +
    'n}){if("string"!=typeof s)throw new r(`Invalid contract ${s}`);i' +
    'f("string"!=typeof t)throw new r(`Invalid event ${t}`);const a=n' +
    'ew URL(e);a.protocol="https:"===a.protocol?"wss:":"ws:";const o=' +
    'await v(a.toString());if(!o)throw new r("Failed to establish web' +
    ' socket connection");return o.subscribeToContractEvent({contract' +
    ':s,event:t,...n})}},storage:{postFile:e=>g.postFile("_storage/",' +
    'e),getString:({id:e,...r})=>g.get(`storage/getString/${e}`,r,{"w' +
    'allet-token":"WALLETID-PASSCODE"}),putString:e=>g.post("storage/' +
    'putString",e,{"wallet-token":"WALLETID-PASSCODE"})},wallet:{addr' +
    'ess:()=>g.get("wallet/address"),hash:()=>g.get("wallet/hash")},i' +
    'dentity:{ownerToIdentity:({owner:e,...r})=>g.get(`identity/owner' +
    'ToIdentity/${e}`,r,{"wallet-token":"WALLETID-PASSCODE"})}}}).toS' +
    'tring()})(window.location.origin);`)';

server.register(proxy, {
    upstream: 'https://localhost:8666',
    replyOptions: {
        rewriteRequestHeaders: (request, headers) => {
            const {rawHeaders} = request;
            const host = rawHeaders[rawHeaders.indexOf('Host') + 1];
            const [subdomain] = host.split('.');
            return {...headers, host: `${subdomain}.point`};
        },
        onError: (reply, error) => {
            try {
                if (JSON.parse(error).code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
                    reply.send(
                        'The site is only available in read mode. Please run Point Network to get full access to Web 3.0.'
                    );
                } else {
                    reply.send(error);
                }
            } catch (e) {
                console.error('Proxy error:', e);
                reply.send(error);
            }
        },
        onResponse: (request, reply, res) => {
            if (res.includes('<html>')) {
                res = res.replace('</head>', `<script>${point}</script></head>`);
            }
        }
    },
    httpMethods: ['GET']
});

server.listen(5000, (err, address) => {
    if (err) {
        console.error(err);
    } else {
        console.info({address}, 'Success');
    }
});
