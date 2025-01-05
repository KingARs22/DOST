const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PORT = 5000
const User = require('./models/users')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const app = express()
app.use(express.json())
app.use(cors())
app.listen(PORT,()=>{
    console.log('Server is running')
})
app.get('/',(req,res)=>{
    res.send('Welcome to the API')
})
mongoose.connect("mongodb+srv://akshatrangari2004:pYWqVCzsZEL5jHlf@cluster0.hbdon.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
.then(()=>console.log('Connected to MongoDB'))
.catch(err => console.error('Error:',err))

const SECRET_KEY = 'hello';
app.use(bodyParser.json());

app.post('/signup', async (req, res) => {
    try {
      const { name,email, password } = req.body;
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const newUser = new User({ name,email, password: hashedPassword });
      await newUser.save();
  
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error registering user', error });
    }
});


app.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
  
      // Generate JWT
      const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });
  
      res.status(200).json({ message: 'Success', token });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in', error });
    }
});

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });
  
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid token' });
      req.user = user;
      next();
    });
};

app.get('/friends', authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select('friends');
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      res.status(200).json({ friends: user.friends });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching friends list', error });
    }
});

app.get('/users', authenticateToken, async (req, res) => {
    try {
      const users = await User.find({ _id: { $ne: req.user.userId } }); // Exclude the current user
      const currentUser = await User.findById(req.user.userId);
      res.status(200).json({ users, friends: currentUser.friends });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error });
    }
});

app.get('/user/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user by ID and select only the name and email fields
    const user = await User.findById(userId).select('name email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details', error });
  }
});

// Apply authenticateToken middleware to protect the routes
app.post('/send-friend-request', authenticateToken, async (req, res) => {
  try {
      const { friendId } = req.body; // friendId of the user to whom the request is sent
      const senderId = req.user.userId; // The current logged-in user who is sending the request

      // Find the sender and recipient users
      const sender = await User.findById(senderId);
      const recipient = await User.findById(friendId);

      if (!recipient) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Check if the sender is already a friend
      if (recipient.friends.some(friend => friend.userId.toString() === senderId)) {
          return res.status(400).json({ message: 'You are already friends with this user' });
      }

      // Check if a friend request has already been sent
      if (recipient.friendRequests.some(request => request.userId.toString() === senderId || request.userId.toString() === friendId)) {
          return res.status(400).json({ message: 'Friend request already sent' });
      }

      // Add friend request to the recipient's friendRequests array
      recipient.friendRequests.push({ userId: senderId });
      await recipient.save();

      res.status(200).json({ message: 'Friend request sent successfully' });
  } catch (error) {
      res.status(500).json({ message: 'Error sending friend request', error });
  }
});

app.get('/mutual-friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find the logged-in user and populate their friends list
    const user = await User.findById(userId).populate({
      path: 'friends.userId',
      select: '_id' // Ensure only the userId is returned for friends
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Initialize the array to store the potential friends (friends of friends, but not the logged-in user's friends)
    const potentialFriends = [];

    // Iterate over each of the logged-in user's friends
    for (const friend of user.friends) {
      const friendUser = await User.findById(friend.userId).populate({
        path: 'friends.userId',
        select: '_id' // Ensure only the userId is returned for friends
      });

      // Ensure friendUser exists before accessing their friends
      if (friendUser) {
        friendUser.friends.forEach((f) => {
          // Check if the logged-in user is not friends with this person
          if (!user.friends.some((uf) => uf.userId.toString() === f.userId.toString()) && f.userId.toString() !== userId) {
            // Add this friend to the potentialFriends array if not already added
            if (!potentialFriends.some((pf) => pf.userId.toString() === f.userId.toString())) {
              potentialFriends.push(f);
            }
          }
        });
      }
    }

    // If no potential friends found, return a message
    if (potentialFriends.length === 0) {
      return res.status(200).json({ message: 'No mutual friends found' });
    }

    res.status(200).json({ potentialFriends });
  } catch (error) {
    console.error('Error fetching potential friends:', error); // Log the error for debugging
    res.status(500).json({ message: 'Error fetching potential friends', error });
  }
});



app.post('/reject-friend-request', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body; // userId of the sender of the friend request
    const receiverId = req.user.userId; // The logged-in user who is rejecting the request

    // Find the receiver (the logged-in user)
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Find the sender (the user who sent the friend request)
    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Check if the request exists in the receiver's pending requests
    const requestIndex = receiver.friendRequests.findIndex(request => request.userId.toString() === userId);
    if (requestIndex === -1) {
      return res.status(400).json({ message: 'Friend request not found' });
    }

    // Remove the friend request from the receiver's pendingRequests array
    receiver.friendRequests.splice(requestIndex, 1);

    // Save the updated receiver document
    await receiver.save();

    // Optionally, remove the request from the sender's outgoingRequests array (if you maintain that)
    const senderIndex = sender.outgoingRequests.findIndex(request => request.userId.toString() === receiverId);
    if (senderIndex !== -1) {
      sender.outgoingRequests.splice(senderIndex, 1);
      await sender.save();
    }

    res.status(200).json({ message: 'Friend request rejected successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting friend request', error });
  }
});



  
  // Route to accept a friend request
app.post('/accept-friend-request', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body; // FriendId is the user who sent the request
    const userId = req.user.userId; // The logged-in user's ID from the token

    // Find the recipient (logged-in user) and the sender (friend)
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the request exists
    const requestIndex = user.friendRequests.findIndex(
      (req) => req.userId.toString() === friendId
    );

    if (requestIndex === -1) {
      return res.status(400).json({ message: 'Friend request not found' });
    }

    // Remove the friend request from the recipient's list
    user.friendRequests.splice(requestIndex, 1);

    // Add the user to each other's friends list
    user.friends.push({ userId: friendId, name: friend.name, email: friend.email });
    friend.friends.push({ userId: userId, name: user.name, email: user.email });

    // Save the changes to the database
    await user.save();
    await friend.save();

    // Send a response indicating success
    res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Error processing the request', error });
  }
});


  app.get('/pending-friend-requests', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId; // The logged-in user's ID from the token
  
      // Find the user by ID
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Get the list of pending friend requests (users who sent requests)
      const pendingRequests = await User.find({
        '_id': { $in: user.friendRequests.map((request) => request.userId) },
      }).select('name email'); // You can select more fields as needed
  
      // Return the pending requests to the frontend
      res.status(200).json({ pendingRequests });
    } catch (error) {
      console.error('Error fetching pending friend requests:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  });