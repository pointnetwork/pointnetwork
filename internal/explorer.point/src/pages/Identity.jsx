import { useParams } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContext';
import parsePublicKey from '../utils/parsePublicKey';
import Deployers from '../components/identity/Deployers';
import IkvList from '../components/identity/IkvList';

export default function Identity() {
    const { handle } = useParams();
    const [owner, setOwner] = useState();
    const [isLoadingOwner, setIsLoadingOwner] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [publicKey, setPublicKey] = useState('');
    const [isLoadingPublicKey, setIsLoadingPublicKey] = useState(true);
    const {
        walletAddr,
        publicKey: walletPublicKey,
        identityNetwork,
    } = useAppContext();

    const isPointIdentity = !['ethereum', 'solana'].includes(identityNetwork);

    const fetchOwner = async () => {
        setIsLoadingOwner(true);
        const result = await window.point.identity.identityToOwner({
            identity: handle,
        });
        setOwner(result.data.owner);
        setIsLoadingOwner(false);
        setIsOwner(
            result.data.owner.toLowerCase() === walletAddr.toLowerCase(),
        );
    };

    useEffect(() => {
        fetchOwner();
    }, [handle]);

    const fetchPublicKey = async () => {
        if (isOwner) {
            setPublicKey(walletPublicKey);
            return;
        }
        setIsLoadingPublicKey(true);
        try {
            const result = await window.point.identity.publicKeyByIdentity({
                identity: handle,
            });
            setPublicKey(result.data.publicKey);
        } catch {
            setPublicKey('n/a');
        } finally {
            setIsLoadingPublicKey(false);
        }
    };

    useEffect(() => {
        fetchPublicKey();
    }, [isOwner]);

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
                    <tr>
                        <th>Domain Space:</th>
                        <td>
                            <a
                                href={'https://' + handle + '.point/'}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {handle}.point
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <th>Communication Public Key:</th>
                        <td className="overflow-wrap: break-word;">
                            {isLoadingPublicKey ? (
                                <Loading />
                            ) : (
                                parsePublicKey(publicKey)
                            )}
                        </td>
                    </tr>
                </tbody>
            </table>
            <IkvList isPointIdentity={isPointIdentity} owner={owner} />
            <Deployers isOwner={isOwner} isPointIdentity={isPointIdentity} />
        </Container>
    );
}
