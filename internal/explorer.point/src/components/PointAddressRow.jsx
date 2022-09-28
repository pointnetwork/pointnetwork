import useLinkPointToSol from '../hooks/useLinkPointToSol';

const PointAddressRow = ({ handle, pointAddress, isOwner }) => {
    const linkPointToSol = useLinkPointToSol(handle);

    // Not a .sol domain, don't render anything.
    if (!handle.endsWith('.sol')) {
        return null;
    }

    // There's an associated Point Address, render it.
    if (pointAddress) {
        return (
            <tr>
                <th>Point Address:</th>
                <td>{pointAddress}</td>
            </tr>
        );
    }

    // No Point Address and user is not owner of the identity
    // being displayed, don't render anything.
    if (!isOwner) {
        return null;
    }

    // No Point Address and user is owner of the identity,
    // give option to link Point Address to .sol domain.
    return (
        <tr>
            <th>Point Address:</th>
            <td style={{ display: 'flex', alignItems: 'center' }}>
                You don&apos;t have a POINT address linked to your SOL domain.
                <button
                    className="btn btn-sm btn-outline-success"
                    onClick={linkPointToSol}
                    style={{ marginLeft: 8 }}
                >
                    Link now
                </button>
            </td>
        </tr>
    );
};

export default PointAddressRow;
