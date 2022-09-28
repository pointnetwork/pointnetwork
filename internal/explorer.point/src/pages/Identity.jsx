import { useParams } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContext';
import Deployers from '../components/identity/Deployers';
import IkvList from '../components/identity/IkvList';
import PointAddressRow from '../components/PointAddressRow';
import PublicKeyRow from '../components/PublicKeyRow';
import getDomainSpace from '../utils/getDomainSpace';

/**
 * Render the identity page
 * 
 * @returns {JSX.Element} identity page
 */
export default function Identity() {
    const { handle } = useParams();
    const [owner, setOwner] = useState();
    const [isLoadingOwner, setIsLoadingOwner] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [pointAddress, setPointAddress] = useState('');
    const {
        walletAddr,
        publicKey: walletPublicKey,
        identityNetwork,
    } = useAppContext();

    //check if is point identity
    const isPointIdentity = !['ethereum', 'solana'].includes(identityNetwork);

    /**
     * fetchs the owner data
     */
    const fetchOwner = async () => {
        setIsLoadingOwner(true);
        const result = await window.point.identity.identityToOwner({
            identity: handle,
        });
        setOwner(result.data.owner);
        setPointAddress(result.data.pointAddress);
        setIsLoadingOwner(false);
        setIsOwner(
            result.data.owner.toLowerCase() === walletAddr.toLowerCase(),
        );
    };

    useEffect(() => {
        fetchOwner();
    }, [handle]);

    return (
        <Container className="p-3">
            <br />
            <h1>Identity @{handle}</h1>

            <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                <tbody>
                    <tr>
                        <th>Handle:</th>
                        <td>@{handle}</td>
                    </tr>
                    <tr>
                        <th>Owner:</th>
                        <td>{isLoadingOwner ? <Loading /> : owner}</td>
                    </tr>
                    <PointAddressRow
                        handle={handle}
                        pointAddress={pointAddress}
                        isOwner={isOwner}
                    />
                    <PublicKeyRow
                        handle={handle}
                        isOwner={isOwner}
                        walletPublicKey={walletPublicKey}
                    />
                    <tr>
                        <th>Domain Space:</th>
                        <td>
                            <a
                                href={`https://${getDomainSpace(handle)}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {getDomainSpace(handle)}
                            </a>
                        </td>
                    </tr>
                </tbody>
            </table>
            <IkvList isPointIdentity={isPointIdentity} owner={owner} />
            <Deployers isOwner={isOwner} isPointIdentity={isPointIdentity} />
        </Container>
    );
}
