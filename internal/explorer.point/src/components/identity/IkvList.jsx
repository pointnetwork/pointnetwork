import Loading from '../Loading';
import IkvEntry from './IkvEntry';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAppContext } from '../../context/AppContext';

/**
 * Render a list of ikv
 * 
 * @param {object} props
 * @param {boolean} props.isPointIdentity - if is a point identity
 * @param {address} props.owner - the address of the owner of the identity
 * @returns 
 */
const IkvList = ({ isPointIdentity, owner }) => {
    const { handle } = useParams();
    const { walletAddr } = useAppContext();
    const [ikvset, setIkvset] = useState([]);
    const [isLoadingIkv, setIsLoadingIkv] = useState(true);
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

    useEffect(() => {
        fetchIkv();
    }, [handle]);

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
        <div className="mt-5 mb-5">
            <h3 className="mb-4">Identity Key Value Store (ikv):</h3>
            {isLoadingIkv ? (
                <Loading />
            ) : (
                <>
                    {ikvset.length > 0 ? (
                        <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                            <thead>
                                <tr>
                                    <th>Key</th>
                                    <th>Value</th>
                                    <th>Version</th>
                                    <th />
                                </tr>
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
                            <em>No records found</em>
                        </div>
                    )}
                    {showIkvEditForm && (
                        <div className="row g-3 mt-3">
                            <h5>Add new entry</h5>
                            <div className="col-xs-12 col-sm-3">
                                <input
                                    type="text"
                                    name="ikvEntryKey"
                                    value={ikvNewEntryKey}
                                    onChange={(event) =>
                                        setIkvNewEntryKey(event.target.value)
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
                                        setIkvNewEntryValue(event.target.value)
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
                    )}
                </>
            )}
        </div>
    );
};

export default IkvList;
