import "./feed.css";
import { useEffect, useState } from "react";
import Post from "../post/Post";
import Share from "../share/Share";
import Identity from "../identity/Identity";
import LoadingSpinner from '../loading/LoadingSpinner';

const Feed = ({account}) =>{
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(undefined);

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

  const getPosts = async () => {
    setLoading(true);
    const posts = await fetchPosts()
    posts.sort(compareByTimestamp)
    setPosts(posts);
    setLoading(false);
  }

  useEffect(() => {
      getPosts()
  }, [account])

  const fetchPosts = async () => {
    try {
      const response = account
        ? await window.point.contract.call({contract: 'PointSocial', method: 'getAllPostsByOwner', params: [account]}) :
        await window.point.contract.call({contract: 'PointSocial', method: 'getAllPosts'})

      const posts = response.data.map(([id, from, contents, image, createdAt, likesCount, commentsCount]) => (
          {id, from, contents, image, createdAt: createdAt*1000, likesCount, commentsCount}
        )
      )

      const postsContent = await Promise.all(posts.map(async (post) => {
        const {data: contents} = await window.point.storage.getString({ id: post.contents, encoding: 'utf-8' });
        const {data: {identity}} = await window.point.identity.ownerToIdentity({owner: post.from});
        post.identity = identity;
        post.contents = contents;
        return post;
      }))

      return postsContent;
    } catch(e) {
      console.error('Error loading feed: ', e.message);
      setLoading(false);
      setFeedError(e);
    }
  }

  // function reloads the post by id and updates the likes count of the object in state
  const reloadPostLikesCount = async(id) => {
    let post = await window.point.contract.call({contract: 'PointSocial', method: 'getPostById', params: [id]});
    const updatedPosts = [...posts];
    const updatedLikesCount = post.data[5];
    updatedPosts.filter((post) => post.id === id)[0].likesCount = updatedLikesCount;
    setPosts(updatedPosts);
  }

  return (
    <div className="feed">
      <div className="feedWrapper">
        {!account && <div><Identity /><Share getPosts={getPosts} /></div>}
        {loading && <LoadingSpinner />}
        {(!loading && feedError) && <span className='error'>Error loading feed: {feedError.message}. Did you deploy the contract sucessfully?</span>}
        {(!loading && !feedError && posts.length === 0) && <span className='no-post-to-show'>No posts made yet!</span>}
        {posts.map((p) => (
          <Post key={p.id} post={p} reloadPostLikesCount={reloadPostLikesCount} />
        ))}
      </div>
    </div>
  );
}
export default Feed