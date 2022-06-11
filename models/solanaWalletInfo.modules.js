const mongoose = require('mongoose');

// Solana wallet schema
const solanaWalletInfoScheama = new mongoose.Schema(
  {
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    public_key: {
      type: String,
      required: true
    },
    secret_key: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('solanaWalletInfo', solanaWalletInfoScheama);