import "./post.css";
import { MoreVert } from "@material-ui/icons";
import { useEffect, useState } from "react";
import { useAppContext } from '../../context/AppContext';
import { format } from "timeago.js";
import { Link } from "wouter";
import likeImg from '../../assets/like.png';
import profileImg from '../../assets/profile-pic.jpg';
import postImg from '../../assets/post-pic.jpg';

export default function Post({ post }) {
  const [like, setLike] = useState(2);
  const [isLiked, setIsLiked] = useState(false);
//   const [user, setUser] = useState({});
//   const PF = process.env.REACT_APP_PUBLIC_FOLDER;
//   const { user: currentUser } = useContext(AuthContext);
    const { walletAddress } = useAppContext();

//   useEffect(() => {
//     setIsLiked(post.likes.includes(currentUser._id));
//   }, [currentUser._id, post.likes]);

  // TODO get idenity from address here
  useEffect(() => {
    console.log('fetching identity: ', post.from)
  }, [post.from]);


    // TODO wire this to a send invoke via POINTSDK
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
            <span className="postUsername">{walletAddress}</span>
            <span className="postDate">{format(post.timestamp)}</span>
          </div>
          <div className="postTopRight">
            <MoreVert />
          </div>
        </div>
        <div className="postCenter">
          <span className="postText">{post?.contents}</span>
          <img className="postImg" src={postImg} alt="" />
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
            <span className="postCommentText">{post.id} comments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
