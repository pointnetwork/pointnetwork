import { useState, useEffect } from 'react';
import Loading from './Loading';

const PublicKeyRow = ({ handle, isOwner, walletPublicKey }) => {
    const [loading, setLoading] = useState(false);
    const [publicKey, setPublicKey] = useState('');

    useEffect(() => {
        async function fetchPublicKey() {
            setLoading(true);
            try {
                const result = await window.point.identity.publicKeyByIdentity({
                    identity: handle,
                });
                setPublicKey(result.data.publicKey);
            } catch {
                setPublicKey('');
            } finally {
                setLoading(false);
            }
        }

        if (isOwner && !handle.endsWith('.sol')) {
            setPublicKey(walletPublicKey);
        } else {
            fetchPublicKey();
        }
    }, [isOwner]);

    const renderPublicKey = () => {
        if (!publicKey && !isOwner) {
            return 'n/a';
        }
        if (!publicKey && isOwner) {
            return 'It will be available after you link your Point Address to your SOL domain.';
        }

        const matches = publicKey.replace('0x', '').match(/.{1,8}/g);
        return matches ? matches.join(' ') : publicKey;
    };

    return (
        <tr>
            <th>Communication Public Key:</th>
            <td className="overflow-wrap: break-word;">
                {loading ? <Loading /> : renderPublicKey()}
            </td>
        </tr>
    );
};

export default PublicKeyRow;
