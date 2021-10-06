import { ProvideAppContext } from './context/AppContext'
import { Route } from 'wouter'
import Home from './pages/home/home'
import Profile from './pages/profile/Profile'

const Main = () => {
    return (
        <main>
            <Route path='/'>
                <Home/>
            </Route>
            <Route path="/profile/:account">
                <Profile />
            </Route>
        </main>
    )
}

export default App = () => <ProvideAppContext><Main/></ProvideAppContext>