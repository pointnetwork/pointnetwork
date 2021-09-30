import "./feed.css";
import { useEffect, useState } from "react";
import Post from "../post/Post";
import Share from "../share/Share";
import { useAppContext } from '../../context/AppContext';
import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';

export default Feed = ({account}) =>{
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true);
  const { walletAddress } = useAppContext()

  const compareByTimestamp = ( post1, post2 ) => {
    // sorts accending (newest first)
    if ( post1.createdAt < post2.createdAt ){
      return 1;
    }
    if ( post1.createdAt > post2.createdAt ){
      return -1;
    }
    return 0;
  }

  useEffect(() => {
    const getPosts = async () => {
      const posts = await fetchPosts()
      posts.sort(compareByTimestamp)
      setPosts(posts);
      setLoading(false);
    }

    getPosts()
  }, [account])

  const fetchPosts = async () => {
    const response = account
      ? await window.point.contract.call({contract: 'PointSocial', method: 'getAllPostsByOwner', params: [account]}) :
      await window.point.contract.call({contract: 'PointSocial', method: 'getAllPosts'})

    const posts = response.data.map(([id, from, contents, image, createdAt, likesCount, commentsCount]) => (
        {id, from, contents, image, createdAt: createdAt*1000, likesCount, commentsCount}
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
        {!account && <div><h4>Wallet Address: { walletAddress || 'Loading...' }</h4><Share /></div>}
        <br />
        {loading && <Box sx={{ display: 'flex' }}>
          <CircularProgress />
        </Box>}
        {(!loading && posts.length == 0) && 'No posts made yet!'}
        {posts.map((p) => (
          <Post key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}
