// Note: Don't worry about line width, it will get formatted properly

let disclaimer = `
  
    DISCLAIMER: This is an alpha version of an experimental open source software released under the MIT license
    and may contain errors and/or bugs.
    By running and continuing to run this software you agree with the following:
    You warrant and represent that you have read this disclaimer, understand its contents, assume all risk related
    thereto and hereby release, waive, discharge and covenant not to hold liable Point Network Ltd. or any of its officers,
    employees or affiliates from and for any direct or indirect damage resulting from the software or the use thereof.
    Such to the extent as permissible by applicable laws and regulations.
    Use of the software is at your own risk and discretion. No guarantee whatsoever
    is made regarding its suitability for your intended purposes and its compliance
    with applicable law and regulations. It is up to the user to determine the
    software's quality and suitability and whether its use is compliant with its
    respective regulatory regime, especially in the case that you are operating in a
    commercial context. You bear responsibility for any and all content being shared by
    you on the network using this software.

`;

// From: https://stackoverflow.com/a/51506718/5380330
// Dynamic Width (Build Regex)
const wrap = (s, w, indent_h, indent_v) => ' '.repeat(indent_h) + "\n".repeat(indent_v) + s.replace(
    new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1\n'+' '.repeat(indent_h)
) + "\n".repeat(indent_v);

const no_new_lines = (s) => s.replace(/[\s\t\r\n]+/g, ' ');

const terminal_width = process.stdout.columns;
const wrap_length = terminal_width - 10;
const indent_h = 4;
const indent_v = 3;

module.exports = wrap( no_new_lines( disclaimer ), wrap_length, indent_h, indent_v );