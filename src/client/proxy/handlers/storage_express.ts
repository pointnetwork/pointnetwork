const {getFile, FILE_TYPE} = require('../../storage');
// @ts-expect-error no types for package
import detectContentType from 'detect-content-type';
import {isDirectoryJson, setAsAttachment} from '../proxyUtils';
import {Template, templateManager} from '../templateManager';
import {Express, Request as ExpressRequest, Response as ExpressResponse} from 'express';
import logger from '../../../core/log';

const log = logger.child('Proxy storage handler');

// TODO: we don't handle multiple files upload. But if we want to,
// we should change the response format
const attachStorageHandlers = (server: Express) => {    
    server.get('/_storage/:hash', async (
        req: ExpressRequest<{hash: string}>,
        res: ExpressResponse
    ) => {
        log.warn({hash: req.params.hash}, 'A file has been requested from storage');
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
        if (setAsAttachment(req.path, contentType, acceptHeaders)) {
            res.header('Content-Disposition', 'attachment');
        }

        return file;
    });
};

export default attachStorageHandlers;
