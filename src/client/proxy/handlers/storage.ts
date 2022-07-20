import {FastifyInstance, FastifyRequest} from 'fastify';
const {uploadFile, getFile, FILE_TYPE} = require('../../storage');
// @ts-expect-error no types for package
import detectContentType from 'detect-content-type';
import {isDirectoryJson, setAsAttachment} from '../proxyUtils';
import {Template, templateManager} from '../templateManager';
import blockchain from '../../../network/providers/ethereum';
import {
    encryptMultipleData,
    decryptData,
    decryptDataWithDecryptedKey,
    getEncryptedSymetricObjFromJSON
} from '../../../client/encryptIdentityUtils';
import {getNetworkPrivateKey} from '../../../wallet/keystore';
import { Exception } from 'handlebars';

// TODO: we don't handle multiple files upload. But if we want to,
// we should change the response format
const attachStorageHandlers = (server: FastifyInstance) => {
    ['/_storage/', '/_storage'].forEach(route => {
        server.post(route, async (req, res) => {
            if (!req.headers['content-type']?.match('multipart/form-data')) {
                return res.status(415).send('Only multipart/form-data is supported');
            }

            const file = await req.file();
            if (!file) {
                return res.status(400).send('No files in the body');
            }

            const fileBuf = await file.toBuffer();
            const uploadedId = await uploadFile(fileBuf);
            return {data: uploadedId};
        });
    });
    
    ['/_encryptedStorage/', '/_encryptedStorage'].forEach(route => {
        server.post(route, async (req, res) => {
            if (!req.headers['content-type']?.match('multipart/form-data')) {
                return res.status(415).send('Only multipart/form-data is supported');
            }

            const file = await req.file();
            if (!file) {
                return res.status(400).send('No files in the body');
            }
            
            const identities = req.headers['identities']?.toString();
            if (identities === undefined || identities === ''){
                return res.status(400).send('No identity passed');
            }
            const pks = [];
            for (const id of identities.split(',')){
                const publicKey = await blockchain.commPublicKeyByIdentity(id);
                pks.push(publicKey);
            }
            
            let dataArray: any = [];
            const fileBuf = await file.toBuffer();
            dataArray.push(fileBuf);

            const metadata = req.headers['metadata']?.toString();
            dataArray = dataArray.concat(metadata?.split(','));

            const {host} = req.headers;
            const encryptedData = await encryptMultipleData(host, dataArray, pks);
            const dataToUpload = Buffer.from(encryptedData.encryptedMessages[0], 'hex');
            const uploadedId = await uploadFile(dataToUpload);
            return {
                data: uploadedId, 
                metadata: encryptedData.encryptedMessages.slice(1), 
                encryptedMessagesSymmetricObjs: encryptedData.encryptedMessagesSymmetricObjs
            };
        });
    });

    server.get('/_encryptedStorage/:hash', async (req: FastifyRequest<{Params: {hash: string}}>, res) => {
        let file;
        const qs = req.query as {eSymmetricObj: string, symmetricObj: string};
        try {
            file = await getFile(req.params.hash, null);
        } catch (e) {
            return res.status(404).send('Not found');
        }
        const {host} = req.headers;
        const fileBuffer = Buffer.from(file, 'hex');
        const privateKey = getNetworkPrivateKey();

        let decryptedData;
        console.log(qs);
        if(qs.eSymmetricObj){
            const encryptedSymmetricObj = getEncryptedSymetricObjFromJSON(
                JSON.parse(qs.eSymmetricObj)
            );
            decryptedData = await decryptData(host, fileBuffer, encryptedSymmetricObj, privateKey);
        }else if (qs.symmetricObj){
            decryptedData = await decryptDataWithDecryptedKey(host, fileBuffer, qs.symmetricObj);
        }else{
            throw new Error("No symmetric obj passed");
        }
        
        const fileString = decryptedData.plaintext.toString();
        file = decryptedData.plaintext;
        
        if (isDirectoryJson(fileString)) {
            const filesInfo = JSON.parse(fileString).files.map((file: Record<string, string>) => {
                const ext = file.name.split('.').slice(-1);

                const icons: Record<typeof FILE_TYPE, string> = {
                    [FILE_TYPE.fileptr]: '&#128196; ',
                    [FILE_TYPE.dirptr]: '&#128193; '
                };

                return {
                    icon: icons[file.type] || '&#10067; ',
                    fileId: file.id,
                    link: `/_storage/${file.id}${file.type === FILE_TYPE.fileptr ? '.' + ext : ''}`,
                    name: file.name,
                    size: file.size
                };
            });
            res.header('content-type', 'text/html');
            return templateManager.render(Template.DIRECTORY, {id: req.params.hash, filesInfo});
        }

        const contentType = detectContentType(file);
        const acceptHeaders = req.headers.accept === undefined ? '' : req.headers.accept;

        res.header('content-type', contentType);

        // if requesting a file directly from storage and the accept headers are wide open
        // and the file is not an image or video then return as a file attachment
        if (setAsAttachment(req.routerPath, contentType, acceptHeaders)) {
            res.header('Content-Disposition', 'attachment');
        }

        return file;
    });

    server.get('/_storage/:hash', async (req: FastifyRequest<{Params: {hash: string}}>, res) => {
        let file;
        try {
            file = await getFile(req.params.hash, null);
        } catch (e) {
            return res.status(404).send('Not found');
        }
        const fileString = file.toString();

        if (isDirectoryJson(fileString)) {
            const filesInfo = JSON.parse(fileString).files.map((file: Record<string, string>) => {
                
                const icons: Record<typeof FILE_TYPE, string> = {
                    [FILE_TYPE.fileptr]: '&#128196; ',
                    [FILE_TYPE.dirptr]: '&#128193; '
                };

                return {
                    icon: icons[file.type] || '&#10067; ',
                    fileId: file.id,
                    link: `/_storage/${file.id}`,
                    name: file.name,
                    size: file.size
                };
            });
            res.header('content-type', 'text/html');
            return templateManager.render(Template.DIRECTORY, {id: req.params.hash, filesInfo});
        }

        const contentType = detectContentType(file);
        const acceptHeaders = req.headers.accept === undefined ? '' : req.headers.accept;

        res.header('content-type', contentType);

        // if requesting a file directly from storage and the accept headers are wide open
        // and the file is not an image or video then return as a file attachment
        if (setAsAttachment(req.routerPath, contentType, acceptHeaders)) {
            res.header('Content-Disposition', 'attachment');
        }

        return file;
    });
};

export default attachStorageHandlers;
