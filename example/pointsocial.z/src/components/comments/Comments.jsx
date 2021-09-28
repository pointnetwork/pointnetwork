import "./comments.css";
import { useState, useEffect, useRef } from "react";
import Comment from './Comment'

const Comments = ({ postId }) => {
    const DEFAULT_BTN_LABEL = 'Comment'
    const [comments, setComments] = useState([])
    const [contents, setContents] = useState()
    const [btnLabel, setBtnLabel] = useState(DEFAULT_BTN_LABEL);
    const [btnEnabled, setBtnEnabled] = useState(false);

    onContentsChange = event => {
      let newContents = event.target.value;
      setContents(newContents)
      setBtnEnabled(newContents && newContents.length > 0)
    }

    setSaving = (saving) => {
      setBtnEnabled(!saving);
      saving ? setBtnLabel('Saving...') : setBtnLabel(DEFAULT_BTN_LABEL);
    }

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
      setSaving(true);

      try {
          // Save the post content to the storage layer and keep the storage id
          let {data: storageId} = await window.point.storage.putString({data: contents});
          // Save the post contents storage id in the PoinSocial Smart Contract
          await window.point.contract.send({contract: 'PointSocial', method: 'addCommentToPost', params: [postId, storageId]});
          // TODO: Avoid using reload
          window.location.reload()
      } catch (err) {
        setSaving(false);
        console.error('Error: ', err);
      }
    };

    return (
      <div className="commentWrapper">
        <form className="commentBottom" onSubmit={submitHandler}>
          <input
              id="contents"
              name="contents"
              placeholder={"Any comment?"}
              className="commentCorners"
              onChange={onContentsChange}
              value={contents}
            />
          <button className="commentButton" type="submit" disabled={!btnEnabled}>
            {btnLabel}
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
