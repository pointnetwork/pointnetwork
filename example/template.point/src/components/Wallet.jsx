import Badge from 'react-bootstrap/Badge';
import { Wallet as WalletIcon } from 'react-bootstrap-icons';

const Wallet = ({walletAddress}) => {
    return (
        <>
            <p>Connected Wallet Address: <WalletIcon />{' '}<Badge pill bg="success">{ walletAddress }</Badge>{' '}</p>
        </>
    )
}

export default Wallet