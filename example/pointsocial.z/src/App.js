import Header from './components/Header'
import Footer from './components/Footer'
import Statuses from './components/Statuses';
import { useEffect, useState } from 'react';

const App = () => {
  const [statuses, setStatuses] = useState([])

  useEffect(() => {
    const getStatuses = async () => {
      const statuses = await fetchStatuses()
      setStatuses(statuses);
    }

    getStatuses()
  }, [])

  const fetchStatuses = async () => {
    const response = await window.point.contract.call({contract: 'PointSocial', method: 'getStatuses'});
    const {data: fetchedStatuses} = response;

    return fetchedStatuses.map(([id, title]) => ({id, title}))
  }

  return (
    <div>
      <Header />
      <div className='container'>
        {
          statuses.length > 0 ? <Statuses statuses={ statuses } />: 'No statuses to show!'
        }
      </div>
      <Footer />
    </div>
  );
}

export default App;