import {FastifyInstance, FastifyRequest} from 'fastify';
import {parse} from 'query-string';
import utils from '../../../core/utils';
import blockchain from '../../../network/blockchain';
const {uploadFile} = require('../../storage');

const attachContractSendHandler = (server: FastifyInstance) => {
    server.post(
        '/_contract_send/:contractAndMethod',
        async (req: FastifyRequest<{Params: {contractAndMethod: string}; Body: Record<string, unknown>}>, res) => {
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

            for (const k in entries) {
                if (k.startsWith('storage[')) {
                    const uploadedId = await uploadFile(entries[k]);

                    delete entries[k];
                    entries[k.replace('storage[', '').replace(']', '')] = uploadedId;
                }
            }

            const paramValues = [];
            for (const paramName of paramNames) {
                if (paramName in entries) {
                    paramValues.push(entries[paramName]);
                } else {
                    return res.status(400).send(`Error: no ${
                        utils.escape(paramName)} param in the data, but exists as an argument to the contract call.`);
                }
            }

            return blockchain.sendToContract(
                req.headers.host!.replace('.point', ''),
                contractName,
                methodName,
                paramValues
            );
        });
};

export default attachContractSendHandler;
