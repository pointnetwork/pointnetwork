import axios from 'axios';
import { useAppContext } from '../../context/AppContext';
import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import Carousel from 'react-bootstrap/Carousel';
import FormControl from 'react-bootstrap/FormControl';
import image1 from '../../assets/blog-images/blogsoftware-1.png';
import image2 from '../../assets/blog-images/blogsoftware-2.png';
import image3 from '../../assets/blog-images/blogsoftware-3.png';
import image4 from '../../assets/blog-images/blogsoftware-4.png';
import image5 from '../../assets/blog-images/blogsoftware-5.png';
import image6 from '../../assets/blog-images/blogsoftware-6.png';
import './DeplyBlog.css';

// TODO: do something better than hard-coding
const VERSION = '0.1';
const ROOT_DIR_ID =
    'ce1c2390b718a85396957ac9da91e67cf8bff65e8a195bdec9578bb5b1c98bbc';
const ROUTES_FILE_ID =
    '05c71d99f342cd84012d79a1b3e255841240bda7a12a144d0c48c1ac67b5698f';
const CONTRACT_SOURCE_ID =
    '445d2fc2ddb9e79e2a56990b711685069460c26162eb5dbab69c1de828d79466';

const BLOG_IMAGES = [
    { caption: 'Create blog posts', img: image1 },
    { caption: 'Share on your wall', img: image2 },
    { caption: 'Blog post preview - 1', img: image3 },
    { caption: 'Blog post preview - 2', img: image4 },
    { caption: 'Admin Panel', img: image6 },
    { caption: 'Customization', img: image5 },
];

const DeployBlog = () => {
    const { walletIdentity } = useAppContext();
    const [subhandle, setSubhandle] = useState('');
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);

    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    const deploy = async (subidentity) => {
        try {
            // 1. checking if subidentity is already registered
            setLoading('Checking subidentity...');
            const {
                data: { identityRegistered },
            } = await axios.get(
                `/v1/api/identity/identityRegistered?identity=${subidentity}.${walletIdentity.toLowerCase()}`,
                {
                    headers: {
                        'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                    },
                },
            );
            if (identityRegistered) {
                // checking if there's a website already on this identity
                const ikvset = await window.point.contract.call({
                    contract: 'Identity',
                    method: 'getIkvList',
                    params: [`${subidentity}.${walletIdentity.toLowerCase()}`],
                });
                if (ikvset.data) {
                    if (ikvset.data.find((el) => el[1] === 'zdns/routes')) {
                        setError(
                            'A website is already deployed on this address. Please, choose another subidentity',
                        );
                        setLoading(null);
                        return;
                    }
                }
            } else {
                // deploy subidentity
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
            }

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
            formData.append(
                'target',
                `${subidentity}.${walletIdentity.toLowerCase()}`,
            );
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
                    identity: `${subidentity}.${walletIdentity.toLowerCase()}`,
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
                    identity: `${subidentity}.${walletIdentity.toLowerCase()}`,
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
        <div className="deploy-container p-5">
            {success ? (
                <Alert variant="success">
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
                <Alert variant="danger">
                    <Alert.Heading>Deployment Failed!</Alert.Heading>
                    <p>
                        {typeof error === 'string' ? (
                            error
                        ) : (
                            <>
                                Failed to deploy blog at:
                                {` https://${subhandle}.${walletIdentity}.point. `}
                                Please try again.
                            </>
                        )}
                    </p>
                </Alert>
            ) : null}
            <Row>
                <Col xs={5}>
                    <h1 className="mt-2 mb-2 ">
                        Share your ideas over your own domain, uncensored.
                    </h1>
                    <h4>Launch your own blogging site!</h4>
                    <p className="mt-4 mb-0 text-secondary">
                        Enter the subdomain below where you want your blog to be
                        deployed.
                    </p>
                    <p className="mt-0 text-secondary">
                        A great option is &quot;blog.{walletIdentity}
                        .point&quot;, but you can pick any name you want.
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
                    <p className="mt-0 text-secondary">{loading}</p>
                    <Button
                        variant="primary"
                        onClick={() => {
                            deploy(subhandle.toLowerCase());
                        }}
                        disabled={Boolean(loading) || success || !subhandle}
                    >
                        {loading ? 'Deploying...' : 'Deploy'}
                    </Button>
                </Col>
                <Col xs={1}></Col>
                <Col
                    xs={6}
                    className="position-relative d-flex flex-column align-items-center justify-content-center"
                >
                    <h4 className="mb-3 text-white">
                        {BLOG_IMAGES[activeSlideIndex].caption}
                    </h4>
                    <Carousel
                        interval={2000}
                        className="shadow-lg"
                        indicators={false}
                        pause={false}
                        onSlide={setActiveSlideIndex}
                    >
                        {BLOG_IMAGES.map((item) => (
                            <Carousel.Item key={item.caption}>
                                <Image
                                    src={item.img}
                                    fluid
                                    rounded
                                    className="border"
                                />
                            </Carousel.Item>
                        ))}
                    </Carousel>
                    <div className="bg-primary rounded clipped-bg position-absolute top-0"></div>
                </Col>
            </Row>
        </div>
    );
};

export default DeployBlog;
