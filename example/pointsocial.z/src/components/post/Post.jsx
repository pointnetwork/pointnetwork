import "./post.css";
import { useState } from "react";
import { useAppContext } from '../../context/AppContext';
import { format } from "timeago.js";
import { Link } from "wouter";
import likeImg from '../../assets/like.png';
import profileImg from '../../assets/profile-pic.jpg';
import Comments from '../comments/Comments'

export default function Post({ post }) {
  const EMPTY_IMAGE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const [showComments, setShowComments] = useState(false);
  const { walletAddress } = useAppContext();

  const toggleShowComments = () => {
    setShowComments(!showComments);
  }

  const updatePostLikes = async () => {
    try {
      await window.point.contract.send({contract: 'PointSocial', method: 'addLikeToPost', params: [post.id]});
      // TODO: Avoid using reload
      window.location = '/';
    } catch (e) {
      console.error('Error updating likes: ', e.message);
    }
  };

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
            {walletAddress == post.from ? <span className="posted-id">You posted</span> : <span className="postUsername">{post.from}</span>}
          </div>
          <div className="postTopRight">
            <span className="postDate">{format(post.timestamp)}</span>
          </div>
        </div>
        <div className="postCenter">
          {post.image != EMPTY_IMAGE && <img className="postImage" src={`/_storage/${post.image}`}></img>}
          <span className="postText">{post?.contents}</span>
        </div>
        <div className="postBottom">
          <div className="postBottomLeft">
            <img
              className="likeIcon"
              src={likeImg}
              onClick={updatePostLikes}
              alt=""
            />
            <span className="postLikeCounter">{post.likesCount} people like it</span>
          </div>
          <div className="postBottomRight">
            <span className="postCommentText" onClick={toggleShowComments}>{post.commentsCount} comments</span>
          </div>
        </div>
        <div className="comments">
          {showComments && <Comments postId={post.id} />}
        </div>
      </div>
    </div>
  );
}
