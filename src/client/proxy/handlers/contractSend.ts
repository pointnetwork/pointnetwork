import {FastifyInstance, FastifyRequest} from 'fastify';
import {parse} from 'query-string';
import blockchain from '../../../network/providers/ethereum';
import {Template, templateManager} from '../templateManager';
import {escapeString} from '../../../util';
const {uploadData} = require('../../storage');

const attachContractSendHandler = (server: FastifyInstance) => {
    server.post(
        '/_contract_send/:contractAndMethod',
        async (req: FastifyRequest<{
            Params: {contractAndMethod: string};
            Body: Record<string, unknown>
        }>, res) => {
            if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
                return res.status(415).send('Only application/x-www-form-urlencoded is supported');
            }

            const urlData = req.urlData();
            const queryParams = parse(urlData.query ?? '');
            const entries = req.body;
            let contractName;
            let methodName;
            let paramNames;
            try {
                const [_contractName, methodNameAndParams] = req.params.contractAndMethod.split('.');
                contractName = _contractName;
                const [_methodName, paramsEncoded] = methodNameAndParams.split('(');
                methodName = _methodName;
                paramNames = decodeURI(paramsEncoded).replace(')', '').split(',')
                    .map(e => e.trim())
                    .filter(name => Boolean(name)); // To filter out empty string in case of no args
            } catch (e) {
                return res.status(400)
                    .send('Bad params. Should be /_contract_send/Contract.method(arg1,arg2). Spaces between arg names can be URL encoded');
            }

            // TODO: this is the check which was in the previous proxy version.
            // But we should compare the version with the latest one, and not only allow
            // 'latest' keyword, right?
            if ('__point_version' in queryParams && queryParams.__point_version !== 'latest') {
                return res.status(403).send('Contract send does not allowed for versions different than latest');
            }

            let redirectUrl;
            for (const k in entries) {
                if (k.startsWith('storage[')) {
                    const uploadedId = await uploadData(entries[k]);

                    delete entries[k];
                    entries[k.replace('storage[', '').replace(']', '')] = uploadedId;
                } else if (k === '__redirect') {
                    redirectUrl = entries[k];
                    delete entries[k];
                }
            }

            const paramValues = [];
            for (const paramName of paramNames) {
                if (paramName in entries) {
                    paramValues.push(entries[paramName]);
                } else {
                    return res.status(400).send(`Error: no ${
                        escapeString(paramName)} param in the data, but exists as an argument to the contract call.`);
                }
            }

            const callRes = await blockchain.sendToContract(
                req.headers.host!.replace('.point', ''),
                contractName,
                methodName,
                paramValues
            );

            if (redirectUrl) {
                res.header('content-type', 'text/html');
                return templateManager.render(Template.REDIRECT, {redirectUrl});
            }
            return callRes;
        });
};

export default attachContractSendHandler;
