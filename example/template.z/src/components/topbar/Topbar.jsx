import "./topbar.css";
import { useAppContext } from '../../context/AppContext';
import { Link } from "wouter";
import pointlogo from '../../assets/pointlogowhite.png';
import profileImg from '../../assets/noAvatar.png';

export default function Topbar() {
  const { walletAddress } = useAppContext()
  return (
    <div className="topbarContainer">
      <div className="topbarLeft">
        <img
          src={pointlogo}
          alt=""
          className="topbarImg" />
          <Link to="/" style={{ textDecoration: "none" }}>
            <span className="logo">Template App</span>
          </Link>
      </div>
      <div className="topbarCenter">
        <span>Wallet Address: {walletAddress}</span>
      </div>
      <div className="topbarRight">
        <div className="topbarLinks">
        </div>
        <div className="topbarIcons">
          <div>
          </div>
        </div>
          <img
            src={profileImg}
            alt=""
            className="topbarImg"
          />
      </div>
    </div>
  );
}
