import { useState } from 'react';
import { isAddress } from '@ethersproject/address';
import { parseUnits } from 'ethers/lib/utils';
import Swal from 'sweetalert2';

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

const SendModal = ({ networkType, onClose, onSubmit, decimals = 18 }) => {
    const [address, setAddress] = useState('');
    const [addressValidation, setAddressValidation] = useState(false);
    const [value, setValue] = useState('');
    const [valueValidation, setValueValidation] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleAddressChange = (e) => {
        setAddressValidation(false);
        setAddress(e.target.value);
    };

    const handleValueChange = (e) => {
        setValueValidation(false);
        setValue(e.target.value);
    };

    const handleSubmit = async () => {
        let to = address;

        // Support using identities instead of addresses.
        if (address.startsWith('@')) {
            try {
                const { data } = await window.point.identity.identityToOwner({
                    identity: address.substring(1),
                });
                if (data?.pointAddress !== EMPTY_ADDRESS) {
                    to = data.pointAddress;
                } else {
                    setAddressValidation('Identity not found');
                    return;
                }
            } catch {
                setAddressValidation(
                    'Error retrieving address for this identity',
                );
                return;
            }
        }

        const _addressValidation = to
            ? networkType === 'eth'
                ? isAddress(to)
                    ? null
                    : 'Not a valid address (if you are using a handle, make sure it starts with @)'
                : null // TODO: solana address validation
            : 'Address is required';

        const _valueValidation = value
            ? isNaN(Number(value))
                ? 'Please, enter a valid number'
                : Number(value) > 0
                ? null
                : 'Value should be positive'
            : 'Value is required';

        setAddressValidation(_addressValidation);
        setValueValidation(_valueValidation);
        if (_addressValidation || _valueValidation) return;

        setProcessing(true);
        try {
            await onSubmit({
                to,
                value:
                    networkType === 'eth'
                        ? parseUnits(value, decimals).toHexString() // eth
                        : value * 1000000000, // solana
            });
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Funds successfully sent!',
            });
            onClose();
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Something went wrong',
                text: 'Error: ' + e.message,
            });
        }
        setProcessing(false);
    };

    return (
        <div
            className="modal fade show"
            style={{ display: 'block' }}
            tabIndex="-1"
        >
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Send</h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        />
                    </div>
                    <div className="modal-body">
                        <input
                            value={address}
                            onChange={handleAddressChange}
                            type="text"
                            className="form-control recipient"
                            placeholder="Recipient's address or @handle"
                            style={
                                addressValidation
                                    ? { borderColor: 'indianred' }
                                    : {}
                            }
                        />
                        <span style={{ color: 'indianred', display: 'block' }}>
                            {addressValidation}
                        </span>
                        <input
                            value={value}
                            onChange={handleValueChange}
                            type="number"
                            className="form-control number amount"
                            placeholder="Amount"
                            style={{
                                marginTop: '20px',
                                ...(valueValidation
                                    ? { borderColor: 'indianred' }
                                    : {}),
                            }}
                        />
                        <span style={{ color: 'indianred', display: 'block' }}>
                            {valueValidation}
                        </span>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={processing}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SendModal;
