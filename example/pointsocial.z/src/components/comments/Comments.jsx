import { useState, useEffect } from "react";

const Comments = ({ postId }) => {
    const [comments, setComments] = useState([])

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
    return (
        <div className='comments'>
          {comments.map((comment) => (
            comment.contents
          ))}
        </div>
    )
}

export default Comments
