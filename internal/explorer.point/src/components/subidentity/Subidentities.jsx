import Loading from '../Loading';
import SubidentityList from './SubidentityList';
import SubidentityRegistration from './SubidentityRegistration';
import { useState, useEffect } from 'react';

export default function SubIdentities({ owner }) {
    const [subidentities, setsubidentities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSubidentities();
    }, []);

    const fetchSubidentities = async () => {
        setIsLoading(true);
        const ids = await window.point.contract.call({
            contract: 'Identity',
            method: 'getSubidentitiesByOwner',
            params: [owner],
        });
        setsubidentities(ids.data);

        setIsLoading(false);
    };

    const handleNewIdentity = () => {
        fetchSubidentities();
    };

    return (
        <div>
            <h2>Sub-Identities {isLoading ? <Loading /> : null}</h2>
            <hr />
            <SubidentityList
                owner={owner}
                subidentities={subidentities}
                loading={isLoading}
            />
            <SubidentityRegistration onNewIdentity={handleNewIdentity} />
        </div>
    );
}
