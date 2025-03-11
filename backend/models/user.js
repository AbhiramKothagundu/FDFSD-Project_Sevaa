import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { DeliveryBoy } from "./deliveryboy.js";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    address: {
        doorNo: { type: String, required: true },
        street: { type: String, required: true },
        landmarks: { type: String },
        townCity: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        coordinates: {
            type: { type: String, default: "Point" },
            coordinates: { type: [Number], required: true },
        },
    },
    mobileNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    deliveryBoys: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeliveryBoy",
        },
    ],
    donorOrdersCount: { type: Number, default: 0 },
    deliveredOrdersCount: { type: Number, default: 0 },
    registeredDeliveryBoysCount: { type: Number, default: 0 },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        validate: {
            validator: function (v) {
                return !isNaN(v);
            },
            message: (props) => `${props.value} is not a valid rating number!`,
        },
    },
});

// Pre-save hook to hash password and update delivery boy count
userSchema.pre("save", async function (next) {
    const user = this;

    // Update registered delivery boys count
    user.registeredDeliveryBoysCount = user.deliveryBoys.length;

    // Hash the password if it has been modified
    if (!user.isModified("password")) return next();

    try {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        user.password = hashedPassword;
        next();
    } catch (error) {
        return next(error);
    }
});

// Method to calculate and update user rating
userSchema.methods.updateRating = function (ratings) {
    // If no ratings, set a default rating or keep the current one
    if (!ratings || ratings.length === 0) {
        // Either keep the current rating if it exists, or set a default (e.g., 0 or 5)
        this.rating = this.rating || 0; // Default to 0 if no ratings
        return;
    }

    // Calculate the average rating
    const sum = ratings.reduce((total, rating) => total + rating.value, 0);
    const average = sum / ratings.length;

    // Ensure the result is a valid number
    this.rating = isNaN(average) ? 0 : average;
};

export const User = mongoose.model("User", userSchema);
