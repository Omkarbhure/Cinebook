const express = require('express');
const router = express.Router();
const { getWallet, topUpWallet } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getWallet);
router.post('/topup', topUpWallet);

module.exports = router;
