import { useState, useEffect, useRef, useCallback } from 'react';

export default function usePaginatedEvents({ host, contract, event, filter }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const mounted = useRef(false);
    const [rerender, setRerender] = useState(0);

    const refetch = useCallback((delay = 0) => {
        // Optionally add a delay in case the refetch occurs after sending a tx.
        setTimeout(() => {
            if (mounted.current) {
                setRerender((prev) => prev + 1);
            }
        }, delay);
    }, []);

    useEffect(() => {
        mounted.current = true;
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
    }, [rerender]);

    const add = useCallback((newItem) => {
        setData((prev) => [...prev, newItem]);
    }, []);

    return { data, loading, error, add, refetch };
}
