import "./post.css";
import { useState } from "react";
import { useAppContext } from '../../context/AppContext';
import { format } from "timeago.js";
import { Link } from "wouter";
import likeImg from '../../assets/like.png';
import profileImg from '../../assets/profile-pic.jpg';
import Comments from '../comments/Comments'


export default function Post({ post, reloadPostLikesCount }) {
  const EMPTY_IMAGE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const { walletAddress } = useAppContext();
  const [loadImgError, setLoadImgError] = useState(false);
  const [loadVideoError, setLoadVideoError] = useState(false);

  const toggleShowComments = () => {
    setShowComments(!showComments);
  }


  const addLikeToPost = async () => {
    try {
      await window.point.contract.send({contract: 'PointSocial', method: 'addLikeToPost', params: [post.id]});
      reloadPostLikesCount(post.id);
    } catch (e) {
      console.error('Error updating likes: ', e.message);
    }
  };

  const onImgErrorHandler = (e) => {
    setLoadImgError(true);
  }

  const onVideoErrorHandler = (e) => {
    setLoadVideoError(true);
  }

  let mediaTag;
  if (!loadImgError){
    mediaTag = <img className="postImage" src={`/_storage/${post.image}`} onError={onImgErrorHandler}></img>;
  }else{
    if(!loadVideoError){
      mediaTag = <video className="postImage" controls><source src={`/_storage/${post.image}`} onError={onVideoErrorHandler}></source></video>;
    }else{
      mediaTag = '';
    }
  }
  
  return (
    <div className="post">
      <div className="postWrapper">
        <div className="postTop">
          <div className="postTopLeft">
            <Link to={`/profile/${walletAddress}`}>
                <img
                    src={profileImg}
                    alt=""
                    className="topbarImg"
                />
            </Link>
            {walletAddress == post.from ? <span className="posted-id">You posted</span> : <span className="postUsername">{post.identity}</span>}
          </div>
          <div className="postTopRight">
            <span className="postDate">{format(post.createdAt)}</span>
          </div>
        </div>
        <div className="postCenter">
          {post.image != EMPTY_IMAGE && mediaTag }
          <span className="postText">{post?.contents}</span>
        </div>
        <div className="postBottom">
          <div className="postBottomLeft">
            <img
              className="likeIcon"
              src={likeImg}
              onClick={addLikeToPost}
              alt=""
            />
            <span className="postLikeCounter">{post.likesCount} people like it</span>
          </div>
          <div className="postBottomRight">
            <span className="postCommentText" onClick={toggleShowComments}>{commentsCount} comments</span>
          </div>
        </div>
        <div className="comments">
          {showComments && <Comments postId={post.id} commentsCount={commentsCount} setCommentsCount={setCommentsCount} />}
        </div>
      </div>
    </div>
  );
}
