import './identity.css'
import { useAppContext } from '../../context/AppContext';
import { AccountBalanceWallet } from "@material-ui/icons";
const Identity = () => {
    const { walletAddress } = useAppContext()
    return (
        <div className="identity mb-10">
            <div className="identityWrapper deep-blue">
                <div className="flex v-center pb-5 deep-blue"><span className="inline deep-blue"><AccountBalanceWallet className="mr-5" /></span><span className="inline bold pl-5 deep-blue">My Wallet ID</span></div>
                <span className="show-wallet-no block pl-28">{ walletAddress || 'Loading...' }</span>
            </div>
        </div>
    )
}

export default Identity