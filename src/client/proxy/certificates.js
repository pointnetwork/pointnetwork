const forge = require('node-forge');
const fs = require('fs');

const certCache = {};

function getCertificate(servername) {
    // if (!_.endsWith(servername, '.z') && !_.endsWith(servername, '.point')) return null;

    if (!certCache[servername]) {
        certCache[servername] = generateCertificate(servername);
    }

    return certCache[servername];
}

function generateCertificate(servername) {
    const pki = forge.pki;
    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();

    const privateCAKey = pki.privateKeyFromPem(fs.readFileSync('./src/client/proxy/certs/ca.key'));
    const caCert = pki.certificateFromPem(fs.readFileSync('./src/client/proxy/certs/ca.crt'));

    cert.publicKey = keys.publicKey;
    function md5(value) {
        return require('crypto').createHash('md5').update(value).digest('hex');
    }
    cert.serialNumber = md5(servername + Date.now());
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

    const attrs = [
        {name: 'commonName', value: servername},
        {name: 'countryName', value: 'US'},
        {shortName: 'ST', value: 'Virginia'},
        {name: 'localityName', value: 'Blacksburg'},
        {name: 'organizationName', value: 'Test'},
        {shortName: 'OU', value: 'Test'}
    ];
    cert.setSubject(attrs);
    cert.setIssuer(caCert.subject.attributes);
    // cert.sign(keys.privateKey);
    cert.sign(privateCAKey);

    // PEM-format keys and cert
    const pem = {
        privateKey: pki.privateKeyToPem(keys.privateKey),
        publicKey: pki.publicKeyToPem(keys.publicKey),
        certificate: pki.certificateToPem(cert)
    };

    return {
        key: pem.privateKey,
        cert: pem.certificate
        // ca: appCert.ca ? sslCADecode(
        //     fs.readFileSync(appCert.ca, "utf8"),
        // ) : null,
    };
}

module.exports = {getCertificate};
