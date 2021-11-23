import "./comments.css";
import { useState, useEffect } from "react";
import { useAppContext } from '../../context/AppContext';
import Comment from './Comment'
import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';

const Comments = ({ postId }) => {
    const { csrfToken } = useAppContext()
    const DEFAULT_BTN_LABEL = 'Comment'
    const [comments, setComments] = useState([])
    const [contents, setContents] = useState()
    const [btnLabel, setBtnLabel] = useState(DEFAULT_BTN_LABEL);
    const [btnEnabled, setBtnEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    onContentsChange = event => {
      let newContents = event.target.value;
      setContents(newContents)
      setBtnEnabled(newContents && newContents.length > 0)
    }

    setSaving = (saving) => {
      setBtnEnabled(!saving);
      saving ? setBtnLabel('Saving...') : setBtnLabel(DEFAULT_BTN_LABEL);
    }

    const getComments = async () => {
      setLoading(true);
      const comments = await fetchComments()
      setComments(comments);
      setLoading(false);
    }

    useEffect(() => {
        getComments()
    }, [postId])

    const fetchComments = async () => {
        const response = await window.point.contract.call({contract: 'PointSocial', method: 'getAllCommentsForPost', params: [postId], csrfToken});

        const comments = response.data.map(([id, from, contents, createdAt]) => (
            {id, from, contents, createdAt: createdAt*1000}
          )
        )

        const commentsContent = await Promise.all(comments.map(async (comment) => {
          const {data: contents} = await window.point.storage.getString({ id: comment.contents, encoding: 'utf-8' });
          comment.contents = contents;
          return comment;
        }))

        return commentsContent;
    }

    const submitHandler = async (e) => {
      e.preventDefault();
      setSaving(true);

      try {
          // Save the post content to the storage layer and keep the storage id
          let {data: storageId} = await window.point.storage.putString({data: contents, csrfToken});
          // Save the post contents storage id in the PoinSocial Smart Contract
          await window.point.contract.send({contract: 'PointSocial', method: 'addCommentToPost', params: [postId, storageId], csrfToken});
          setSaving(false);
          setContents('');
          await getComments();
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
        {loading && <Box sx={{ display: 'flex' }}>
          <CircularProgress />
        </Box>}
        {(!loading && comments.length == 0) && 'No comments yet. Be the first!'}
        {comments.map((comment) => (
          <Comment key={comment.id} comment={comment} />
        ))}
      </div>
    )
}

export default Comments
