import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { useState } from 'react';

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
                    &nbsp; (But it may take a while for it to be available)
                </p>
            )}
        </div>
    );
};

export default DeployBlog;
