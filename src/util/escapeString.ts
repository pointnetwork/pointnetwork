import {encode} from 'html-entities';

export const escapeString = (str: string) => encode(str);
