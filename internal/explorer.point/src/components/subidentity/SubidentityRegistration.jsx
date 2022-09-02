import { useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';
import Loading from '../Loading';

export default function SubIdentityRegistration({ onNewIdentity }) {
    const { walletIdentity } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [newSubidentity, setNewSubidentity] = useState('');
    const [error, setError] = useState('');

    const handleSubidentityRegistration = async () => {
        const identity = `${newSubidentity}.${walletIdentity}`;
        setError('');

        // Validation.
        if (!/^[a-zA-Z0-9_]+?$/.test(newSubidentity)) {
            setError('Special characters are not allowed');
            return;
        }
        if (newSubidentity.length < 2) {
            setError('Handle is too short (min: 2 chars.)');
            return;
        }
        if (newSubidentity.length > 16) {
            setError('Handle is too long (max: 16 chars.)');
            return;
        }

        // Confirmation.
        const { isConfirmed } = await Swal.fire({
            title: `Are you sure you want to register ${identity}?`,
            showCancelButton: true,
            confirmButtonText: 'Sure!',
        });
        if (!isConfirmed) {
            return;
        }

        // Registration.
        setIsLoading(true);
        try {
            await axios({
                url: '/v1/api/identity/sub/register',
                method: 'POST',
                headers: {
                    'Contenty-Type': 'application/json; charset=utf-8',
                    'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                },
                data: {
                    subidentity: newSubidentity,
                    parentIdentity: walletIdentity,
                    _csrf: window.localStorage.getItem('csrf_token'),
                },
            });

            onNewIdentity();
            setNewSubidentity('');
        } catch (err) {
            console.error(err);
            setError(
                'Sorry, something went wrong with the sub-identity registration.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (ev) => {
        if (error) {
            setError('');
        }
        setNewSubidentity(ev.target.value);
    };

    return (
        <>
            <h4>Register new sub-identity:</h4>
            <div className="row g-3 mt-1">
                <div className="col-sm-4">
                    <input
                        type="text"
                        name="register-subidentity"
                        className="form-control"
                        placeholder="Sub-Identity"
                        value={newSubidentity}
                        onChange={handleChange}
                    />
                </div>
                <div className="col-sm-5">
                    <button
                        className="btn btn-primary mb-2"
                        disabled={isLoading || newSubidentity.length === 0}
                        onClick={handleSubidentityRegistration}
                    >
                        {isLoading ? (
                            <Loading className="spinner-border-sm" />
                        ) : (
                            'Register'
                        )}
                    </button>
                </div>
            </div>
            <div className="row px-2">
                {newSubidentity.length > 0 && !error ? (
                    <p className="green m-2">
                        <em>
                            {newSubidentity}.{walletIdentity}
                        </em>
                    </p>
                ) : null}
                {error ? (
                    <p className="red m-2">
                        <em>{error}</em>
                    </p>
                ) : null}
            </div>
        </>
    );
}
