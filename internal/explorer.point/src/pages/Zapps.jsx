import Container from 'react-bootstrap/Container';
import Loading from '../components/Loading';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';

const PAGE_SIZE = 100;

export default function Zapps() {
    const [zapps, setZapps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [dappsLength, setDappsLength] = useState(0);
    const [cursor, setCursor] = useState(0);

    const fetchZapps = async () => {
        if (dappsLength === 0) {
            setIsLoading(true);
        }

        const dappsLengthFetched = await window.point.contract.call({
            contract: 'Identity',
            method: 'getDappsLength',
            params: [],
        });

        setDappsLength(dappsLengthFetched.data);

        const dappsFetched = await window.point.contract.call({
            contract: 'Identity',
            method: 'getPaginatedDapps',
            params: [cursor, PAGE_SIZE],
        });

        setCursor(cursor + dappsFetched.data.length);

        if (
            zapps.length + dappsFetched.data.length >=
            dappsLengthFetched.data
        ) {
            setHasMore(false);
        }

        setZapps(
            zapps.concat(
                dappsFetched.data.map((e) => {
                    return { handle: e[0], owner: e[1], hasDomain: e[2] };
                }),
            ),
        );

        if (dappsLength === 0) {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchZapps();
    }, []);

    const renderZappEntry = (id) => {
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

    return (
        <>
            <Container className="p-3">
                <br />
                <h1>Apps</h1>
                Total: {dappsLength}
                <hr />
                <InfiniteScroll
                    dataLength={zapps.length}
                    next={fetchZapps}
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
                                : zapps.map((e) => renderZappEntry(e))}
                        </tbody>
                    </table>
                </InfiniteScroll>
            </Container>
        </>
    );
}
