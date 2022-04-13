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
        const community = ['Alice', 'Bob', 'Claire'] // TODO fetch real identities from Identity contract
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
        <h4 className="rightbarTitle">Community (comming soon...)</h4>
        <div className="rightbarFollowings">
          {community.map((identity) => (
            <Link
              key={identity}
              to={"#"}
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
    <div className="rightbar ml-10 p-10 ">
      {/* <div className="rightbarWrapper">
        <ProfileRightbar />
      </div> */}
    </div>
  );
}
