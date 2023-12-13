import {readFile} from 'fs/promises';
import Handlebars from 'handlebars';
import path from 'path';
import logger from '../../core/log';

const log = logger.child({module: 'templateManager'});

export enum Template {
  REDIRECT = 'redirect',
  ERROR = 'error',
  DIRECTORY = 'directory',
  WEB2LINK = 'web2link'
}

class TemplateManager {

    private templates: Record<string, HandlebarsTemplateDelegate> = Object.create(null);

    private async getTemplate(name: Template): Promise<HandlebarsTemplateDelegate> {
        if (!this.templates[name]) {
            try {
                // TODO: we should not refer to src, either copy views to dist during build, or move to resources
                const source = await readFile(path.resolve(__dirname, '..', '..', '..', 'src', 'client', 'proxy', 'views', `${name}.hbs`), 'utf-8');
                this.templates[name] = Handlebars.compile(source);
            } catch (error) {
                log.error(error);
                throw `Could not load template ${name}`;
            }
        }
        return this.templates[name];
    }

    async render<C = unknown>(templateName: Template, context: C): Promise<string> {
        return (await this.getTemplate(templateName))(context);
    }
}

export const templateManager = new TemplateManager();
