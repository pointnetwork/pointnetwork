import './identity.css'
import { useAppContext } from '../../context/AppContext';
import { AccountBalanceWallet } from "@material-ui/icons";
import LoadingSpinner from '../loading/LoadingSpinner';

const Identity = () => {
    const { walletAddress, walletError } = useAppContext();

    return (
        <div className="identity mb-10">
            <div className="identityWrapper deep-blue">
                <div className="flex v-center pb-5 deep-blue"><span className="inline deep-blue"><AccountBalanceWallet className="mr-5" /></span><span className="inline bold pl-5 deep-blue">My Wallet ID</span></div>
                {(!walletAddress && walletError) && <span className='error'>Error loading wallet: {walletError.message}.</span>}
                <span className="show-wallet-no block pl-28">{ walletAddress || <LoadingSpinner /> }</span>
            </div>
        </div>
    )
}

export default Identity