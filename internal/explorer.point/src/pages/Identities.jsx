import Container from 'react-bootstrap/Container';
import Loading from '../components/Loading';
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import orderBy from 'lodash/orderBy';
import InfiniteScroll from "react-infinite-scroll-component";

export default function Identities({ owner }) {
    const [identities, setIdentities] = useState([]);
    const [ikvset, setIkvset] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [presentedItems, setPresentedItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);

    const PAGE_SIZE = 1000;

    useEffect(() => {
        fetchIdentities();
    }, [owner]);

    fetchMoreData = () => {
        const initialIndex = presentedItems.length;
        const finalIndex = presentedItems.length + PAGE_SIZE < identities.length 
                    ? presentedItems.length + PAGE_SIZE : identities.length;
        if(finalIndex == identities.length){
            setHasMore(false);
        }
        
        setPresentedItems(presentedItems.concat(identities.slice(initialIndex, finalIndex)));
    };

    const fetchIdentities = async () => {
        setIsLoading(true);
        const identitiesFetched =
            owner !== undefined
                ? await window.point.contract.events({
                      host: '@',
                      contract: 'Identity',
                      event: 'IdentityRegistered',
                      filter: {
                          identityOwner: owner,
                      },
                  })
                : await window.point.contract.events({
                      host: '@',
                      contract: 'Identity',
                      event: 'IdentityRegistered',
                  });
        if (identitiesFetched.data != '') {
            const handleOrder = (identity) =>
                identity.data.handle.toLowerCase();
            const blockOrder = 'blockNumber';
            const sortedIdentities = orderBy(
                identitiesFetched.data,
                [blockOrder, handleOrder],
                ['desc', 'desc'],
            );
            setIdentities(sortedIdentities);
        }

        const ikvsetFetched = await window.point.contract.events({
            host: '@',
            contract: 'Identity',
            event: 'IKVSet',
        });
        if (ikvsetFetched.data != '') {
            setIkvset(ikvsetFetched.data);
        }
        fetchMoreData();
        setIsLoading(false);
    };

    const renderIdentityEntry = (id) => {
        const domainExists =
            ikvset.filter(
                (ikve) =>
                    ikve.data.identity == id.handle &&
                    ikve.data.key == 'zdns/routes',
            ).length > 0;

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
                <h1>{owner !== undefined ? 'My ' : ''}Identities</h1>
                Total: {identities.length}
                <hr />
                <InfiniteScroll
                    dataLength={presentedItems.length}
                    next={fetchMoreData}
                    hasMore={hasMore}
                    loader={<Loading />}
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
                            : presentedItems.map((e) =>
                                  renderIdentityEntry(e.data),
                              )}
                        
                    </tbody>
                </table>
                </InfiniteScroll>
            </Container>
        </>
    );
}
