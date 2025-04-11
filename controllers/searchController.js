import Post from "../models/PostSchema.js";
import User from "../models/UserSchema.js";
import { StatusCodes } from "http-status-codes";

export const searchContent = async (req, res) => {
  try {
    const { query } = req.query;
    // Using regex for case-insensitive search in posts and user first names (you can add more fields)
    const posts = await Post.find({
      description: { $regex: query, $options: "i" }
    });
    const users = await User.find({
      firstName: { $regex: query, $options: "i" }
    });
    res.status(StatusCodes.OK).json({ posts, users });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};
