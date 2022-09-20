import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAppContext } from '../context/AppContext';

const USER_REJECTION_CODE = 4001;
const LS_KEY = 'point_to_sol_msg';
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

const styles = {
    container: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 4,
        boxShadow: '0px 7px 15px 0 rgba(0, 0, 0, .15)',
        padding: '8px 24px',
        color: 'rgb(124, 124, 124)',
        display: 'grid',
        gridTemplateColumns: '1fr 100px',
        alignItems: 'center',
        gridColumnGap: 24,
    },
    description: {
        margin: 0,
        padding: 0,
    },
};

const learnMoreHTMLString = (solDomain) => `
    <p>
        By linking your POINT address, you will be able to use your SOL domain
        to interact in Point Network.
    </p>
    <p>
        For example, people will be able to email you at <b>${solDomain}</b>,
        send POINTs to it, share files, etc.
    </p>
    <p>
        <em>
            <small>
                Please mind that this requires writing to your Solana Domain Registry,
                which means it will cost some SOL to cover the transaction fees.
            </small>
        </em>
    </p>
`;

const LinkPointToSol = () => {
    const { walletIdentity } = useAppContext();
    const [hasPointAddress, setHasPointAddress] = useState(true);
    const [display, setDisplay] = useState(
        () => localStorage.getItem(LS_KEY) !== 'hide',
    );

    useEffect(() => {
        async function fetchData() {
            try {
                const { data } = await window.point.identity.identityToOwner({
                    identity: walletIdentity,
                });
                if (!data.pointAddress || data.pointAddress === EMPTY_ADDRESS) {
                    setHasPointAddress(false);
                }
            } catch (err) {
                console.error(err);
            }
        }

        if (
            walletIdentity.endsWith('.sol') &&
            typeof window.point.point.link_point_to_sol === 'function'
        ) {
            fetchData();
        }
    }, [walletIdentity]);

    const linkPointToSol = async () => {
        try {
            await window.point.point.link_point_to_sol(walletIdentity);
            await Swal.fire(
                'Done!',
                'You have successfully linked your POINT address to your SOL domain.',
                'success',
            );
            setDisplay(false);
        } catch (err) {
            if (err.code === USER_REJECTION_CODE) {
                await Swal.fire('Request cancelled.', '', 'info');
            } else {
                await Swal.fire(
                    'Sorry, something went wrong',
                    'Please try again later or contact support',
                    'error',
                );
                console.error(err);
            }
        }
    };

    const handleRemindMeLater = () => {
        setDisplay(false);
    };

    const handleDoNotShowAgain = () => {
        localStorage.setItem(LS_KEY, 'hide');
        setDisplay(false);
    };

    const handleLearnMore = async () => {
        await Swal.fire(
            'Linking your POINT address',
            learnMoreHTMLString(walletIdentity),
            'info',
        );
    };

    if (hasPointAddress || !display) {
        return null;
    }

    return (
        <div style={styles.container}>
            <div>
                <p style={styles.description}>
                    We've noticed you're using a <em>SOL</em> domain, for the
                    best experience, we recommend linking your <em>POINT</em>{' '}
                    address to it.
                </p>
                <div>
                    <button
                        className="btn btn-sm btn-link"
                        onClick={handleRemindMeLater}
                    >
                        Remind me later
                    </button>
                    <button
                        className="btn btn-sm btn-link"
                        onClick={handleDoNotShowAgain}
                    >
                        Don't show this again
                    </button>
                    <button
                        className="btn btn-sm btn-link"
                        onClick={handleLearnMore}
                    >
                        Learn more
                    </button>
                </div>
            </div>
            <button className="btn btn-md btn-success" onClick={linkPointToSol}>
                Link
            </button>
        </div>
    );
};

export default LinkPointToSol;
