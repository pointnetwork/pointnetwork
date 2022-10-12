import {FastifyInstance, FastifyRequest} from 'fastify';
const {uploadFile, getFile, FILE_TYPE} = require('../../storage');
// @ts-expect-error no types for package
import detectContentType from 'detect-content-type';
import isSVG from 'is-svg';
import {isDirectoryJson, setAsAttachment} from '../proxyUtils';
import {Template, templateManager} from '../templateManager';
import {checkAuthToken} from '../middleware/auth';
import {sanitizeSVG} from '../../../util';

// TODO: we don't handle multiple files upload. But if we want to,
// we should change the response format
const attachStorageHandlers = (server: FastifyInstance) => {
    ['/_storage/', '/_storage'].forEach(route => {
        server.post(route, async (req, res) => {
            if (!req.headers['content-type']?.match('multipart/form-data')) {
                return res.status(415).send('Only multipart/form-data is supported');
            }

            await checkAuthToken(req, res);

            const file = await req.file();
            if (!file) {
                return res.status(400).send('No files in the body');
            }

            const fileBuf = await file.toBuffer();
            const uploadedId = await uploadFile(fileBuf);
            return {data: uploadedId};
        });
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

        let contentType = detectContentType(file);

        // SVGs are detected as `text/xml` and sometimes `text/plain`,
        // which causes them to be downloaded instead of rendered.
        // Use the correct content-type if the xml is actually an svg.
        if (isSVG(fileString)) {
            contentType = 'image/svg+xml';
            // Sanitize SVG to prevent XSS.
            file = sanitizeSVG(file);
        }

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
