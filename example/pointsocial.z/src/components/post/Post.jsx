import "./post.css";
import { MoreVert } from "@material-ui/icons";
import { useState } from "react";
import { useAppContext } from '../../context/AppContext';
import { format } from "timeago.js";
import { Link } from "wouter";
import likeImg from '../../assets/like.png';
import profileImg from '../../assets/profile-pic.jpg';
import Comments from '../comments/Comments'

export default function Post({ post }) {
  const EMPTY_IMAGE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const [like, setLike] = useState(2);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { walletAddress } = useAppContext();

  const toggleShowComments = () => {
    setShowComments(!showComments);
  }

  // TODO wire this to update the post like count in the smart contract
  const likeHandler = () => {
    try {
      console.log('likeHander ***')
    } catch (err) {}
    setLike(isLiked ? like - 1 : like + 1);
    setIsLiked(!isLiked);
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
            <span className="postUsername">{post.from}</span>

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
              onClick={likeHandler}
              alt=""
            />
            <span className="postLikeCounter">{like} people like it</span>
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
