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
import {checkAuthToken} from '../middleware/auth';

// TODO: we don't handle multiple files upload. But if we want to,
// we should change the response format
const attachEncryptedStorageHandlers = (server: FastifyInstance) => {
    ['/_encryptedStorage/', '/_encryptedStorage'].forEach(route => {
        server.post(route, async (req, res) => {
            if (!req.headers['content-type']?.match('multipart/form-data')) {
                return res.status(415).send('Only multipart/form-data is supported');
            }

            await checkAuthToken(req, res);

            const file = await req.file();
            if (!file) {
                return res.status(400).send('No files in the body');
            }

            //get the identities that will be used for encyption 
            const identities = req.headers['identities']?.toString();
            if (identities === undefined || identities === ''){
                return res.status(400).send('No identity passed');
            }

            //get the pks that will be used for encyption 
            const pks: string[] = [];
            for (const id of identities.split(',')){
                const publicKey = await blockchain.commPublicKeyByIdentity(id);

                //data validation
                if(publicKey === undefined)
                    throw new Error(`Public key not found for the identity ${id}`);

                pks.push(publicKey);
            }

            let dataArray: any = [];
            const fileBuf = await file.toBuffer();
            dataArray.push(fileBuf);

            const metadata = req.headers['metadata']?.toString();
            dataArray = dataArray.concat(metadata?.split(','));

            const {host} = req.headers;

            //data validation
            if(host === undefined)
                throw new Error("Host header parameter is required for encryption");

            //call the encryption method
            const encryptedData = await encryptMultipleData(host, dataArray, pks);

            //get for now only one encrypted data for upload, can be multiple in a loop in the future.
            const dataToUpload = Buffer.from(encryptedData.encryptedMessages[0], 'hex');

            //upload the file
            const uploadedId = await uploadFile(dataToUpload);

            //return the encrypted data and the encrypted symmetric keys
            return {
                data: uploadedId,
                metadata: encryptedData.encryptedMessages.slice(1),
                encryptedMessagesSymmetricObjs: encryptedData.encryptedMessagesSymmetricObjs
            };
        });
    });

    // gets an encrypted file, decrypts it and return to the user
    server.get('/_encryptedStorage/:hash', async (req: FastifyRequest<{Params: {hash: string}}>, res) => {
        await checkAuthToken(req, res);
        let file;

        //get the encrypted symmetric key from the query string
        const qs = req.query as {eSymmetricObj: string, symmetricObj: string};
        try {
            //get the file
            file = await getFile(req.params.hash, null);
        } catch (e) {
            return res.status(404).send('Not found');
        }
        const {host} = req.headers;

        //data validation
        if(host === undefined)
            throw new Error("Host header parameter is required for encryption");

        const fileBuffer = Buffer.from(file, 'hex');

        //get the private key from the logged user
        const privateKey = getNetworkPrivateKey();

        //decrypt the file
        let decryptedData;
        if (qs.eSymmetricObj){
            //using and encrypted symmetric key
            const encryptedSymmetricObj = getEncryptedSymetricObjFromJSON(
                JSON.parse(qs.eSymmetricObj)
            );
            decryptedData = await decryptData(host, fileBuffer, encryptedSymmetricObj, privateKey);
        } else if (qs.symmetricObj){
            //using an decrypted symmetric key
            decryptedData = await decryptDataWithDecryptedKey(host, fileBuffer, qs.symmetricObj);
        } else {
            throw new Error('No symmetric obj passed');
        }

        //return the data for the user.
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
};

export default attachEncryptedStorageHandlers;
