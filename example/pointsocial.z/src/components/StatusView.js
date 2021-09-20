import React, { useState, useEffect } from 'react'
import { useRoute } from 'wouter'

const StatusView = () => {
    const [statusId, setStatusId] = useState();
    const [status, setStatus] = useState({});
    const [, params] = useRoute('/status/:statusId');

    if (params?.statusId && params.statusId !== statusId) {
        setStatusId(params.statusId)
    }

    useEffect(() => {
        if (!statusId) {
            console.log('statusId is not found in path')
            return
        }

        (async () => {
            try {
                const response = await window.point.contract.call({
                    contract: 'PointSocial',
                    method: 'getStatusById',
                    params: [parseInt(statusId)]
                });

                const contentsString = await window.point.storage.get({ id: response.data[2], encoding: 'utf-8' });
                response.data[2] = contentsString.data;

                const [id, from, contents, timestamp] = response.data;
                const status = {id, from, contents, timestamp};

                if (!status) {
                    console.error('Incorrect getStatusById response:', response);
                    throw new Error('Incorrect status data');
                }

                setStatus(status);

            } catch (e) {
                setStatusError(e);
            }
        })();
    }, [statusId])

    return (
        <div>
            <h3>{status.contents}</h3>
            <h4>From: {status.from}</h4>
            <h4>Date: {status.timestamp}</h4>
        </div>
    )
}

export default StatusView