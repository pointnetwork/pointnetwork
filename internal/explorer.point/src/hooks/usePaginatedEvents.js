import { useState, useEffect, useRef } from 'react';

export default function usePaginatedEvents({ host, contract, event, filter }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const mounted = useRef(true);

    useEffect(() => {
        async function fetchData(cursor = 'latest') {
            setError('');
            try {
                const resp = await window.point.contract.events({
                    host,
                    contract,
                    event,
                    filter: {
                        ...filter,
                        cursor,
                    },
                });

                const pagination = resp.data.pagination || {};
                const events = resp.data.events || [];
                setData((prev) => [...prev, ...events]);

                if (pagination.nextCursor && mounted.current) {
                    fetchData(pagination.nextCursor);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        }

        fetchData();
        return () => (mounted.current = false);
    }, []);

    return { data, loading, error };
}
