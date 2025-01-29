const express = require('express');
const router = express.Router();
const userService = require('../services/user');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const { email, name } = req.body;
    const user = await userService.createUser(email, name);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user details
router.get('/:id', async (req, res) => {
  try {
    const user = await userService.getUser(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user settings
router.put('/:id/settings', async (req, res) => {
  try {
    const settings = await userService.updateUserSettings(
      parseInt(req.params.id),
      req.body
    );
    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
