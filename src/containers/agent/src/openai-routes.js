const express = require('express');
const axios = require('axios');
const router = express.Router();

// Initialize Deepseek client with OpenAI-compatible endpoint
const deepseekClient = axios.create({
    baseURL: 'https://api.deepseek.com/v1',
    headers: {
        'Authorization': `Bearer sk-0c15539d6c9d49a194fabe3794a5104b`,
        'Content-Type': 'application/json'
    }
});

// Helper function to format messages
function formatMessages(messages) {
    return messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

// OpenAI-compatible chat completion endpoint
router.post('/v1/chat/completions', async (req, res) => {
    try {
        const { messages, temperature = 0.7, stream = false } = req.body;
        const formattedMessages = formatMessages(messages);

        const response = await deepseekClient.post('/chat/completions', {
            model: "deepseek-chat",
            messages: formattedMessages,
            temperature: temperature,
            stream: stream
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error in chat completion:', error.response?.data || error);
        res.status(error.response?.status || 500).json({
            error: {
                message: error.response?.data?.error?.message || error.message || 'An error occurred during chat completion',
                type: error.response?.data?.error?.type || 'internal_error',
                code: error.response?.data?.error?.code || 'internal_error'
            }
        });
    }
});

// OpenAI-compatible models endpoint
router.get('/v1/models', async (req, res) => {
    try {
        // Return Deepseek models
        const models = {
            object: "list",
            data: [
                {
                    id: "deepseek-chat",
                    object: "model",
                    created: Date.now(),
                    owned_by: "deepseek"
                },
                {
                    id: "deepseek-coder",
                    object: "model",
                    created: Date.now(),
                    owned_by: "deepseek"
                }
            ]
        };

        res.json(models);
    } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({
            error: {
                message: error.message || 'An error occurred while fetching models',
                type: 'internal_error',
                code: 'internal_error'
            }
        });
    }
});

module.exports = router;
