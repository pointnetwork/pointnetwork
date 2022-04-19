import { useState,useEffect } from "react";
import Loading from '../components/Loading';

const BlockTime = ({blockNumber}) => {

    const [isLoading, setIsLoading] = useState(true);
    const [timestamp, setTimestamp] = useState();

    useEffect(()=>{
        fetchBlockTime();
    },[]);

    const fetchBlockTime = async () => {
        setIsLoading(true);
        const response = await fetch('/v1/api/identity/blockTimestamp', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({blockNumber: blockNumber})
        });
        const responseJson = await response.json();
        setTimestamp(responseJson.data.timestamp)
        setIsLoading(false);
    }

    return(
        isLoading ? <Loading/> : new Date(timestamp * 1000).toUTCString()
    );
}

export default BlockTime;