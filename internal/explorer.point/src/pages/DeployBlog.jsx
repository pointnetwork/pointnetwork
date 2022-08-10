import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { useState } from 'react';

// TODO: move somewhere
const delay = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

const BLOG_FACTORY_ADDRESS = '0x1Df9546CC23D05D99fE05c0b75278d3172afB8C3';
const ROOT_DIR_ID =
    '10c0366c3bb407a0448f8d1f3c88b4f6f4865e2827c0611e871f3348a8848a6c';
const ROUTES_FILE_ID =
    'c610eae90f7d344183a30049fb217c1c057760fc276ac9acac8bbaf1511ff273';
const ARTIFACT_ID =
    'cb33fc5188dce9d263a1af5e7dd264924e285941cd23883511d9f679623b4413';

const CREATE_BLOG_INTERFACE = {
    inputs: [],
    name: 'createBlog',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
};

const IS_BLOG_CREATED_INTERFACE = {
    inputs: [
        {
            internalType: 'address',
            name: '_blogOwner',
            type: 'address',
        },
    ],
    name: 'isBlogCreated',
    outputs: [
        {
            internalType: 'contract Blog',
            name: '',
            type: 'address',
        },
    ],
    stateMutability: 'view',
    type: 'function',
};

const DeployBlog = () => {
    const { walletIdentity } = useAppContext();
    const [subhandle, setSubhandle] = useState('');
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);

    const checkBlogData = async (acc) => {
        const {
            data: { data: getBlogData },
        } = await axios.post('/v1/api/contract/encodeFunctionCall', {
            jsonInterface: IS_BLOG_CREATED_INTERFACE,
            params: [acc],
            _csrf: window.localStorage.getItem('csrf_token'),
        });
        const blogContractAddressRes = await window.ethereum.request({
            method: 'eth_call',
            params: [
                {
                    from: acc,
                    to: BLOG_FACTORY_ADDRESS,
                    data: getBlogData,
                },
                'latest',
            ],
        });
        const {
            data: {
                data: { 0: blogContractAddress },
            },
        } = await axios.post('/v1/api/contract/decodeParameters', {
            typesArray: ['address'],
            hexString: blogContractAddressRes,
            _csrf: window.localStorage.getItem('csrf_token'),
        });
        return blogContractAddress;
    };

    const deploy = async (subidentity) => {
        try {
            setLoading('Registering subidentity...');
            // 1. deploy subidentity
            await axios.post('/v1/api/identity/sub/register', {
                subidentity,
                parentIdentity: walletIdentity,
                _csrf: window.localStorage.getItem('csrf_token'),
            });
            setLoading('Creating blog contract...');
            // 2. call createBlog
            const [account] = await window.ethereum.request({
                method: 'eth_requestAccounts',
            });
            const {
                data: { data: createBlogData },
            } = await axios.post('/v1/api/contract/encodeFunctionCall', {
                jsonInterface: CREATE_BLOG_INTERFACE,
                params: [],
                _csrf: window.localStorage.getItem('csrf_token'),
            });
            await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [
                    {
                        from: account,
                        to: BLOG_FACTORY_ADDRESS,
                        data: createBlogData,
                    },
                ],
            });
            setLoading('Checking created blog contract...');
            // 3. get blog contract
            // We have an issue that sometimes tx is not mined yet, so we need to try several
            // times with some interval
            // TODO: make it cleaner and manually retryable
            let blogContractAddress;
            for (let i = 0; i < 5; i++) {
                const address = await checkBlogData(account);
                if (address !== '0x0000000000000000000000000000000000000000') {
                    blogContractAddress = address;
                    break;
                }
                await delay(1000);
            }
            if (!blogContractAddress) {
                throw new Error(
                    'Could not check for deployed blog after 5 retries',
                );
            }
            setLoading('Updating IKV...');
            // 4. update IKV rootDir
            await axios.post('/v1/api/identity/ikvPut', {
                identity: `${subidentity}.${walletIdentity}`,
                key: '::rootDir',
                value: ROOT_DIR_ID,
                _csrf: window.localStorage.getItem('csrf_token'),
            });
            // 5. update IKV zdns
            await axios.post('/v1/api/identity/ikvPut', {
                identity: `${subidentity}.${walletIdentity}`,
                key: 'zdns/routes',
                value: ROUTES_FILE_ID,
                _csrf: window.localStorage.getItem('csrf_token'),
            });
            // 6. update IKV contract address
            await axios.post('/v1/api/identity/ikvPut', {
                identity: `${subidentity}.${walletIdentity}`,
                key: 'zweb/contracts/address/Blog',
                value: blogContractAddress,
                _csrf: window.localStorage.getItem('csrf_token'),
            });
            // 7. update IKV contract artifact
            await axios.post('/v1/api/identity/ikvPut', {
                identity: `${subidentity}.${walletIdentity}`,
                key: 'zweb/contracts/abi/Blog',
                value: ARTIFACT_ID,
                _csrf: window.localStorage.getItem('csrf_token'),
            });
            setLoading(null);
            setSuccess(true);
        } catch (e) {
            setLoading(null);
            setError(e.message);
        }
    };

    return (
        <div
            style={{
                marginTop: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                    type="text"
                    value={subhandle}
                    onChange={(e) => {
                        setSuccess(false);
                        setSubhandle(e.target.value);
                    }}
                />
                <p style={{ fontSize: '1.5rem', margin: '0' }}>
                    .{walletIdentity}.point
                </p>
            </div>
            <button
                style={{ marginTop: '20px' }}
                onClick={() => {
                    deploy(subhandle);
                }}
                disabled={loading || success}
            >
                {loading ? 'Processing' : 'Start'}
            </button>
            <p>{loading}</p>
            <p style={{ color: 'indianred' }}>{error}</p>
            {success && (
                <p>
                    Success! Blog is available at:{' '}
                    <a
                        href={`https://${subhandle}.${walletIdentity}.point`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {`https://${subhandle}.${walletIdentity}.point`}
                    </a>
                </p>
            )}
        </div>
    );
};

export default DeployBlog;
