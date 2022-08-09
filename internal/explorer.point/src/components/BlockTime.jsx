import { useState, useEffect } from 'react';
import Loading from '../components/Loading';
import * as dayjs from 'dayjs';

const BlockTime = ({ blockNumber }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [timestamp, setTimestamp] = useState();

    useEffect(() => {
        fetchBlockTime();
    }, []);

    const fetchBlockTime = async () => {
        setIsLoading(true);
        const response = await fetch('/v1/api/identity/blockTimestamp', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                blockNumber: blockNumber,
                _csrf: window.localStorage.getItem('csrf_token'),
            }),
        });
        const responseJson = await response.json();
        setTimestamp(responseJson.data.timestamp);
        setIsLoading(false);
    };

    return isLoading ? (
        <Loading />
    ) : (
        dayjs(timestamp * 1000).format('YYYY-MM-DD H:m:s')
    );
};

export default BlockTime;
