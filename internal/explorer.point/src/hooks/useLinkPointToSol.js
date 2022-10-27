import { useCallback } from 'react';
import Swal from 'sweetalert2';

const USER_REJECTION_CODE = 4001;

const successMessage = `
    <p>You have successfully linked your POINT address to your SOL domain.</p>
    <p>
        <small>
            Please mind that changes may take a few minutes to take effect.
        </small>
    </p>
`;

/**
 * Makes the request to set the Point Address in the `POINT` record of a
 * Solana domain and displays either a success or error message to the user.
 */
export default function useLinkPointToSol(identity, onSuccess = () => {}) {
    const linkPointToSol = useCallback(async () => {
        try {
            await window.point.point.link_point_to_sol(identity);
            await Swal.fire('Done!', successMessage, 'success');
            onSuccess();
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
    }, [identity]);

    return linkPointToSol;
}
