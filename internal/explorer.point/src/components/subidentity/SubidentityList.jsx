import { Link } from 'wouter';

export default function SubidentityList({ subidentities, loading, owner }) {
    if ((!subidentities || subidentities.length === 0) && !loading) {
        return (
            <div style={{ marginBottom: 100 }}>
                <p>No sub-identities registered.</p>
            </div>
        );
    }

    if (subidentities && subidentities.length > 0) {
        return (
            <table className="table table-bordered table-striped table-hover table-responsive table-primary mb-4">
                <tbody>
                    <tr>
                        <th>Handle</th>
                        <th>Owner</th>
                    </tr>
                    {subidentities.map((s) => (
                        <tr key={`${s}`}>
                            <td>
                                <Link
                                    to={`/identities/${s}`}
                                    target="_blank"
                                >
                                    @{s}
                                </Link>
                            </td>
                            <td className="mono">
                                {owner.toLowerCase()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return null;
}
