import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';
import { Request } from '../models/request.js';
import { Post } from '../models/post.js';
const app = express();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

export const addUser = async (req, res) => {
    try {
        const { username, mobileNumber, email, password, address } = req.body;
        
        if (!username || !mobileNumber || !email || !password || !address) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const existingUser_byEmail = await User.findOne({ email });
        if (existingUser_byEmail) {
            return res.status(400).json({ message: 'User-Email already exists' });
        }


        const newUser = new User({
            username,
            mobileNumber,
            email,  
            password,
            address
        });

        await newUser.save();

        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUser = async (req, res) => {
    const { userId } = req.params; // Get userId from the URL parameters
    const { address } = req.body; // Address is expected in the request body

    try {
        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update address if provided
        if (address) {
            const { coordinates } = address;
            if (coordinates && coordinates.length === 2) {
                user.address = {
                    ...user.address,
                    ...address,
                    coordinates: {
                        type: 'Point',
                        coordinates: [coordinates[0], coordinates[1]] // Ensure coordinates are in the correct order
                    }
                };
            }
        }

        await user.save(); // Save the updated user
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};


export const getUserHomePage = async (req, res) => {
    try {
        const token = req.cookies.user_jwt;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const decodedToken = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
        
        const username = decodedToken.username;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }


        // Fetch requests for the specific user
        const requests = await Request.find({ userUsername: username }).sort({ timestamp: 1 });

        // Create a Map to maintain unique donor usernames and their first request timestamps
        const donorMap = new Map();

        requests.forEach(req => {
            if (!donorMap.has(req.donorUsername)) {
                donorMap.set(req.donorUsername, req.timestamp);
            }
        });

        // Convert the Map to an array of unique donor usernames, sorted by their first request timestamp
        const donorList = Array.from(donorMap.entries())
            .sort((a, b) => new Date(b[1]) - new Date(a[1])) // Sort by timestamp
            .map(([donorUsername]) => donorUsername); // Extract the usernames

        res.render('user_homepage', { user, donorList });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: 'Server error' });
    }
}


export const sendRequest = async (req, res) => {
    try {
        const token = req.cookies.user_jwt;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const decodedToken = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });

        const username = decodedToken.username;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { post_id } = req.body;
        const post = await Post.findById(post_id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const requestData = {
            donorUsername: post.donorUsername,
            userUsername: username,
            location: post.location,
            availableFood: post.availableFood,
            post_id: post._id
        };

        const url = process.env.URL; 
        const response = await axios.post(`${url}/request/addRequest`, requestData);
        res.status(response.status).json({ message: 'Request sent successfully', request: response.data });

    } catch (error) {
        console.error('Error in sendRequest:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};
