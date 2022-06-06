import "@fontsource/karla/600.css";
import { useEffect, useState } from "react";
import { ProvideAppContext } from './context/AppContext'
import { Route, Switch } from 'wouter'
import Header from './components/Header';
import Home from './pages/Home'
import Identities from './pages/Identities'
import Identity from './pages/Identity'
import Final from './pages/Final'
import Wallet from './pages/Wallet'
import Zapps from './pages/Zapps'
import Loading from "./components/Loading";

const Main = () => {

    const [isRegistered, setIsRegistered] = useState(false);
    const [walletAddr, setWalletAddr] = useState();
    const [isLoading, setIsLoading] = useState(true)

    useEffect(()=>{
        fetchIdentityRegistred();
      },[])

    const fetchIdentityRegistred = async () => {
        setIsLoading(true);
        const response = await fetch('/v1/api/identity/isIdentityRegistered/');
        const registred = await response.json();
        setIsRegistered(registred.data.identityRegistred);
        if(registred.data.identityRegistred){
            const resultAddr = await window.point.wallet.address();
            setWalletAddr(resultAddr.data.address);
        }
        setIsLoading(false);
    }

    

    return (
        <main>
            {isLoading ? <Loading /> :
                <>
                    <Header isRegistered={isRegistered}/>
                    { 
                        isRegistered 
                            ? 
                            <Switch>
                                <Route path='/'>
                                    <Home/>
                                </Route>
                                <Route path='/wallet'>
                                    <Wallet/>
                                </Route>
                                <Route path='/identities/:handle' component={Identity} />
                                <Route path='/identities'>
                                    <Identities/>
                                </Route>
                                <Route path='/zapps'>
                                    <Zapps/>
                                </Route>
                                <Route path='/myidentities'>
                                    <Identities owner={walletAddr}/>
                                </Route>
                            </Switch>
                            :
                            <Final/>
                    }
                </>
            }
        </main>
    )
}

export default App = () => <ProvideAppContext><Main/></ProvideAppContext>