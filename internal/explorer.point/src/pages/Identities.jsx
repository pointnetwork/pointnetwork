import Container from 'react-bootstrap/Container';
import Loading from '../components/Loading';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';

const PAGE_SIZE = 100;

export default function Identities() {
    const [identities, setIdentities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [identitiesLength, setIdentitiesLength] = useState(0);
    const [cursor, setCursor] = useState(0);

    useEffect(() => {
        fetchIdentities();
    }, []);

    const fetchIdentities = async () => {
        if (identitiesLength === 0) {
            setIsLoading(true);
        }

        const identitiesLengthFetched = await window.point.contract.call({
            contract: 'Identity',
            method: 'getIdentitiesLength',
            params: [],
        });

        setIdentitiesLength(identitiesLengthFetched.data);

        const ids = await window.point.contract.call({
            contract: 'Identity',
            method: 'getPaginatedIdentities',
            params: [cursor, PAGE_SIZE],
        });

        setCursor(cursor + ids.data.length);

        if (
            identities.length + ids.data.length >=
            identitiesLengthFetched.data
        ) {
            setHasMore(false);
        }

        setIdentities(
            identities.concat(
                ids.data.map((e) => {
                    return { handle: e[0], owner: e[1], hasDomain: e[2] };
                }),
            ),
        );

        if (identitiesLength === 0) {
            setIsLoading(false);
        }
    };

    const renderIdentityEntry = (id) => {
        const domainExists = id.hasDomain;

        return (
            <tr key={id.handle}>
                <td>
                    <Link to={'/identities/' + id.handle} target="_blank">
                        @{id.handle}
                    </Link>
                </td>
                <td className="mono">{id.owner}</td>
                <td className="mono">
                    <b>
                        {domainExists ? (
                            <a
                                href={'https://' + id.handle + '.point'}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {id.handle + '.point'}
                            </a>
                        ) : (
                            ''
                        )}
                    </b>
                </td>
            </tr>
        );
    };

    return (
        <>
            <Container className="p-3">
                <br />
                <h1>Identities</h1>
                Total: {identitiesLength}
                <hr />
                <InfiniteScroll
                    dataLength={identities.length}
                    next={fetchIdentities}
                    hasMore={hasMore}
                    loader={<Loading />}
                    style={{ height: 'inherit', overflow: 'inherit' }}
                >
                    <table className="table table-bordered table-striped table-hover table-responsive table-primary">
                        <tbody>
                            <tr>
                                <th>Handle</th>
                                <th>Owner</th>
                                <th>App</th>
                            </tr>

                            {isLoading
                                ? null
                                : identities.map((e) => renderIdentityEntry(e))}
                        </tbody>
                    </table>
                </InfiniteScroll>
            </Container>
        </>
    );
}
