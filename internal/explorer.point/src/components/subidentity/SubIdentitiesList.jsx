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
                    <tr key={s.handle}>
                        <td>
                            <Link
                                to={`/identities/${s.handle}`}
                                target="_blank"
                            >
                                @{s.handle}
                            </Link>
                        </td>
                        <td className="mono">{s.owner}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
