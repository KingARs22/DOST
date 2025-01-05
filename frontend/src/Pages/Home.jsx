import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CSS/Home.css';
import { useNavigate} from 'react-router-dom'; 


const Home = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friendDetails, setFriendDetails] = useState({});
  const [mutualFriends, setMutualFriends] = useState([]); // Store mutual friends
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) {
          alert('Unauthorized. Please log in.');
          return;
        }

        // Fetch all users, friend requests, and mutual friends
        const usersResponse = await axios.get('http://localhost:5000/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const requestsResponse = await axios.get('http://localhost:5000/pending-friend-requests', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const mutualFriendsResponse = await axios.get('http://localhost:5000/mutual-friends', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('Mutual Friends Response:', mutualFriendsResponse.data);
        const fetchedUsers = usersResponse.data.users || [];
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers); // Initialize filtered users with all users
        setFriends(usersResponse.data.friends || []);
        setFriendRequests(requestsResponse.data.pendingRequests || []);
        
        // Fetch details of mutual friends
        const mutualFriendsIds = mutualFriendsResponse.data.potentialFriends.map(friend => friend.userId);
        const mutualFriendsDetailsPromises = mutualFriendsIds.map(id =>
          axios.get(`http://localhost:5000/user/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        );
        
        const mutualFriendsDetails = await Promise.all(mutualFriendsDetailsPromises);
        console.log('mutualFriendsDetails:',mutualFriendsDetails)
        const mutualFriendsWithDetails = mutualFriendsDetails.map((res, index) => ({
          userId: mutualFriendsIds[index],  // Adding userId to each mutual friend
          name: res.data.name,   // Assuming name is in `name` field
          email: res.data.email, // Assuming email is in `email` field
          // Add any other fields you need
        }));
        setMutualFriends(mutualFriendsWithDetails);
        console.log('mutual with userid:', mutualFriendsWithDetails)


        // Fetch details of all friends
        const friendDetailsPromises = usersResponse.data.friends.map((friend) =>
          axios.get(`http://localhost:5000/user/${friend.userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        );
        const friendDetailsResults = await Promise.all(friendDetailsPromises);
        setFriendDetails(friendDetailsResults);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSearchChange = (event) => {
    const value = event.target.value.toLowerCase();
    setSearchTerm(value);
    const filtered = users.filter((user) =>
      user.name.toLowerCase().includes(value)
    );
    setFilteredUsers(filtered);
  };

  const handleAcceptFriendRequest = async (friendId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        alert('Unauthorized. Please log in.');
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/accept-friend-request',
        { friendId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message);
      setFriendRequests((prev) => prev.filter((request) => request.userId !== friendId));
      setFriends((prev) => [...prev, { _id: friendId }]);
      window.location.reload();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (userId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        alert('Unauthorized. Please log in.');
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/reject-friend-request',
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message);
      setFriendRequests(friendRequests.filter((request) => request._id !== userId));
      window.location.reload();
    } catch (error) {
      
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        alert('Unauthorized. Please log in.');
        return;
      }
      console.log(userId)
      const response = await axios.post(
        'http://localhost:5000/send-friend-request',
        { friendId: userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message);
      window.location.reload();
    } catch (error) {
      alert(error.response.data.message);
      console.error('Error sending friend request:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');  // Remove the token from localStorage
    navigate('/login'); // Redirect to the login page
  };  

  if (loading) return <div>Loading...</div>;

  return (
    <div className="homepage-container">
      <button onClick={handleLogout} className="logout-btn">Logout</button>
      {/* Left Column: Pending Friend Requests */}
      <div className="column pending-requests">
        <h2>Pending Friend Requests</h2>
        {friendRequests.length > 0 ? (
          <ul>
            {friendRequests.map((request, index) => (
              <li key={index}>
                <h3>{request.name}</h3>
                <p>{request.email}</p>
                <button onClick={() => handleAcceptFriendRequest(request._id)}>Accept</button>
                <button onClick={() => handleRejectRequest(request._id)}>Reject</button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No pending friend requests.</p>
        )}

        {/* Mutual Friends Section */}
        <h2>Mutual Friends</h2>
        {mutualFriends.length > 0 ? (
          <ul>
            {mutualFriends.map((friend, index) => (
              <li key={index}>
                <h3>{friend.name}</h3>
                <p>{friend.email}</p>
                {friends.some((f) => f._id === friend.userId) ? (
                  <button disabled>Already a Friend</button>
                ) : friendRequests.some((request) => request.userId === friend.userId) ? (
                  <button disabled>Request Sent</button>
                ) : (
                  <button onClick={() => handleSendFriendRequest(friend.userId)}>Send Request</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No mutual friends.</p>
        )}
      </div>

      {/* Center Column: All Users */}
      <div className="column all-users">
        <h2>All Users</h2>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-bar"
        />
        {filteredUsers.length > 0 ? (
          <ul>
            {filteredUsers.map((user, index) => (
              <li key={index}>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                {friends.some((friend) => friend._id === user._id) ? (
                  <button disabled>Already a Friend</button>
                ) : friendRequests.some((request) => request.userId === user._id) ? (
                  <button disabled>Request Sent</button>
                ) : (
                  <button onClick={() => handleSendFriendRequest(user._id)}>Send Request</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No users found.</p>
        )}
      </div>

      {/* Right Column: Friends List */}
      <div className="column friends-list">
        <h2>Friends</h2>
        {friends.length > 0 ? (
          <ul>
            {friendDetails.map((friend, index) => (
              <li key={index}>
                <h3>{friend.data.name || 'Loading...'}</h3>
                <p>{friend.data.email}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No friends yet.</p>
        )}
      </div>
    </div>
  );
};

export default Home;
