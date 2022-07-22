import { Link } from 'wouter';

export default function SubIdentitiesList({ subidentities }) {
    if (!subidentities || subidentities.length === 0) {
        return (
            <div style={{ marginBottom: 100 }}>
                <p>No sub-identities registered.</p>
            </div>
        );
    }

    return (
        <table className="table table-bordered table-striped table-hover table-responsive table-primary mb-4">
            <tbody>
                <tr>
                    <th>Handle</th>
                    <th>Owner</th>
                </tr>
                {subidentities.map((s) => (
                    <tr key={`${s.data.subhandle}.${s.data.handle}`}>
                        <td>
                            <Link
                                to={`/identities/${s.data.subhandle}.${s.data.handle}`}
                                target="_blank"
                            >
                                @{s.data.subhandle}.{s.data.handle}
                            </Link>
                        </td>
                        <td className="mono">
                            {s.data.identityOwner.toLowerCase()}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
