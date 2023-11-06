import { useState } from 'react';
import { isAddress } from '@ethersproject/address';
import { parseUnits, hexlify, toUtf8Bytes, toBeHex } from 'ethers';
import Swal from 'sweetalert2';

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

const SendModal = ({
    networkType,
    onClose,
    onSubmit,
    balance,
    decimals = 18,
}) => {
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
        const regex = /^[0-9]*[.]?[0-9]*$/;
        const inputValue = e.target.value;

        // Only update the value if it matches the regex or is empty (for backspace)
        if (regex.test(inputValue) || inputValue === '') {
            setValue(inputValue);
            setValueValidation(false);
        }
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
            let valueToSend = value;
            if (networkType === 'eth' || networkType === 'ethtoken') {
                valueToSend = toBeHex(parseUnits(value, decimals));
            } else if (networkType === 'solana') {
                valueToSend = value * 1000000000;
            } else {
                throw new Error('Invalid network type: ' + networkType);
            }

            await onSubmit({
                to,
                value: valueToSend,
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
            style={{ display: 'block', background: 'rgba(255,255,255,0.3)' }}
            tabIndex="-1"
            data-bs-keyboard="false"
        >
            <div className="modal-dialog modal-dialog-centered">
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
                        <form>
                            <div
                                className="form-group"
                                style={{ marginBottom: '20px' }}
                            >
                                <label className="">
                                    Recipient address or @handle
                                </label>
                                <input
                                    value={address}
                                    onChange={handleAddressChange}
                                    type="text"
                                    className="form-control recipient"
                                    placeholder=""
                                    style={
                                        addressValidation
                                            ? { borderColor: 'indianred' }
                                            : {}
                                    }
                                />
                                <span
                                    style={{
                                        color: 'indianred',
                                        display: 'block',
                                    }}
                                >
                                    {addressValidation}
                                </span>
                            </div>
                            <div className="form-group">
                                <label className="">Amount</label>
                                <input
                                    value={value}
                                    onChange={handleValueChange}
                                    type="text"
                                    className="form-control number amount"
                                    placeholder=""
                                    style={{
                                        // marginTop: '20px',
                                        ...(valueValidation
                                            ? { borderColor: 'indianred' }
                                            : {}),
                                    }}
                                />
                                <span
                                    style={{
                                        color: 'indianred',
                                        display: 'block',
                                    }}
                                >
                                    {valueValidation}
                                </span>

                                {/* MAX button, on the right */}
                                {!isNaN(Number(balance)) && balance > 0 && (
                                    <div style={{ textAlign: 'right' }}>
                                        <a
                                            className="text-right"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                setValue(balance);
                                            }}
                                        >
                                            Max: {balance}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </form>
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
