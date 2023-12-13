import { useState, useEffect } from 'react';
import { isAddress } from '@ethersproject/address';
import { toUtf8Bytes, ethers, utils } from 'ethers';
import Swal from 'sweetalert2';

const BuySellModal = ({
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
    const [pointPrice, setPointPrice] = useState(null);
    const [pointPriceFormatted, setPointPriceFormatted] = useState('...');

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

        (async () => {
            // console.log('starting');
            window.ethers = ethers;

            // const token0 = '0x55d398326f99059fF775485246999027B3197955';
            // const token1 = '0xEED8a651Cbed164797895415fCFF85d3B837f65B'; // point
            // const pairAddress = '0xf4fa069e853e05ef5f7f31e3447629da416128c5';

            // const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            // console.log({provider})

            // const pair = new ethers.Contract(
            //     pairAddress,
            //     [
            //         'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
            //     ],
            //     provider
            // )
            // console.log({pair})

            // const reserves = await pair.getReserves()

            // console.log('----')
            // console.log({reserves})

            // Define the contract address and ABI for the getReserves function
            const pairAddress = '0xf4fa069e853e05ef5f7f31e3447629da416128c5';
            const getReservesFunctionSignature = '0x0902f1ac'; // This is the signature for getReserves()

            // Function signature is "getReserves()"
            const functionSignature = 'getReserves()';

            // Calculate Keccak-256 hash of the function signature
            const hash = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(functionSignature),
            );

            // Get the first 4 bytes of the hash, skipping the '0x' prefix
            const functionSignatureHash = hash.slice(0, 10); // Take only first 10 characters (2 for '0x' and 8 for the first 4 bytes)

            // Function to call getReserves directly
            async function directGetReserves() {
                const callData = {
                    to: pairAddress, // The address of the contract with the getReserves function
                    data: functionSignatureHash, // The function signature + parameters (if any)
                };

                // console.log('callData:', callData);

                try {
                    const result = await window.ethereum.request({
                        method: 'eth_call',
                        params: [callData, 'latest'], // You can specify a block number instead of 'latest'
                        network: 'bsc',
                    });

                    // The result is returned as a hexadecimal string and needs to be parsed
                    // Parsing the result depends on how the data is encoded in the smart contract
                    // For a simple function that returns uint256 values, you can use ethers.js utilities or another library to decode the result
                    // For example, with ethers.js:
                    const [reserve0, reserve1, blockTimestampLast] =
                        ethers.utils.defaultAbiCoder.decode(
                            ['uint112', 'uint112', 'uint32'],
                            result,
                        );
                    // console.log('getReserves result:', result);
                    // console.log('reserve0:', reserve0.toString());
                    // console.log('reserve1:', reserve1.toString());
                    // console.log('blockTimestampLast:', blockTimestampLast.toString());

                    // price
                    const price = reserve0 / reserve1;

                    setPointPrice(price);
                    setPointPriceFormatted(price.toFixed(6));

                    // console.log('price:', price);
                } catch (error) {
                    console.error('Error calling getReserves directly:', error);
                }
            }

            // Call the function
            directGetReserves();
        })();
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
                valueToSend = utils.hexlify(utils.parseUnits(value, decimals));
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
                        <h5 className="modal-title">Buy/Sell POINT token</h5>
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
                        Current POINT price: ${pointPriceFormatted}
                    </div>

                    <div className="modal-body">
                        <form>
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

export default BuySellModal;
