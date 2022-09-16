import React, { useState } from 'react';
import Swal from 'sweetalert2';
import isHash from '../../utils/isHash';

const IkvEntry = ({ handle, item, onUpdated, showEdit }) => {
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
                ) : null}
            </td>
        </tr>
    );
};

export default IkvEntry;
