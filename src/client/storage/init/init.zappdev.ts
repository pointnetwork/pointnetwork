import axios from 'axios';
import {HOST, PORT, PROTOCOL, USE_ARLOCAL} from '../config';
import arweave, {arweaveKey} from '../client/client_zappdev';

const init = async () => {
    // mint tokens on arlocal
    if (USE_ARLOCAL && arweaveKey !== undefined) {
        const address = await arweave.wallets.jwkToAddress(arweaveKey);
        await axios.get(`${PROTOCOL}://${HOST}:${PORT}/mint/${address}/100000000000000000000`);
    }
};

export default init;
