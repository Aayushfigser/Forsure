import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/UserSchema.js";
import Post from "../models/PostSchema.js";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ------------------------
// Register Function
// ------------------------
export const register = async (req, res) => {
  try {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(req.body.password, salt);

    // Removed duplicate check: 
    // const existingUser = await User.findOne({ email: req.body.email });
    // if (existingUser)
    //   return res
    //     .status(StatusCodes.BAD_REQUEST)
    //     .json({ msg: "User already exists." });

    // Removed OTP field from the user creation object
    const newUser = new User({
      ...req.body,
      password: passwordHash,
      viewedProfile: Math.floor(Math.random() * 1000),
      impressions: Math.floor(Math.random() * 1000),
    });

    const savedUser = await newUser.save();
    res.status(StatusCodes.CREATED).json(savedUser);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

// ------------------------
// Login Function
// ------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (!user)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "User does not exist." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Invalid credentials." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    user.password = undefined; // Remove password before sending response
    res.status(StatusCodes.OK).json({ token, user });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

// ------------------------
// Update Function
// ------------------------
export const update = async (req, res) => {
  try {
    const { password, email, profilePhoto } = req.body;
    const user = await User.findOne({ email: email });
    if (!user)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "User does not exist." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Incorrect Password" });

    const { id } = req.params;
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(req.body.password, salt);

    const updatedUser = await User.findOneAndUpdate(
      { _id: id },
      { ...req.body, password: passwordHash },
      { new: true, runValidators: true }
    );

    if (!updatedUser)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "User is not updated!" });

    // Update all posts with the new profilePhoto
    const posts = await Post.find({});
    posts.forEach(async (value) => {
      let newComments = [];
      for (let comment of value.comments) {
        if (comment.userId === id) {
          newComments.push({ ...comment, image: profilePhoto });
        } else {
          newComments.push(comment);
        }
      }
      value.comments = newComments;

      const newId = new mongoose.Types.ObjectId();
      let userProfilePhoto = value.userProfilePhoto;
      if (value.userId === id) userProfilePhoto = profilePhoto;
      const post = {
        firstName: value.firstName,
        lastName: value.lastName,
        _id: newId,
        userId: value.userId,
        likes: value.likes,
        comments: value.comments,
        location: value.location,
        description: value.description,
        postImage: value.postImage,
        userProfilePhoto: userProfilePhoto,
      };
      await Post.findByIdAndDelete({ _id: value.id });
      const newPost = new Post(post);
      await newPost.save();
    });

    const updatedPosts = await Post.find({}).sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ updatedUser, updatedPosts });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

// ------------------------
// Update Password Function
// ------------------------
export const updatePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(newPassword, salt);

    let user = await User.findOne({ email: email });
    user.password = passwordHash;
    const updatedUser = await User.findOneAndUpdate(
      { email: email },
      { ...user },
      { new: true, runValidators: true }
    );
    res.status(StatusCodes.OK).json(updatedUser);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};
