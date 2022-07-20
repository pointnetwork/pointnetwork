import Container from 'react-bootstrap/Container';
import { Link, Redirect } from 'wouter';
import { useAppContext } from '../context/AppContext';
import SubIdentities from '../components/subidentity/SubIdentities';

export default function MyIdentities({ owner }) {
    const { walletIdentity } = useAppContext();

    if (!owner) {
        return <Redirect to="/identities" />;
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

            <SubIdentities owner={owner} />
        </Container>
    );
}
