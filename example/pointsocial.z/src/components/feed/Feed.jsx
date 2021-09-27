import "./feed.css";
import { useEffect, useState } from "react";
import Post from "../post/Post";
import Share from "../share/Share";
import { useAppContext } from '../../context/AppContext';

export default Feed = () =>{
  const [posts, setPosts] = useState([])

  const { walletAddress } = useAppContext()

  useEffect(() => {
    const getPosts = async () => {
      const posts = await fetchPosts()
      setPosts(posts);
    }

    getPosts()
  }, [])

  const fetchPosts = async () => {
    const response = await window.point.contract.call({contract: 'PointSocial', method: 'getAllPosts'});

    for(let i=0; i<response.data.length; i++) {
      const content = await window.point.storage.getString({ id: response.data[i][2], encoding: 'utf-8' });
      response.data[i][2] = content.data;
    }

    return response.data.map(( [id, from, contents, image]) => ({id, from, contents, image}))
  }

  return (
    <div className="feed">
      <div className="feedWrapper">
        <h4>Wallet Address: { walletAddress || 'Loading...' }</h4>
        <Share />
        {posts.map((p) => (
          <Post key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}
