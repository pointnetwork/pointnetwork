import "./rightbar.css";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import avatar from '../../assets/noAvatar.png';

export default function Rightbar() {
  const [friends, setFriends] = useState([]);
  const [followed, setFollowed] = useState(); // TODO Set from node

  useEffect(() => {
    const getFriends = async () => {
      try {
        const friends = ['0xC01011611e35', '0xf990AB98B232'] // TODO fetch from node
        setFriends(friends);
      } catch (err) {
        console.log(err);
      }
    };
    getFriends();
  }, []);

  const handleClick = async () => {
    try {
      if (followed) {
        // TODO unfollow identitiy via call to contract
        console.log('Unfollowing');
      } else {
        // TODO follow identitiy via call to contract
        console.log('Following');
      }
      setFollowed(!followed);
    } catch (err) {
    }
  };

  const ProfileRightbar = () => {
    return (
      <>
        <h4 className="rightbarTitle">User friends</h4>
        <div className="rightbarFollowings">
          {friends.map((friend) => (
            <Link
              to={"/profile/" + friend}
              style={{ textDecoration: "none" }}
            >
              <div className="rightbarFollowing">
                <img
                  src={avatar}
                  alt="A friend"
                  className="rightbarFollowingImg"
                />
                <span className="rightbarFollowingName">{friend}</span>
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
