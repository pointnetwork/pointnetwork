import { useParams } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import BlockTime from '../components/BlockTime';
import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';
import OwnerToIdentity from '../components/OwnerToIdenity';
import PointAddressRow from '../components/PointAddressRow';
import PublicKeyRow from '../components/PublicKeyRow';
import Swal from 'sweetalert2';
import { useAppContext } from '../context/AppContext';

/**
 * Checks if a string is in a hash format
 * 
 * @param {string} str - string to be checked 
 * @returns bool - if the string is a hash
 */
const isHash = (str) => {
    const s = str.startsWith('0x') ? str.substr(2) : str;
    if (s.length !== 64) return false;
    return new RegExp('^[0-9a-fA-F]+$').test(s);
};

/**
 * Get the domain name for the handle passed.
 * 
 * @param {string} handle - the handle
 * @returns {string} - domain name
 */
const getDomainSpace = (handle) =>
    handle.endsWith('.sol') ? handle : `${handle}.point`;


/**
 * Compoment that renders an IKV entry for display and edit it.
 * 
 * @param {object} props 
 * @param {string} props.handle - the handle which the entry will be edited
 * @param {object} props.item - the item to be displayed and edited with key, value and version props
 * @param {function} props.onUpdated - callback called when the update 
 * @param {boolean} props.showEdit - if the edition is enabled 
 * @returns {JSX.Element} an IKV Entry
 */
const IkvEntry = (props) => {
    const { handle, item, onUpdated, showEdit } = props;
    const [loading, setLoading] = useState(false);
    const [editionAllowed, setAllowEdition] = useState(false);
    const [newValue, setNewValue] = useState(item.value);
    const [newVersion, setNewVersion] = useState(item.version);

    /**
     * called to display the edition form for the item
     */
    const allowEdition = () => {
        setNewValue(item.value);
        setNewVersion(item.version);
        setAllowEdition(true);
    };

    /**
     * Called to save the changes in the edit form for the IKV item.
     */
    const saveChanges = async () => {
        setLoading(true);
        try {
            // validate item.key
            const regex = /(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;
            const found = item.version.match(regex);
            if (!found) {
                setLoading(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Version Number',
                    text: 'Version should be in the format Major.minor.patch (ex: 1.3.5)',
                });
                return;
            }

            // increment patch of item.key
            const newVersionParam =
                found.groups.major +
                '.' +
                found.groups.minor +
                '.' +
                (parseInt(found.groups.patch) + 1);

            await window.point.contract.send({
                contract: 'Identity',
                method: 'ikvPut',
                params: [
                    handle.toLowerCase(),
                    item.key,
                    newValue,
                    newVersionParam,
                ],
            });

            //disable edition
            setAllowEdition(false);
            //fetch item again
            onUpdated();
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <tr>
            <td>{item.key}</td>
            <td style={{ wordWrap: 'break-word', maxWidth: '400px' }}>
                {editionAllowed ? (
                    <input
                        value={newValue}
                        onChange={(event) => setNewValue(event.target.value)}
                    />
                ) : isHash(item.value) ? (
                    <a
                        href={'/_storage/' + item.value}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {item.value}
                    </a>
                ) : (
                    item.value
                )}
            </td>
            <td>{item.version}</td>
            <td>
                {editionAllowed ? (
                    <>
                        <button
                            className="btn btn-sm btn-secondary ml-1 mr-1"
                            onClick={saveChanges}
                            disabled={
                                loading ||
                                item.value === newVersion ||
                                item.value === newValue
                            }
                        >
                            Save
                        </button>
                        <button
                            className="btn btn-sm btn-secondary ml-1 mr-1"
                            onClick={() => setAllowEdition(false)}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </>
                ) : showEdit ? (
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={allowEdition}
                    >
                        Edit
                    </button>
                ) : (
                    ''
                )}
            </td>
        </tr>
    );
};

/**
 * Render the identity page
 * 
 * @returns {JSX.Element} identity page
 */
export default function Identity() {
    const { handle } = useParams();
    const [ikvset, setIkvset] = useState([]);
    const [owner, setOwner] = useState();
    const [deployers, setDeployers] = useState([]);
    const [isLoadingOwner, setIsLoadingOwner] = useState(true);
    const [isLoadingIkv, setIsLoadingIkv] = useState(true);
    const [isLoadingDeployers, setIsLoadingDeployers] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [addAddress, setAddAddress] = useState('');
    const [pointAddress, setPointAddress] = useState('');
    const {
        walletAddr,
        publicKey: walletPublicKey,
        identityNetwork,
    } = useAppContext();

    const isPointIdentity = !['ethereum', 'solana'].includes(identityNetwork);

    useEffect(() => {
        fetchOwner();
        fetchIkv();
        fetchDeployers();
    }, [handle]);

    /**
     * Retrieve the owner data 
     */
    const fetchOwner = async () => {
        setIsLoadingOwner(true);
        const result = await window.point.identity.identityToOwner({
            identity: handle,
        });
        setOwner(result.data.owner);
        setPointAddress(result.data.pointAddress);
        setIsLoadingOwner(false);
        setIsOwner(
            result.data.owner.toLowerCase() === walletAddr.toLowerCase(),
        );
    };

    /**
     * fetch ikv data
     */
    const fetchIkv = async () => {
        setIsLoadingIkv(true);
        const ikvsetFetched = await window.point.contract.call({
            contract: 'Identity',
            method: 'getIkvList',
            params: [handle.toLowerCase()],
        });
        if (ikvsetFetched.data !== '') {
            setIkvset(
                ikvsetFetched.data.map((e) => {
                    return {
                        identity: e[0],
                        key: e[1],
                        value: e[2],
                        version: e[3],
                    };
                }),
            );
        }
        setIsLoadingIkv(false);
    };

    /**
     * Fetch deployers data
     */
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

    /**
     * Render a deployer entry
     * 
     * @param {object} deployer
     * @param {address} deployer.deployer - address of the deployer
     * @param {number} deployer.blockNumber - block number of latest change in the deployer
     * @param {boolean} deployer.allowed - if the deployer is allowed or revoked
     * @returns {JSX.Element} - deployer entry
     */
    const renderDeployerEntry = (deployer) => {
        return (
            <tr key={deployer.deployer}>
                <th>
                    <OwnerToIdentity owner={deployer.deployer} />
                </th>
                <td>{deployer.deployer}</td>
                <td>{deployer.allowed === true ? 'Allowed' : 'Revoked'}</td>
                <td>
                    <BlockTime blockNumber={deployer?.blockNumber} />
                </td>

                {isOwner ? (
                    <td>
                        {deployer.allowed === true ? (
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                    revokeDeployer(deployer.deployer)
                                }
                            >
                                Revoke
                            </button>
                        ) : (
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() =>
                                    activateDeployer(deployer.deployer)
                                }
                            >
                                Reactivate
                            </button>
                        )}
                    </td>
                ) : null}
            </tr>
        );
    };

    const EmptyMsg = () =>
        ikvset.length === 0 ? (
            <div>
                <em>No records found</em>
            </div>
        ) : (
            ''
        );

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

    //values for the fields from the form for new entry
    const [ikvNewEntryKey, setIkvNewEntryKey] = useState('');
    const [ikvNewEntryValue, setIkvNewEntryValue] = useState('');
    const [ikvNewEntryVersion, setIkvNewEntryVersion] = useState('');

    //flag to check if is adding a new ikv entry
    const [addingNewIkv, setAddingNewIkv] = useState(false);

    //method to clean the form
    const cleanForm = () => {
        setIkvNewEntryKey('');
        setIkvNewEntryValue('');
        setIkvNewEntryVersion('');
    };

    /**
     * Add an IKV entry
     * 
     * @returns void
     */
    const addIkvEntry = async () => {
        setAddingNewIkv(true);
        const regexp = new RegExp(/\d+\.\d+\.\d+/);
        if (!regexp.test(ikvNewEntryVersion)) {
            setAddingNewIkv(false);
            Swal.fire({
                icon: 'error',
                title: 'Invalid Version Number',
                text: 'Version should be in the format Major.minor.patch (ex: 1.3.5)',
            });
            return;
        }

        try {
            await window.point.contract.send({
                contract: 'Identity',
                method: 'ikvPut',
                params: [
                    handle.toLowerCase(),
                    ikvNewEntryKey,
                    ikvNewEntryValue,
                    ikvNewEntryVersion,
                ],
            });
            await fetchIkv();
            cleanForm();
            setAddingNewIkv(false);
        } catch (error) {
            console.error(error);
            setAddingNewIkv(false);
        }
    };

    //enable add entry button
    const addEntryButtonEnabled =
        !addingNewIkv &&
        Boolean(ikvNewEntryKey) &&
        Boolean(ikvNewEntryValue) &&
        Boolean(ikvNewEntryVersion);

    //checks if can show the ikv edit form
    const showIkvEditForm =
        walletAddr.toLowerCase() === owner?.toLowerCase() && isPointIdentity;

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
                    <PointAddressRow
                        handle={handle}
                        pointAddress={pointAddress}
                        isOwner={isOwner}
                    />
                    <PublicKeyRow
                        handle={handle}
                        isOwner={isOwner}
                        walletPublicKey={walletPublicKey}
                    />
                    <tr>
                        <th>Domain Space:</th>
                        <td>
                            <a
                                href={`https://${getDomainSpace(handle)}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {getDomainSpace(handle)}
                            </a>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="mt-5 mb-5">
                <h3 className="mb-4">Identity Key Value Store (ikv):</h3>
                {isLoadingIkv ? (
                    <Loading />
                ) : (
                    <>
                        {ikvset.length ? (
                            <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                                <thead>
                                    <th>Key</th>
                                    <th>Value</th>
                                    <th>Version</th>
                                    <th></th>
                                </thead>
                                <tbody>
                                    {ikvset.map((item) => (
                                        <IkvEntry
                                            key={item.key}
                                            handle={handle}
                                            item={item}
                                            onUpdated={fetchIkv}
                                            showEdit={showIkvEditForm}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div>
                                <EmptyMsg />
                            </div>
                        )}
                        {showIkvEditForm ? (
                            <div className="row g-3 mt-3">
                                <h5>Add new entry</h5>
                                <div className="col-xs-12 col-sm-3">
                                    <input
                                        type="text"
                                        name="ikvEntryKey"
                                        value={ikvNewEntryKey}
                                        onChange={(event) =>
                                            setIkvNewEntryKey(
                                                event.target.value,
                                            )
                                        }
                                        className="form-control"
                                        placeholder="Key"
                                    />
                                </div>
                                <div className="col-xs-12 col-sm-3">
                                    <input
                                        type="text"
                                        name="ikvEntryValueRef"
                                        value={ikvNewEntryValue}
                                        onChange={(event) =>
                                            setIkvNewEntryValue(
                                                event.target.value,
                                            )
                                        }
                                        className="form-control"
                                        placeholder="Value"
                                    />
                                </div>
                                <div className="col-xs-12 col-sm-2">
                                    <input
                                        type="text"
                                        name="ikvEntryVersion"
                                        value={ikvNewEntryVersion}
                                        onChange={(event) =>
                                            setIkvNewEntryVersion(
                                                event.target.value,
                                            )
                                        }
                                        className="form-control"
                                        placeholder="Version"
                                    />
                                </div>
                                <div className="col-xs-12 col-sm-4">
                                    <button
                                        className="btn btn-primary mb-4 w-full"
                                        onClick={addIkvEntry}
                                        disabled={!addEntryButtonEnabled}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        ) : (
                            ''
                        )}
                    </>
                )}
            </div>
            
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
            ) : (
                <>
                    <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                        <tbody>
                            {deployers.map((deployer) =>
                                renderDeployerEntry(deployer),
                            )}
                        </tbody>
                    </table>
                    <EmptyMsg />
                </>
            )}
        </Container>
    );
}
