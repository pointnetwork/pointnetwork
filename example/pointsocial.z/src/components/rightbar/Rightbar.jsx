import "./rightbar.css";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import avatar from '../../assets/noAvatar.png';
import { trimAccount } from '../../utils';

export default function Rightbar() {
  const [community, setCommunity] = useState([]);

  useEffect(() => {
    const getCommunity = async () => {
      try {
        const community = ['0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301', '0xf990AB98B33dd48dffaC735C572D6cd8f75E60d8', '0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB'] // TODO fetch from node
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
                <span className="rightbarFollowingName">{trimAccount(identity)}</span>
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
