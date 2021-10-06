import './identity.css'
import { useAppContext } from '../../context/AppContext';
import { AccountBalanceWallet } from "@material-ui/icons";

const Identity = () => {
    const { walletAddress } = useAppContext()
    return (
        <div className="identity">
            <div className="identityWrapper">
                <span><AccountBalanceWallet />{ walletAddress || 'Loading...' }</span>
            </div>
        </div>
    )
}

export default Identity