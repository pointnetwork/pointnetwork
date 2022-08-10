import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { useState } from 'react';

const BLOG_FACTORY_ADDRESS = '0xD3e161067e4447A225652A1389Df70ad9d5bF86D'; // TODO: replace
const ROOT_DIR_ID =
    '10c0366c3bb407a0448f8d1f3c88b4f6f4865e2827c0611e871f3348a8848a6c';
const ROUTES_FILE_ID =
    'c610eae90f7d344183a30049fb217c1c057760fc276ac9acac8bbaf1511ff273';
const ARTIFACT_ID =
    '214cdea80f7acb699d380cf16c0eb3533c9f1e4f77910cbd607523f4070bb995';

const CREATE_BLOG_INTERFACE = {
    inputs: [
        {
            internalType: 'address',
            name: '_blogOwner',
            type: 'address',
        },
    ],
    name: 'createBlog',
    outputs: [],
    stateMutability: 'payable',
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
                params: [account],
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
            const {
                data: { data: getBlogData },
            } = await axios.post('/v1/api/contract/encodeFunctionCall', {
                jsonInterface: IS_BLOG_CREATED_INTERFACE,
                params: [account],
                _csrf: window.localStorage.getItem('csrf_token'),
            });
            const blogContractAddressRes = await window.ethereum.request({
                method: 'eth_call',
                params: [
                    {
                        from: account,
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
