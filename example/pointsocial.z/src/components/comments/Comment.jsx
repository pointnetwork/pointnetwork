import './comments.css'
import { format } from "timeago.js";

const Comment = ({ comment }) => {
    const trimFrom = (from) => {
        return `${from.slice(0,10)}...`;
    }

    return (
        <div className="comment">
            <span className="commentFrom">{trimFrom(comment.from)}</span>
            <span className="commentDate">{`(${format(comment.timestamp)})`}</span>
            <span>{comment.contents}</span>
        </div>
    )
}

export default Comment