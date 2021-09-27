import "./share.css";
import {
  Label,
  Room,
  EmojiEmotions,
} from "@material-ui/icons";
import { useRef, useState } from "react";
import profileImg from '../../assets/profile-pic.jpg';
import { useAppContext } from '../../context/AppContext';

export default function Share() {
  const contents = useRef();
  const [selectedFile, updateSelectedFile] = useState();

  const { walletAddress } = useAppContext();

  onFileChange = event => {
    updateSelectedFile(event.target.files[0]);
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    const newPost = {
        contents: contents.current.value,
    };

    try {
        // Save the post content to the storage layer and keep the storage id
        let {data: storageId} = await window.point.storage.putString({data: newPost.contents});
        // TODO: Only upload file if there is a file selected!
        // TODO: Handle errors
        const formData = new FormData()
        formData.append("postfile", selectedFile);
        const res = await window.point.storage.postFile(formData);
        const imageId = res.data;
        // Save the post contents storage id in the PoinSocial Smart Contract
        await window.point.contract.send({contract: 'PointSocial', method: 'addPost', params: [storageId, imageId]});
        window.location.reload()
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
          <input
            type="file"
            name="fileupload"
            onChange={onFileChange}
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
