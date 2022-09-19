import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAppContext } from '../context/AppContext';

const USER_REJECTION_CODE = 4001;
const LS_KEY = 'point_to_sol_msg';
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

const styles = {
    container: {
        borderRadius: 4,
        boxShadow: '0px 7px 15px 0 rgba(0, 0, 0, .15)',
        padding: 16,
        marginTop: 24,
        color: 'rgb(124, 124, 124)',
        display: 'grid',
        gridTemplateColumns: '1fr 200px',
        alignItems: 'center',
        gridColumnGap: 42,
    },
    description: {
        margin: 0,
    },
};

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
            window.point.point.link_point_to_sol
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

    if (hasPointAddress || !display) {
        return null;
    }

    return (
        <div style={styles.container}>
            <p style={styles.description}>
                We've noticed you're using a <em>SOL</em> domain, for the best
                experience, we recommend linking your <em>POINT</em> address to
                your <em>SOL</em> domain.
            </p>
            <button className="btn btn-md btn-success" onClick={linkPointToSol}>
                Link POINT to SOL
            </button>
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
            </div>
        </div>
    );
};

export default LinkPointToSol;
