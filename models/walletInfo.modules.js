const mongoose = require('mongoose');
const crypto = require('crypto');
// user schema
const walletInfoScheama = new mongoose.Schema(
  {
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    wallet_address: {
      type: String,
      required: true
    },
    privateAddress: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('walletInfo', walletInfoScheama);