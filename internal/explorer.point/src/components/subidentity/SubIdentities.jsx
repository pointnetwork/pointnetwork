import { useState, useEffect } from 'react';
import Loading from '../Loading';
import SubIdentitiesList from './SubIdentitiesList';
import SubIdentityRegistration from './SubIdentityRegistration';

export default function SubIdentities({ owner }) {
    const [subidentities, setSubidentities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchSubidentities() {
            setIsLoading(true);
            setError('');
            try {
                const resp = await window.point.contract.events({
                    host: '@',
                    contract: 'Identity',
                    event: 'SubidentityRegistered',
                    filter: {
                        identityOwner: owner,
                    },
                });
                setSubidentities(resp.data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSubidentities();
    }, []);

    const handleNewIdentity = (subidentity, parentIdentity) => {
        setSubidentities((prev) => [
            ...prev,
            {
                data: {
                    subhandle: subidentity,
                    handle: parentIdentity,
                    identityOwner: owner,
                },
            },
        ]);
    };

    return (
        <div>
            <h2>Sub-Identities</h2>
            <hr />
            {isLoading ? (
                <Loading />
            ) : error ? (
                <p className="red">Error: {error}</p>
            ) : (
                <>
                    <SubIdentitiesList subidentities={subidentities} />
                    <SubIdentityRegistration
                        onNewIdentity={handleNewIdentity}
                    />
                </>
            )}
        </div>
    );
}
