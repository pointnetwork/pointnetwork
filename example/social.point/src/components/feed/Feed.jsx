import "./feed.css";
import { useState,useEffect } from "react";
import { useAppContext } from '../../context/AppContext';
import useInView from 'react-cool-inview'
import Post from "../post/Post";
import Share from "../share/Share";
import Identity from "../identity/Identity";
import LoadingSpinner from '../loading/LoadingSpinner';

const NUM_POSTS_PER_CALL = 20;

const Feed = ({account}) =>{
  const {observe} = useInView({
    onEnter: async({observe,unobserve}) => {
      if(numPosts === posts.length) return;
      unobserve();
      await getPosts();
      observe();
    }
  })

  const [posts, setPosts] = useState([])
  const [numPosts, setNumPosts] = useState()
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(undefined);
  const { walletAddress } = useAppContext();

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

  useEffect(()=>{
    console.log('@@@@@@@@@@posts',posts)
    console.log('@@@@@@@@@@account',account)
  },[posts,account])

  useEffect(()=>{
    getPostsLength();
  },[])

  const getPostsLength = async() => {
    const response = account
    ? await window.point.contract.call({contract: 'PointSocial', method: 'getAllPostsByOwnerLength', params: [account]}) :
    await window.point.contract.call({contract: 'PointSocial', method: 'getAllPostsLength', params:[]})

    setNumPosts(Number(response.data));
  }

  const getPosts = async () => {
    setLoading(true);
    const posts = await fetchPosts()
    posts.sort(compareByTimestamp)
    setPosts(prev => [...prev,...posts]);
    setLoading(false);
  }

  const renderPostsImmediate = ({contents,image}) => {
    setLoading(true);
    let updatedPosts = [...posts];
    let newPostId = posts.length + 1;
    const newPost = {id: newPostId, from: walletAddress, image, contents, createdAt: Date.now(), likesCount:0, commentsCount:0}
    updatedPosts.push(newPost);
    updatedPosts.sort(compareByTimestamp)
    setPosts(updatedPosts);
    setLoading(false);
  }

  const fetchPosts = async () => {
    try {
      const response = account
        ? await window.point.contract.call({contract: 'PointSocial', method: 'getPaginatedPostsByOwner', params: [account,posts.length,NUM_POSTS_PER_CALL]}) :
        await window.point.contract.call({contract: 'PointSocial', method: 'getPaginatedPosts', params:[posts.length,NUM_POSTS_PER_CALL]})

      const _posts = response.data.map(([id, from, contents, image, createdAt, likesCount, commentsCount]) => (
          {id, from, contents, image, createdAt: createdAt*1000, likesCount, commentsCount}
        )
      )

      const postsContent = await Promise.all(_posts.map(async (post) => {
          try {
              const {data: contents} = await window.point.storage.getString({ id: post.contents, encoding: 'utf-8' });
              const {data: {identity}} = await window.point.identity.ownerToIdentity({owner: post.from});
              post.identity = identity;
              post.contents = contents;
          } catch (e) {
              console.error('Failed to load post ' + JSON.stringify(post));
              post.contents = 'Failed to load post';
          }
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
        {!account && <div><Identity /><Share renderPostsImmediate={renderPostsImmediate} getPosts={getPosts} /></div>}
        {(!loading && feedError) && <span className='error'>Error loading feed: {feedError.message}. Did you deploy the contract sucessfully?</span>}
        {(!loading && !feedError && posts.length === 0) && <span className='no-post-to-show'>No posts made yet!</span>}
        {posts.map((p) => (
          <Post key={p.id} post={p} reloadPostLikesCount={reloadPostLikesCount} />
          ))}
        <div ref={observe}>
        {loading && <LoadingSpinner />}
        </div>
      </div>
    </div>
  );
}
export default Feed
