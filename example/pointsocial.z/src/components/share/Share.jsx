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
        // contents: "0x00000000000000000000004920616d206472696e6b696e6720636f666665652e",
        contents: contents.current.value,
    };

    try {
        // TODO use point SDK to create a new post
        await window.point.contract.send({contract: 'PointSocial', method: 'addStatus', params: [newPost.contents], storage: [0]})
        console.log('newPost.contents', newPost.contents)
    } catch (err) {}
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
