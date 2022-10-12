import path from 'path';
import fs from 'fs';
import {sanitizeSVG} from './sanitizeSVG';

describe('sanitizeSVG', () => {
    const assetsDir = path.join(__dirname, '..', '..', 'tests', 'resources', 'xss_svg');
    const goodSVG = fs.readFileSync(path.join(assetsDir, 'good.svg'), 'utf-8');
    const badSVG = fs.readFileSync(path.join(assetsDir, 'bad.svg'), 'utf-8');
    const worseSVG = fs.readFileSync(path.join(assetsDir, 'worse.svg'), 'utf-8');

    it('should throw when input is a random string instead of an SVG element', () => {
        expect(() => sanitizeSVG('This is not a valid SVG')).toThrowError('Not a valid SVG.');
    });

    it('should throw when input (string) is an HTML element other than SVG', () => {
        expect(() => sanitizeSVG('<p>not svg</p>')).toThrowError('Not a valid SVG.');
    });

    it('should throw when input (buffer) is an HTML element other than SVG', () => {
        expect(() => sanitizeSVG(Buffer.from('<p>not svg</p>'))).toThrowError('Not a valid SVG.');
    });

    it('should return a good SVG (as string) as is', () => {
        const output = sanitizeSVG(goodSVG);
        expect(output).toEqual(goodSVG);
    });

    it('should return a good SVG (as buffer) as is', () => {
        const output = sanitizeSVG(Buffer.from(goodSVG));
        expect(output).toEqual(goodSVG);
    });

    it('should remove script tags from SVG', () => {
        const output = sanitizeSVG(Buffer.from(badSVG));
        expect(output).toEqual(goodSVG);
    });

    it('should remove script tags and script attributes from SVG', () => {
        const output = sanitizeSVG(Buffer.from(worseSVG));
        expect(output).toEqual(goodSVG);
    });
});
