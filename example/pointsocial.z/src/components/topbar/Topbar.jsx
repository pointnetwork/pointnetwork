import "./topbar.css";
import { Search, Person, Chat, Notifications } from "@material-ui/icons";
import { useAppContext } from '../../context/AppContext';
import { Link } from "wouter";
import profileImg from '../../assets/profile-pic.jpg';

export default function Topbar() {
  const { walletAddress } = useAppContext()
  return (
    <div className="topbarContainer">
      <div className="topbarLeft">
        <Link to="/" style={{ textDecoration: "none" }}>
          <span className="logo">Point Social</span>
        </Link>
      </div>
      <div className="topbarCenter">
        <div className="searchbar">
          <Search className="searchIcon" />
          <input
            placeholder="Search for friend, post or video"
            className="searchInput"
          />
        </div>
      </div>
      <div className="topbarRight">
        <div className="topbarLinks">
          <span className="topbarLink">Homepage</span>
          <span className="topbarLink">Timeline</span>
        </div>
        <div className="topbarIcons">
          <div className="topbarIconItem">
            <Person />
            <span className="topbarIconBadge">1</span>
          </div>
          <div className="topbarIconItem">
            <Chat />
            <span className="topbarIconBadge">2</span>
          </div>
          <div className="topbarIconItem">
            <Notifications />
            <span className="topbarIconBadge">1</span>
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
