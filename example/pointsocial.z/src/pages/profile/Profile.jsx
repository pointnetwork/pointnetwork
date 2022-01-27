import "./profile.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import Feed from "../../components/feed/Feed";
import Rightbar from "../../components/rightbar/Rightbar";
import profilePic from '../../assets/profile-pic.jpg';
import profileCoverImg from '../../assets/header-pic.jpg';
import { useRoute } from "wouter";

const Profile = () => {
  const [match, params] = useRoute("/profile/:account");

  return (
    <>
      <Topbar />
      <div className="profile">
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
                src={profilePic}
                alt=""
              />
            </div>
            <div className="profileInfo">
              <h4 className="profileInfoName">{params.account}</h4>
              <span className="profileInfoDesc">My account.</span>
            </div>
          </div>
          <div className="profileRightBottom">
            <Sidebar />
            <Feed account={params.account} />
            <Rightbar />
          </div>
        </div>
      </div>
    </>
  );
}

export default Profile