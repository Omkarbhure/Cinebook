const User = require('../models/User');

// ─── Get wallet balance + transactions ────────────────────
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance walletTransactions');
    res.json({
      success: true,
      balance: user.walletBalance || 0,
      transactions: (user.walletTransactions || []).slice().reverse().slice(0, 20), // latest 20
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Top up wallet (dummy — no real payment) ──────────────
exports.topUpWallet = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const parsed = Number(amount);

    if (!parsed || parsed <= 0 || parsed > 10000)
      return res.status(400).json({ success: false, message: 'Amount must be between ₹1 and ₹10,000' });

    const ALLOWED = ['card', 'upi', 'netbanking'];
    if (!ALLOWED.includes(paymentMethod))
      return res.status(400).json({ success: false, message: 'Invalid payment method for top-up' });

    const user = await User.findById(req.user._id);
    user.walletBalance = (user.walletBalance || 0) + parsed;
    user.walletTransactions.push({
      type: 'credit',
      amount: parsed,
      description: 'Wallet top-up via ' + paymentMethod.toUpperCase(),
    });
    await user.save();

    res.json({
      success: true,
      balance: user.walletBalance,
      message: '₹' + parsed + ' added to your CineBook Wallet',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Deduct from wallet (called during booking) ───────────
exports.deductWallet = async (userId, amount, description) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if ((user.walletBalance || 0) < amount)
    throw new Error('Insufficient wallet balance');

  user.walletBalance -= amount;
  user.walletTransactions.push({ type: 'debit', amount, description });
  await user.save();
  return user.walletBalance;
};

// ─── Refund to wallet (called on booking cancellation) ────
exports.refundWallet = async (userId, amount, description) => {
  const user = await User.findById(userId);
  if (!user) return;
  user.walletBalance = (user.walletBalance || 0) + amount;
  user.walletTransactions.push({ type: 'credit', amount, description });
  await user.save();
};
