import './comments.css'
import { format } from "timeago.js";
import { trimAccount } from '../../utils';

const Comment = ({ comment }) => {
    return (
        <div className="comment">
            <span className="commentFrom">{trimAccount(comment.from)}</span>
            <span className="commentDate">{`(${format(comment.timestamp)})`}</span>
            <span>{comment.contents}</span>
        </div>
    )
}

export default Comment