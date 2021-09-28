import "./feed.css";
import { useEffect, useState } from "react";
import Post from "../post/Post";
import Share from "../share/Share";
import { useAppContext } from '../../context/AppContext';

export default Feed = () =>{
  const [posts, setPosts] = useState([])

  const { walletAddress } = useAppContext()

  const compareByTimestamp = ( post1, post2 ) => {
    // sorts accending (newest first)
    if ( post1.timestamp < post2.timestamp ){
      return 1;
    }
    if ( post1.timestamp > post2.timestamp ){
      return -1;
    }
    return 0;
  }

  useEffect(() => {
    const getPosts = async () => {
      const posts = await fetchPosts()
      posts.sort(compareByTimestamp)
      setPosts(posts);
    }

    getPosts()
  }, [])

  const fetchPosts = async () => {
    const response = await window.point.contract.call({contract: 'PointSocial', method: 'getAllPosts'});

    const posts = response.data.map(([id, from, contents, image, timestamp]) => (
        {id, from, contents, image, timestamp: timestamp*1000}
      )
    )

    const postsContent = await Promise.all(posts.map(async (post) => {
      const {data: contents} = await window.point.storage.getString({ id: post.contents, encoding: 'utf-8' });
      post.contents = contents;
      return post;
    }))

    return postsContent;
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
