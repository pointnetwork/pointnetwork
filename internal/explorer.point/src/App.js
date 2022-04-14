import { useEffect, useState } from "react";
import { ProvideAppContext } from './context/AppContext'
import { Route, Switch } from 'wouter'
import Header from './components/Header';
import Home from './pages/Home'
import Identities from './pages/Identities'
import Identity from './pages/Identity'
import Final from './pages/Final'
import Wallet from './pages/Wallet'

const Main = () => {

    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(()=>{
        fetchIdentityRegistred();
      },[])

    const fetchIdentityRegistred = async () => {
        const response = await fetch('/v1/api/identity/isIdentityRegistered/');
        const registred = await response.json();
        setIsRegistered(registred.data.identityRegistred);
    }

    return (
        <main>
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
                        </Switch>
                        :
                        <Final/>
                }
        </main>
    )
}

export default App = () => <ProvideAppContext><Main/></ProvideAppContext>