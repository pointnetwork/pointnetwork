import Header from './components/Header'
import Footer from './components/Footer'
import Statuses from './components/Statuses';
import StatusView from './components/StatusView';
import { useEffect, useState } from 'react';
import { Route, useLocation } from 'wouter'

const App = () => {
  const [statuses, setStatuses] = useState([])
  const [,setLocation] = useLocation()

  useEffect(() => {
    const getStatuses = async () => {
      const statuses = await fetchStatuses()
      setStatuses(statuses);
    }

    getStatuses()
  }, [])

  const fetchStatuses = async () => {
    const response = await window.point.contract.call({contract: 'PointSocial', method: 'getAllStatuses'});

    for(let i=0; i<response.data.length; i++) {
      const content = await window.point.storage.get({ id: response.data[i][2], encoding: 'utf-8' });
      response.data[i][2] = content.data;
    }

    return response.data.map(([id, from, contents]) => ({id, from, contents}))
  }

  return (
    <div>
      <Header />
        <Route path='/'>
          <div className='container'>
            {
              statuses.length > 0 ? <Statuses statuses={ statuses } />: 'No statuses to show!'
            }
          </div>
        </Route>
        <Route path='/status/:statusId'><StatusView /></Route>
      <Footer />
    </div>
  );
}

export default App;