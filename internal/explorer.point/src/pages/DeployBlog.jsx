import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { useState } from 'react';

const VERSION = '0.1';
const ROOT_DIR_ID =
    'c4226811df9ef1f97080b6b9d1af107a9795389d8e71beb18717b3b5d6edc1d9';
const ROUTES_FILE_ID =
    '0b5f577f90775b5f92e3afc5e0ece7ddbf34fe024dcab4a1fb009900738b5ac9';
const CONTRACT_SOURCE_ID =
    '5a6b7f2104a6aedb1e25eb2581c345bdc1ada72b536a48fc6a90699e13f04f4c';

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
            await axios.post('/v1/api/identity/sub/register', {
                subidentity,
                parentIdentity: walletIdentity,
                _csrf: window.localStorage.getItem('csrf_token'),
            });

            // 2. Download contract
            setLoading('Downloading blog contract...');
            const { data: contractFile } = await axios.get(
                `/_storage/${CONTRACT_SOURCE_ID}`,
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
            );

            // 4. update IKV rootDir
            setLoading('Updating IKV...');
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
                    </a>{' '}
                    (But it may take a while for it to be available)
                </p>
            )}
        </div>
    );
};

export default DeployBlog;
