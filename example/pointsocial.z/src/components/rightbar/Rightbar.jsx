import "./rightbar.css";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import avatar from '../../assets/noAvatar.png';

export default function Rightbar() {
  const [community, setCommunity] = useState([]);

  useEffect(() => {
    const getCommunity = async () => {
      try {
        const community = ['0xC01011611e35', '0xf990AB98B232'] // TODO fetch from node
        setCommunity(community);
      } catch (err) {
        console.log(err);
      }
    };
    getCommunity();
  }, []);


  const ProfileRightbar = () => {
    return (
      <>
        <h4 className="rightbarTitle">Community</h4>
        <div className="rightbarFollowings">
          {community.map((identity) => (
            <Link
              key={identity}
              to={"/profile/" + identity}
              style={{ textDecoration: "none" }}
            >
              <div className="rightbarFollowing">
                <img
                  src={avatar}
                  className="rightbarFollowingImg"
                />
                <br /><br />
                <span className="rightbarFollowingName">{identity}</span>
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  };
  return (
    <div className="rightbar">
      <div className="rightbarWrapper">
        <ProfileRightbar />
      </div>
    </div>
  );
}
