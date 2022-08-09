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

    const deploy = async (subidentity) => {
        // 1. deploy subidentity
        await axios.post('/v1/api/identity/sub/register', {
            subidentity,
            parentIdentity: walletIdentity,
            _csrf: window.localStorage.getItem('csrf_token'),
        });
        console.log(1);
        // 2. call createBlog
        const [account] = await window.ethereum.request({
            method: 'eth_requestAccounts',
        });
        console.log('acc: ', account);
        const createBlogRes = await axios.post(
            '/v1/api/contract/encodeFunctionCall',
            {
                jsonInterface: CREATE_BLOG_INTERFACE,
                params: [account],
            },
        );
        const { data: createBlogData } = createBlogRes.data;
        console.log(2, createBlogData);
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
        console.log(3);
        // 3. get blog contract
        const getBlogRes = await axios.post(
            '/v1/api/contract/encodeFunctionCall',
            {
                jsonInterface: IS_BLOG_CREATED_INTERFACE,
                params: [account],
            },
        );
        const { data: getBlogData } = getBlogRes.data;
        const blogContractAddress = await window.ethereum.request({
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
        console.log(4, blogContractAddress); // TODO: strip zeros!
        // 4. update IKV rootDir
        await axios.post('/v1/api/identity/ikvPut', {
            identity: `${subidentity}.${walletIdentity}`,
            key: '::rootDir',
            value: ROOT_DIR_ID,
        });
        console.log(5);
        // 5. update IKV zdns
        await axios.post('/v1/api/identity/ikvPut', {
            identity: `${subidentity}.${walletIdentity}`,
            key: 'zdns/routes',
            value: ROUTES_FILE_ID,
        });
        console.log(6);
        // 6. update IKV contract address
        await axios.post('/v1/api/identity/ikvPut', {
            identity: `${subidentity}.${walletIdentity}`,
            key: 'zweb/contracts/address/Blog',
            value: blogContractAddress,
        });
        console.log(7);
        // 7. update IKV contract artifact
        await axios.post('/v1/api/identity/ikvPut', {
            identity: `${subidentity}.${walletIdentity}`,
            key: 'zweb/contracts/abi/Blog',
            value: ARTIFACT_ID,
        });
        console.log(8);
    };

    return (
        <div>
            <input
                type="text"
                value={subhandle}
                onChange={(e) => {
                    setSubhandle(e.target.value);
                }}
            />
            <button
                onClick={() => {
                    deploy(subhandle);
                }}
            >
                Start!
            </button>
        </div>
    );
};

export default DeployBlog;
