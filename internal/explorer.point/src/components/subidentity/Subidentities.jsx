import Loading from '../Loading';
import SubidentityList from './SubidentityList';
import SubidentityRegistration from './SubidentityRegistration';
import usePaginatedEvents from '../../hooks/usePaginatedEvents';

export default function SubIdentities({ owner }) {
    const { data, loading, error } = usePaginatedEvents({
        host: '@',
        contract: 'Identity',
        event: 'SubidentityRegistered',
        filter: { identityOwner: owner },
    });

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
            <h2>Sub-Identities {loading && <Loading />}</h2>
            <hr />
            {error ? (
                <p className="red">Error: {error}</p>
            ) : (
                <>
                    <SubidentityList subidentities={data} loading={loading} />
                    <SubidentityRegistration
                        onNewIdentity={handleNewIdentity}
                    />
                </>
            )}
        </div>
    );
}
