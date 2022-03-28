import "./topbar.css";
import { useAppContext } from '../../context/AppContext';
import { Link } from "wouter";
import profileImg from '../../assets/profile-pic.jpg';
import pointlogo from '../../assets/pointlogowhite.png';

export default function Topbar() {
  const { walletAddress } = useAppContext()
  return (
    <div className="topbarContainer">
      <div className="topbarLeft flex v-center">
        <img
          src={pointlogo}
          alt=""
          className="topbarImg" />
          <Link to="/" style={{ textDecoration: "none" }}>
            <span className="logo">Point Social</span>
          </Link>
      </div>
      <div className="topbarCenter">
      </div>
      <div className="topbarRight">
        <div className="topbarLinks">
        </div>
        <div className="topbarIcons">
          <div>
          </div>
        </div>
        <Link to={`/profile/${walletAddress}`}>
          <img
            src={profileImg}
            alt=""
            className="topbarImg"
          />
        </Link>
      </div>
    </div>
  );
}
