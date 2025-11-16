const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const circleMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const circleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [circleMemberSchema],
      default: [],
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    joinKeyHash: {
      type: String,
      select: false,
    },
    theme: {
      type: String,
      enum: ["blue", "light", "midnight"],
      default: "blue",
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

circleSchema.virtual("memberCount").get(function () {
  return Array.isArray(this.members) ? this.members.length : 0;
});

circleSchema.methods.setJoinKey = async function (key) {
  if (!key) {
    this.joinKeyHash = undefined;
    return;
  }

  if (key.length !== 4) {
    throw new Error("Circle key must be 4 characters long");
  }

  const saltRounds = 10;
  this.joinKeyHash = await bcrypt.hash(key, saltRounds);
};

circleSchema.methods.verifyJoinKey = async function (key) {
  if (this.visibility === "public") {
    return true;
  }

  if (!this.joinKeyHash) {
    return false;
  }

  return bcrypt.compare(key, this.joinKeyHash);
};

circleSchema.methods.addMember = function (userId, role = "member") {
  const exists = this.members.some(
    (member) => member.user.toString() === userId.toString()
  );

  if (!exists) {
    this.members.push({ user: userId, role, joinedAt: new Date() });
  }
};

circleSchema.methods.updateMemberRole = function (userId, role) {
  this.members = this.members.map((member) =>
    member.user.toString() === userId.toString()
      ? { ...member.toObject(), role }
      : member
  );
};

circleSchema.methods.removeMember = function (userId) {
  this.members = this.members.filter(
    (member) => member.user.toString() !== userId.toString()
  );
};

circleSchema.index({ owner: 1 });
circleSchema.index({ visibility: 1, updatedAt: -1 });
circleSchema.index({ "members.user": 1 });

const Circle = mongoose.model("Circle", circleSchema);

module.exports = Circle;
