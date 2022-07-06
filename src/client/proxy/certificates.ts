import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

const certCache: Record<string, {key: string, cert: string}> = {};

export function getCertificate(servername: string) {
    // if (!_.endsWith(servername, '.point') && !_.endsWith(servername, '.point')) return null;

    if (!certCache[servername]) {
        certCache[servername] = generateCertificate(servername);
    }

    return certCache[servername];
}

function generateCertificate(servername: string) {
    const pki = forge.pki;
    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();

    const certsPath = path.join(__dirname, '../../../resources/certs');
    const privateCAKey = pki.privateKeyFromPem(fs.readFileSync(`${certsPath}/ca.key`, 'utf8'));
    const caCert = pki.certificateFromPem(fs.readFileSync(`${certsPath}/ca.crt`, 'utf8'));

    cert.publicKey = keys.publicKey;
    function md5(value: string) {
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
    cert.setExtensions(
        [
            {
                name: 'basicConstraints',
                critical: true,
                cA: false
            },
            // {
            //   name: 'keyUsage',
            //   critical: true,
            //   digitalSignature: true,
            //   contentCommitment: true,
            //   keyEncipherment: true,
            //   dataEncipherment: true,
            //   keyAgreement: true,
            //   keyCertSign: true,
            //   cRLSign: true,
            //   encipherOnly: true,
            //   decipherOnly: true
            // },
            {
                name: 'subjectAltName',
                altNames: [{
                    type: 2,
                    value: servername
                }]
            },
            {name: 'subjectKeyIdentifier'},
            {
                name: 'extKeyUsage',
                serverAuth: true,
                clientAuth: true,
                codeSigning: true,
                emailProtection: true,
                timeStamping: true
            },
            {name: 'authorityKeyIdentifier'}
        ]
    );
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
