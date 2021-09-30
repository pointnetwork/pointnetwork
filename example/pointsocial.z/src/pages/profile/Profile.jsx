import "./profile.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import Feed from "../../components/feed/Feed";
import Rightbar from "../../components/rightbar/Rightbar";
import avatar from '../../assets/noAvatar.png';
import profileCoverImg from '../../assets/header-pic.jpg';
import { useRoute } from "wouter";

export default Profile = () => {
  const [match, params] = useRoute("/profile/:account");

  return (
    <>
      <Topbar />
      <div className="profile">
        <Sidebar />
        <div className="profileRight">
          <div className="profileRightTop">
            <div className="profileCover">
              <img
                className="profileCoverImg"
                src={profileCoverImg}
                alt=""
              />
              <img
                className="profileUserImg"
                src={avatar}
                alt=""
              />
            </div>
            <div className="profileInfo">
              <h4 className="profileInfoName">{params.account}</h4>
              <span className="profileInfoDesc">Someones account.</span>
            </div>
          </div>
          <div className="profileRightBottom">
            <Feed account={params.account} />
            <Rightbar />
          </div>
        </div>
      </div>
    </>
  );
}
