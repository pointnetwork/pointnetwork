import "./share.css";
import { AttachFileTwoTone } from "@material-ui/icons";
import { useState } from "react";
import profileImg from '../../assets/profile-pic.jpg';
import { useAppContext } from '../../context/AppContext';

export default function Share() {
  const DEFAULT_BTN_LABEL = 'Share'
  const EMPTY_IMAGE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const [selectedFile, setSelectedFile] = useState();
  const [contents, setContents] = useState();
  const [btnLabel, setBtnLabel] = useState(DEFAULT_BTN_LABEL);
  const [btnEnabled, setBtnEnabled] = useState(false);
  const { walletAddress } = useAppContext();

  onFileChange = event => {
    setSelectedFile(event.target.files[0]);
  };

  onContentsChange = event => {
    let newContents = event.target.value;
    setContents(newContents)
    setBtnEnabled(newContents && newContents.length > 0)
  }

  setSaving = (saving) => {
    setBtnEnabled(!saving);
    saving ? setBtnLabel('Saving...') : setBtnLabel(DEFAULT_BTN_LABEL);
  }

  const submitHandler = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Save the post content to the storage layer and keep the storage id
      let {data: storageId} = await window.point.storage.putString({data: contents});
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
    } catch (err) {
      console.error('Error: ', err);
      setSaving(false);
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
            id="contents"
            name="contents"
            placeholder={"What's in your mind " + walletAddress + "?"}
            className="shareInput"
            value={contents}
            onChange={onContentsChange}
          />
        </div>
        <hr className="shareHr" />
        <form className="shareBottom" onSubmit={submitHandler}>
          <div className="shareOptions">
            <div className="shareOption">
              <AttachFileTwoTone htmlColor="grey" />
              <input
                type="file"
                name="fileupload"
                onChange={onFileChange}
              />
            </div>
          </div>
          <button className="shareButton" type="submit" disabled={!btnEnabled}>
            {btnLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
