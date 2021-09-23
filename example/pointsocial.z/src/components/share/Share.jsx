import "./share.css";
import {
  Label,
  Room,
  EmojiEmotions,
} from "@material-ui/icons";
import { useRef } from "react";
import profileImg from '../../assets/profile-pic.jpg';
import { useAppContext } from '../../context/AppContext';

export default function Share() {
  const contents = useRef();

  const { walletAddress } = useAppContext();

  const submitHandler = async (e) => {
    e.preventDefault();
    const newPost = {
        contents: contents.current.value,
    };

    try {
        // Save the post content to the storage layer and keep the storage id
        let {data: storageId} = await window.point.storage.putString({data: newPost.contents});
        // Save the post contents storage id in the PoinSocial Smart Contract
        await window.point.contract.send({contract: 'PointSocial', method: 'addStatus', params: [storageId]});
    } catch (err) {
      console.error('Error: ', err);
    }
  };

  return (
    <div className="share">
      <div className="shareWrapper">
        <div className="shareTop">
          <img
            className="shareProfileImg"
            src={profileImg}
            alt=""
          />
          <input
            placeholder={"What's in your mind " + walletAddress + "?"}
            className="shareInput"
            ref={contents}
          />
        </div>
        <hr className="shareHr" />
        <form className="shareBottom" onSubmit={submitHandler}>
          <div className="shareOptions">
            <div className="shareOption">
              <Label htmlColor="blue" className="shareIcon" />
              <span className="shareOptionText">Tag</span>
            </div>
            <div className="shareOption">
              <Room htmlColor="green" className="shareIcon" />
              <span className="shareOptionText">Location</span>
            </div>
            <div className="shareOption">
              <EmojiEmotions htmlColor="goldenrod" className="shareIcon" />
              <span className="shareOptionText">Feelings</span>
            </div>
          </div>
          <button className="shareButton" type="submit">
            Share
          </button>
        </form>
      </div>
    </div>
  );
}
