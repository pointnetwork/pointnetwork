import Container from 'react-bootstrap/Container';
import Loading from '../components/Loading';
import { useState, useEffect } from 'react';
import { Link } from 'wouter';

export default function Zapps() {
    const [zapps, setZapps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchZapps();
    }, []);

    const fetchZapps = async () => {
        setIsLoading(true);
        const zappsFetched = [];
        const identitiesFetched = await window.point.contract.events({
            host: '@',
            contract: 'Identity',
            event: 'IdentityRegistered',
        });

        const ikvsetFetched = await window.point.contract.events({
            host: '@',
            contract: 'Identity',
            event: 'IKVSet',
        });
        if (ikvsetFetched.data != '') {
            for (const id of identitiesFetched.data) {
                const domainExists =
                    ikvsetFetched.data.filter(
                        (ikve) =>
                            ikve.data.identity == id.data.handle &&
                            ikve.data.key == 'zdns/routes',
                    ).length > 0;
                if (domainExists) {
                    zappsFetched.push(id.data);
                }
            }
        }
        setZapps(zappsFetched);
        setIsLoading(false);
    };

    const renderZappEntry = (id) => {
        return (
            <tr key={id.handle}>
                <td>
                    <Link to={'/identities/' + id.handle} target="_blank">
                        @{id.handle}
                    </Link>
                </td>
                <td className="mono">{id.identityOwner}</td>
                <td className="mono">
                    <b>
                        <a
                            href={'https://' + id.handle + '.point'}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {id.handle + '.point'}
                        </a>
                    </b>
                </td>
            </tr>
        );
    };

    const EmptyMsg = () =>
        zapps.length === 0 ? (
            <div>
                <em>No records found</em>
            </div>
        ) : (
            ''
        );

    return (
        <>
            <Container className="p-3">
                <br />
                <h1>Apps</h1>
                Total: {zapps.length}
                <hr />
                <table className="table table-bordered table-striped table-hover table-responsive table-primary">
                    <tbody>
                        <tr>
                            <th>Handle</th>
                            <th>Owner</th>
                            <th>App</th>
                        </tr>
                        {isLoading
                            ? null
                            : zapps.map((e) => renderZappEntry(e))}
                    </tbody>
                </table>
                {isLoading ? <Loading /> : <EmptyMsg />}
            </Container>
        </>
    );
}
