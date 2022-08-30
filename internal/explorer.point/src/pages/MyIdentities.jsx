import Container from 'react-bootstrap/Container';
import { Link, Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Subidentities from '../components/subidentity/Subidentities';

export default function MyIdentities({ owner }) {
    const { walletIdentity } = useAppContext();

    if (!owner) {
        return <Navigate to="/identities" />;
    }

    return (
        <Container className="p-3">
            <br />
            <h1>My Identities</h1>
            <hr />
            <table className="table table-bordered table-striped table-hover table-responsive table-primary mb-4">
                <tbody>
                    <tr>
                        <th>Handle</th>
                        <th>Owner</th>
                    </tr>
                    <tr>
                        <td>
                            <Link
                                to={`/identities/${walletIdentity}`}
                                target="_blank"
                            >
                                @{walletIdentity}
                            </Link>
                        </td>
                        <td className="mono">{owner}</td>
                    </tr>
                </tbody>
            </table>

            <Subidentities owner={owner} />
        </Container>
    );
}
