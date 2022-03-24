import {FastifyInstance, FastifyRequest} from 'fastify';
const {uploadFile, getFile, FILE_TYPE} = require('../../storage');
// @ts-expect-error no types for package
import detectContentType from 'detect-content-type';
import {isDirectoryJson} from '../proxyUtils';
import {Template, templateManager} from '../templateManager';

// TODO: we don't handle multiple files upload. But if we want to,
// we should change the response format
const attachStorageHandlers = (server: FastifyInstance) => {
    ['/_storage/', '/_storage'].forEach(route => {
        server.post(route, async req => {
            const file = await req.file();
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
            const filesInfo = JSON.parse(fileString).files.map(
                (file: Record<string, string>) => {
                    const ext = file.name.split('.').slice(-1);
                    return {
                        icon: file.type === FILE_TYPE.fileptr
                            ? '&#128196; '
                            : file.type === FILE_TYPE.dirptr
                                ? '&#128193; '
                                : '&#10067; ',
                        fileId: file.id,
                        link: `/_storage/${file.id}${file.type === FILE_TYPE.fileptr ? '.' + ext : ''}`,
                        name: file.name,
                        size: file.size
                    };
                });
            res.header('content-type', 'text/html');
            return templateManager.render(Template.DIRECTORY, {id: req.params.hash, filesInfo});
        }

        res.header('content-type', detectContentType(file));
        return file;
    });
};

export default attachStorageHandlers;
