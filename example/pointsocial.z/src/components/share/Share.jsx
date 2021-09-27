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
  const EMPTY_IMAGE = '0x0000000000000000000000000000000000000000000000000000000000000000';
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
      if(newPost.contents) {
        // Save the post content to the storage layer and keep the storage id
        let {data: storageId} = await window.point.storage.putString({data: newPost.contents});
        let imageId = EMPTY_IMAGE;
        if(selectedFile){
          const formData = new FormData()
          formData.append("postfile", selectedFile);
          const res = await window.point.storage.postFile(formData);
          imageId = res.data;
        }
        // Save the post contents storage id in the PoinSocial Smart Contract
        await window.point.contract.send({contract: 'PointSocial', method: 'addPost', params: [storageId, imageId]});
        // TODO: Avoid using reloads
        window.location.reload()
      } else {
        // TODO: Avoid using alert
        alert('Please add some text content to your post!')
      }
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
            <div>
              <input
              type="file"
              name="fileupload"
              onChange={onFileChange}
              />
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
