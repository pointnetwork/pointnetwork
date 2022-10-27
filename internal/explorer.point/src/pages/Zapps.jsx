import Container from 'react-bootstrap/Container';
import Loading from '../components/Loading';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';

/**
 * Renders ZApps page
 * 
 * @returns {JSX.Element} - ZApps page
 */
const PAGE_SIZE = 100;

export default function Zapps() {
    const [zapps, setZapps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [dappsLength, setDappsLength] = useState(0);
    const [cursor, setCursor] = useState(0);

    /**
     * Fetchs the zapps
     */
    const fetchZapps = async () => {
        //didn't fetched yet, so the first time start loading. 
        //After that, infinite scroll handle showing the spinner.
        if (dappsLength === 0) {
            setIsLoading(true);
        }
        // gets the length of all zapps
        const dappsLengthFetched = await window.point.contract.call({
            contract: 'Identity',
            method: 'getDappsLength',
            params: [],
        });
        // set the zapps length
        setDappsLength(dappsLengthFetched.data);

        //fetch the data
        const dappsFetched = await window.point.contract.call({
            contract: 'Identity',
            method: 'getPaginatedDapps',
            params: [cursor, PAGE_SIZE],
        });

        //set the position of the cursor for infinite scroll
        setCursor(cursor + dappsFetched.data.length);

        //checks if has more data to fetch
        if (
            zapps.length + dappsFetched.data.length >=
            dappsLengthFetched.data
        ) {
            setHasMore(false);
        }

        //set the identities state variable variable 
        setZapps(
            zapps.concat(
                dappsFetched.data.map((e) => {
                    return { handle: e[0], owner: e[1], hasDomain: e[2] };
                }),
            ),
        );

        //If is the first time fetching data stops loading.
        //After that, infinite scroll handle showing the spinner.
        if (dappsLength === 0) {
            setIsLoading(false);
        }
    };

    
    useEffect(() => {
        fetchZapps();
    }, []);

    /**
     * Renders one zapp entry 
     * 
     * @param {object} id - an identity object
     * @param {string} id.handle - the identity handle
     * @param {address} id.owner - the address of the owner of the identity
     * 
     * @returns {JSX.Element} - the dapp row
     */
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
