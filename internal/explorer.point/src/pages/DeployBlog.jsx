import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import FormControl from 'react-bootstrap/FormControl';
import './deploy.css';

const VERSION = '0.1';
const ROOT_DIR_ID =
    '6ce5c3f525128f4173cd4931870b28d05280d66bd206826be1f23242d05c94bb';
const ROUTES_FILE_ID =
    '5f38f36718c426e74ded142347ecc4310e8eb4755c31ce06bcecd26cdbfe7b41';
const CONTRACT_SOURCE_ID =
    '042a2609875d2f5b628896adfc3affec2fd8aaf104f8824918cd94086872dc66';

const DeployBlog = () => {
    const { walletIdentity } = useAppContext();
    const [subhandle, setSubhandle] = useState('');
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);

    const deploy = async (subidentity) => {
        try {
            // 1. deploy subidentity
            setLoading('Registering subidentity...');
            await axios.post(
                '/v1/api/identity/sub/register',
                {
                    subidentity,
                    parentIdentity: walletIdentity,
                    _csrf: window.localStorage.getItem('csrf_token'),
                },
                {
                    headers: {
                        'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                    },
                },
            );

            // 2. Download contract
            setLoading('Downloading blog contract...');
            const { data: contractFile } = await axios.get(
                `/_storage/${CONTRACT_SOURCE_ID}`,
                {
                    headers: {
                        'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                    },
                },
            );

            // 3. Deploy contract
            setLoading('Deploying blog contract...');
            const formData = new FormData();
            formData.append('contractNames', '["Blog"]');
            formData.append('version', VERSION);
            formData.append('target', `${subidentity}.${walletIdentity}`);
            formData.append(
                'dependencies',
                '["@openzeppelin/contracts", "@openzeppelin/contracts-upgradeable"]',
            );
            formData.append(
                'files',
                new Blob([contractFile], { type: 'text/plain' }),
            );
            await axios.post(
                '/point_api/deploy_upgradable_contracts',
                formData,
                {
                    headers: {
                        'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                    },
                },
            );

            // 4. update IKV rootDir
            setLoading('Updating IKV...');
            await axios.post(
                '/v1/api/identity/ikvPut',
                {
                    identity: `${subidentity}.${walletIdentity}`,
                    key: '::rootDir',
                    value: ROOT_DIR_ID,
                    _csrf: window.localStorage.getItem('csrf_token'),
                },
                {
                    headers: {
                        'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                    },
                },
            );
            // 5. update IKV zdns
            await axios.post(
                '/v1/api/identity/ikvPut',
                {
                    identity: `${subidentity}.${walletIdentity}`,
                    key: 'zdns/routes',
                    value: ROUTES_FILE_ID,
                    _csrf: window.localStorage.getItem('csrf_token'),
                },
                {
                    headers: {
                        'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                    },
                },
            );
            setLoading(null);
            setSuccess(true);
            setError(null);
        } catch (e) {
            setLoading(null);
            setError(e.message);
        }
    };

    return (
        <div className="deploy-container">
            {success ? (
                <Alert variant="success" className="mt-4">
                    <Alert.Heading>Deployment Successful!</Alert.Heading>
                    <p>
                        Blog is available at:{' '}
                        <Alert.Link
                            href={`https://${subhandle}.${walletIdentity}.point`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {`https://${subhandle}.${walletIdentity}.point`}
                        </Alert.Link>
                        . You can now visit your domain and start writing blog
                        posts. (But it may take a while for it to be available)
                    </p>
                </Alert>
            ) : error ? (
                <Alert variant="danger" className="mt-4">
                    <Alert.Heading>Deployment Failed!</Alert.Heading>
                    <p>
                        Failed to deploy blog at:
                        {` https://${subhandle}.${walletIdentity}.point. `}
                        Please try again.
                    </p>
                </Alert>
            ) : null}
            <Row className="my-5">
                <Col>
                    <h1 className="mt-2 mb-2">
                        Share your ideas over your own domain, uncensored.
                    </h1>
                    <h4>Launch your own blogging site!</h4>
                    <p className="mt-5 mb-0 text-secondary">
                        Enter the subdomain below where you want your blog to be
                        deployed.
                    </p>
                    <p className="mt-0 text-secondary">
                        A great option is "blog.{walletIdentity}.point", but you
                        can pick any name you want.
                    </p>
                    <Row className="align-items-center mb-3">
                        <Col style={{ paddingRight: 0 }}>
                            <FormControl
                                value={subhandle}
                                type="text"
                                placeholder="blog"
                                onChange={(e) => {
                                    setSuccess(false);
                                    setSubhandle(e.target.value);
                                }}
                            />
                        </Col>
                        <Col>.{walletIdentity}.point</Col>
                    </Row>
                    <Button
                        variant="primary"
                        onClick={() => {
                            deploy(subhandle);
                        }}
                        disabled={loading || success || !subhandle}
                    >
                        Deploy
                    </Button>
                </Col>
                <Col className="position-relative">
                    {/* <Image src={image} fluid rounded className="p-4 pt-5" /> */}
                    <h1 className="position-absolute text-white top-50 start-50 translate-middle">
                        We'll show an image carousal here
                    </h1>
                    <div className="bg-primary rounded clipped-bg position-absolute top-0"></div>
                </Col>
            </Row>
        </div>
    );
};

export default DeployBlog;
