import React, { useEffect, useState } from 'react';
import OwnerToIdentity from '../OwnerToIdenity';
import BlockTime from '../BlockTime';
import Swal from 'sweetalert2';
import Loading from '../Loading';
import { useParams } from 'react-router-dom';


const Deployers = ({ isOwner, isPointIdentity }) => {
    const { handle } = useParams();
    const [addAddress, setAddAddress] = useState('');
    const [deployers, setDeployers] = useState([]);
    const [isLoadingDeployers, setIsLoadingDeployers] = useState(true);

    const fetchDeployers = async () => {
        setIsLoadingDeployers(true);
        const deployersFetched = await window.point.contract.call({
            contract: 'Identity',
            method: 'getDeployersList',
            params: [handle.toLowerCase()],
        });
        if (deployersFetched.data !== '') {
            setDeployers(
                deployersFetched.data.map((e) => {
                    return {
                        identity: e[0],
                        deployer: e[1],
                        allowed: e[2],
                        blockNumber: e[3],
                    };
                }),
            );
        }
        setIsLoadingDeployers(false);
    };

    useEffect(() => {
        fetchDeployers();
    }, [handle]);

    const handleChange = (e) => {
        setAddAddress(e.target.value);
    };

    const addDeployer = async () => {
        const result = await activateDeployer(addAddress);
        if (result) {
            setAddAddress('');
        }
    };

    /**
     * Revoke the deployer permission from one address in the seletect identity 
     * 
     * @param {address} deployer - address of the deployer to be revoked
     */
    const revokeDeployer = async (deployer) => {
        try {
            setIsLoadingDeployers(true);
            await window.point.contract.call({
                contract: 'Identity',
                method: 'removeIdentityDeployer',
                params: [handle, deployer],
            });
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Deployer removed with success!',
            });
            fetchDeployers();
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Request Failed',
                text: e.message,
            });
            setIsLoadingDeployers(false);
        }
    };

    /**
     * Grant the deployer permission from one address in the seletect identity 
     * 
     * @param {address} deployer - the address for the deployer permission be granted
     * @returns {boolean} if the operation succeed.
     */
    const activateDeployer = async (deployer) => {
        try {
            setIsLoadingDeployers(true);
            await window.point.contract.call({
                contract: 'Identity',
                method: 'addIdentityDeployer',
                params: [handle.toLowerCase(), deployer],
            });
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Deployer added with success!',
            });
            fetchDeployers();
            return true;
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Request Failed',
                text: e.message,
            });
            setIsLoadingDeployers(false);
            return false;
        }
    };

    return (
        <>
            <h3>Deployers:</h3>
            {isOwner && isPointIdentity ? (
                <div className="row g-3">
                    <div className="col-sm-4">
                        <input
                            type="text"
                            name="addAddress"
                            className="form-control"
                            placeholder="Address"
                            value={addAddress}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-sm-8">
                        <button
                            className="btn btn-primary mb-2"
                            onClick={() => addDeployer()}
                        >
                            Add
                        </button>
                    </div>
                </div>
            ) : null}
            {isLoadingDeployers ? (
                <Loading />
            ) : deployers.length === 0 ? (
                <div>
                    <em>No records found</em>
                </div>
            ) : (
                <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                    <tbody>
                        {deployers.map((deployer) => (
                            <tr key={deployer.deployer}>
                                <th>
                                    <OwnerToIdentity
                                        owner={deployer.deployer}
                                    />
                                </th>
                                <td>{deployer.deployer}</td>
                                <td>
                                    {deployer.allowed === true
                                        ? 'Allowed'
                                        : 'Revoked'}
                                </td>
                                <td>
                                    <BlockTime
                                        blockNumber={deployer?.blockNumber}
                                    />
                                </td>

                                {isOwner ? (
                                    <td>
                                        {deployer.allowed === true ? (
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() =>
                                                    revokeDeployer(
                                                        deployer.deployer,
                                                    )
                                                }
                                            >
                                                Revoke
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() =>
                                                    activateDeployer(
                                                        deployer.deployer,
                                                    )
                                                }
                                            >
                                                Reactivate
                                            </button>
                                        )}
                                    </td>
                                ) : null}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </>
    );
};

export default Deployers;
