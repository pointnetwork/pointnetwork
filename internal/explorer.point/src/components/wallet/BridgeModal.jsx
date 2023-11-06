import { useState, useEffect } from 'react';
import { isAddress } from '@ethersproject/address';
import { parseUnits, hexlify, toUtf8Bytes, toBeHex } from 'ethers';
import Swal from 'sweetalert2';

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

const BridgeModal = ({
    network,
    networkName,
    networkType,
    onClose,
    onSubmit,
    decimals = 18,
    balance,
}) => {
    const [address, setAddress] = useState('');
    const [addressValidation, setAddressValidation] = useState(false);
    const [value, setValue] = useState('');
    const [valueValidation, setValueValidation] = useState(false);
    const [processing, setProcessing] = useState(false);

    let fromNetwork = null;
    let toNetwork = null;
    let fromIcon = null;
    let toIcon = null;
    switch (networkName) {
        case 'point':
            fromNetwork = 'point';
            toNetwork = 'bsc';
            fromIcon = 'point-white';
            toIcon = 'bsc';
            portalAddress = '0xa085bB45c122eE7aCfEd13fd559117d8A8182Dd0';
            portalTransactionType = 'native';
            portalTokenAddress = null;
            break;
        case 'bsc':
            fromNetwork = 'bsc';
            toNetwork = 'point';
            fromIcon = 'bsc';
            toIcon = 'point-white';
            portalAddress = '0x6543799B013148F27067d30bad9f60acdA5db926';
            portalTransactionType = 'token';
            portalTokenAddress = '0xEED8a651Cbed164797895415fCFF85d3B837f65B';
            break;
        default:
            throw new Error('Invalid network name: ' + networkName);
    }

    useEffect(() => {
        setAddress(portalAddress);
    }, []);

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
        setProcessing(true);
        try {
            let valueToSend = value;
            if (
                networkType === 'eth' ||
                networkType === 'ethtoken' ||
                networkType === 'token'
            ) {
                valueToSend = toBeHex(parseUnits(value, decimals));
            } else if (networkType === 'solana') {
                valueToSend = value * 1000000000;
            } else {
                throw new Error('Invalid network type: ' + networkType);
            }

            await onSubmit({
                portalAddress,
                portalTransactionType,
                portalTokenAddress,
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
            data-bs-backdrop="static"
            data-bs-keyboard="false"
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            Bridge POINT token from {fromNetwork.toUpperCase()}{' '}
                            to {toNetwork.toUpperCase()}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        />
                    </div>

                    <div
                        style={{
                            marginTop: '10px',
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <img
                            src={`../../assets/coins/${fromIcon}.png`}
                            style={{ width: '100px', height: '100px' }}
                        />
                        <div style={{ fontSize: '5em' }}>
                            &nbsp;&rarr;&nbsp;
                        </div>
                        <img
                            src={`../../assets/coins/${toIcon}.png`}
                            style={{ width: '100px', height: '100px' }}
                        />
                    </div>

                    <div className="modal-body">
                        <form>
                            <div className="form-group">
                                <label className="">Portal Address</label>
                                <div className="mono">{portalAddress}</div>
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

export default BridgeModal;
