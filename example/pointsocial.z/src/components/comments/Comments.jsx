import "./comments.css";
import { useState, useEffect, useRef } from "react";
import Comment from './Comment'

const Comments = ({ postId }) => {
    const [comments, setComments] = useState([])
    const contents = useRef();

    useEffect(() => {
        const getComments = async () => {
          const comments = await fetchComments()
          setComments(comments);
        }

        getComments()
    }, [postId])

    const fetchComments = async () => {
        const response = await window.point.contract.call({contract: 'PointSocial', method: 'getAllCommentsForPost', params: [postId]});

        for(let i=0; i<response.data.length; i++) {
            const content = await window.point.storage.getString({ id: response.data[i][2], encoding: 'utf-8' });
            response.data[i][2] = content.data;
        }

        return response.data.map(( [id, from, contents]) => ({id, from, contents}))
    }

    const submitHandler = async (e) => {
      e.preventDefault();
      const newComment = {
          contents: contents.current.value,
      };

      try {
          if(newComment.contents) {
            // Save the post content to the storage layer and keep the storage id
            let {data: storageId} = await window.point.storage.putString({data: newComment.contents});
            // Save the post contents storage id in the PoinSocial Smart Contract
            await window.point.contract.send({contract: 'PointSocial', method: 'addCommentToPost', params: [postId, storageId]});
            // TODO: Avoid using reload
            window.location.reload()
          } else {
            // TODO: Avoid using alert
            alert('Please add some text content to your comment!')
          }
      } catch (err) {
        console.error('Error: ', err);
      }
    };

    return (
      <div className="commentWrapper">
        <form className="commentBottom" onSubmit={submitHandler}>
          <input
              placeholder={"Any comment?"}
              className="commentCorners"
              ref={contents}
            />
          <button className="commentButton" type="submit">
            Comment
          </button>
        </form>
        <hr className="commentHr" />
        {comments.map((comment) => (
          <Comment comment={comment} />
        ))}
      </div>
    )
}

export default Comments
