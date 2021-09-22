import "./feed.css";
import { useEffect, useState } from "react";
import Post from "../post/Post";
import Share from "../share/Share";
import { useAppContext } from '../../context/AppContext';

export default Feed = () =>{
  const [statuses, setStatuses] = useState([])

  const { walletAddress } = useAppContext()

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

    return response.data.map(( [id, from, contents]) => ({id, from, contents}))
  }

  return (
    <div className="feed">
      <div className="feedWrapper">
        <h4>Wallet Address: { walletAddress || 'Loading...' }</h4>
        <Share />
        {statuses.map((p) => (
          <Post key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}
