import { useRoute } from 'wouter';
import Container from 'react-bootstrap/Container';
import BlockTime from '../components/BlockTime';
import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';
import OwnerToIdentity from '../components/OwnerToIdenity';
import Swal from 'sweetalert2';
import { useAppContext } from '../context/AppContext';

const isHash = (str) => {
    const s = str.startsWith('0x') ? str.substr(2) : str;
    if (s.length !== 64) return false;
    return new RegExp('^[0-9a-fA-F]+$').test(s);
};

const IkvEntry = (props) => {
    const { handle, item, onUpdated, showEdit } = props;
    const [loading, setLoading] = useState(false);
    const [editionAllowed, setAllowEdition] = useState(false);
    const [newValue, setNewValue] = useState(item.value);
    const [newVersion, setNewVersion] = useState(item.version);

    const allowEdition = () => {
        setNewValue(item.value);
        setNewVersion(item.version);
        setAllowEdition(true);
    };

    const saveChanges = async () => {
        setLoading(true);
        try {
            //validate item.key
            const regex = /(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;
            const found = item.version.match(regex);
            if(!found){
                setLoading(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Version Number',
                    text: 'Version should be in the format Major.minor.patch (ex: 1.3.5)',
                });
                return;
            }

            //increment patch of item.key
            let newVersionParam = found.groups.major + '.' + found.groups.minor + '.' + (parseInt(found.groups.patch) + 1)
            
            await window.point.contract.send({
                contract: 'Identity',
                method: 'ikvPut',
                params: [handle, item.key, newValue, newVersionParam],
            });
            setAllowEdition(false);
            onUpdated();
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <tr>
            <th>{item.key}</th>
            <td>
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
            <td>
                {item.version}
            </td>
            <td>
                <BlockTime blockNumber={item.blockNumber} />
            </td>
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

function parsePublicKey(key) {
    const matches = key.replace('0x', '').match(/.{1,8}/g);
    return matches ? matches.join(' ') : key;
}

export default function Identity() {
    const [, { handle }] = useRoute('/identities/:handle');
    const [ikvset, setIkvset] = useState([]);
    const [owner, setOwner] = useState();
    const [deployers, setDeployers] = useState([]);
    const [isLoadingOwner, setIsLoadingOwner] = useState(true);
    const [isLoadingIkv, setIsLoadingIkv] = useState(true);
    const [isLoadingDeployers, setIsLoadingDeployers] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [addAddress, setAddAddress] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [isLoadingPublicKey, setIsLoadingPublicKey] = useState(true);
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

    const fetchOwner = async () => {
        setIsLoadingOwner(true);
        const result = await window.point.identity.identityToOwner({
            identity: handle,
        });
        setOwner(result.data.owner);
        setIsLoadingOwner(false);
        setIsOwner(
            result.data.owner.toLowerCase() === walletAddr.toLowerCase(),
        );
    };

    const fetchPublicKey = async () => {
        if (isOwner) {
            setPublicKey(walletPublicKey);
            return;
        }

        setIsLoadingPublicKey(true);
        try {
            const result = await window.point.identity.publicKeyByIdentity({
                identity: handle,
            });
            setPublicKey(result.data.publicKey);
        } catch {
            setPublicKey('n/a');
        } finally {
            setIsLoadingPublicKey(false);
        }
    };

    useEffect(() => {
        fetchPublicKey();
    }, [isOwner]);

    const filteredIkvset = Object.values(
        (ikvset || []).reduce((collected, newItem) => {
            const {
                data: { key, value, version },
                blockNumber,
            } = newItem;
            const old = collected[key];
            if (!old) {
                collected[key] = {
                    key,
                    value,
                    version,
                    blockNumber,
                };
                return collected;
            }
            if (old.blockNumber < blockNumber) {
                collected[key] = {
                    key,
                    value,
                    version,
                    blockNumber,
                };
            }
            return collected;
        }, {}),
    );

    const fetchIkv = async () => {
        setIsLoadingIkv(true);
        const ikvsetFetched = await window.point.contract.events({
            host: '@',
            contract: 'Identity',
            event: 'IKVSet',
            filter: { identity: handle },
        });
        if (ikvsetFetched.data !== '') {
            setIkvset(ikvsetFetched.data);
        }
        setIsLoadingIkv(false);
    };

    const fetchDeployers = async () => {
        setIsLoadingDeployers(true);
        const deployersFetched = await window.point.contract.events({
            host: '@',
            contract: 'Identity',
            event: 'IdentityDeployerChanged',
            filter: { identity: handle },
        });
        if (deployersFetched.data !== '') {
            setDeployers(deployersFetched.data);
        }
        setIsLoadingDeployers(false);
    };

    const renderDeployerEntry = (deployer) => {
        const lastEntry = deployers
            .filter((e) => e.data.deployer === deployer)
            .reduce((prev, current) =>
                prev.blockNumber > current.blockNumber ? prev : current,
            );
        return (
            <tr key={deployer}>
                <th>
                    <OwnerToIdentity owner={deployer} />
                </th>
                <td>{deployer}</td>
                <td>
                    {lastEntry.data.allowed === true ? 'Allowed' : 'Revoked'}
                </td>
                <td>
                    <BlockTime blockNumber={lastEntry.blockNumber} />
                </td>

                {isOwner ? (
                    <td>
                        {lastEntry.data.allowed === true ? (
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={() => revokeDeployer(deployer)}
                            >
                                Revoke
                            </button>
                        ) : (
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => activateDeployer(deployer)}
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

    const activateDeployer = async (deployer) => {
        try {
            setIsLoadingDeployers(true);
            await window.point.contract.call({
                contract: 'Identity',
                method: 'addIdentityDeployer',
                params: [handle, deployer],
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

    const [ikvNewEntryKey, setIkvNewEntryKey] = useState('');
    const [ikvNewEntryValue, setIkvNewEntryValue] = useState('');
    const [ikvNewEntryVersion, setIkvNewEntryVersion] = useState('');

    const [addingNewIkv, setAddingNewIkv] = useState(false);

    const cleanForm = () => {
        setIkvNewEntryKey('');
        setIkvNewEntryValue('');
        setIkvNewEntryVersion('');
    };

    const addIkvEntry = async () => {
        setAddingNewIkv(true);
        let regexp = new RegExp(/\d+\.\d+\.\d+/);
        if(!regexp.test(ikvNewEntryVersion)){
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
                    handle,
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

    const addEntryButtonEnabled =
        !addingNewIkv &&
        Boolean(ikvNewEntryKey) &&
        Boolean(ikvNewEntryValue) &&
        Boolean(ikvNewEntryVersion);

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
                    <tr>
                        <th>Domain Space:</th>
                        <td>
                            <a
                                href={'https://' + handle + '.point/'}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {handle}.point
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <th>Communication Public Key:</th>
                        <td className="overflow-wrap: break-word;">
                            {isLoadingPublicKey ? (
                                <Loading />
                            ) : (
                                parsePublicKey(publicKey)
                            )}
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
                        {filteredIkvset.length ? (
                            <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                                <thead>
                                    <th>Key</th>
                                    <th>Value</th>
                                    <th>Version</th>
                                    <th>Modified</th>
                                    <th></th>
                                </thead>
                                <tbody>
                                    {filteredIkvset.map((item) => (
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
                            {[
                                ...new Set(
                                    deployers.map((e) => e.data.deployer),
                                ),
                            ].map((deployer) => renderDeployerEntry(deployer))}
                        </tbody>
                    </table>
                    <EmptyMsg />
                </>
            )}
        </Container>
    );
}
