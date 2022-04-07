import './comments.css'
import { format } from "timeago.js";
import { useAppContext } from '../../context/AppContext';

const Comment = ({ comment }) => {
    const { walletAddress } = useAppContext();

    return (
        <div className="comment">
            {walletAddress === comment.from ? <span className="commentFrom">You commented: </span> : <span className="commentUsername">{comment.identity} commented</span>}
            <span className="commentDate">{`(${format(comment.createdAt)})`}</span>
            <span>{comment.contents}</span>
        </div>
    )
}

export default Comment