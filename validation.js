const crypto = require('crypto');


async function validationModule(app) {



    app.post('/api/generateApiKey', async (req, res) => {
        function generateApiKey(length) {
            return crypto.randomBytes(length).toString('hex');
        }

        // Generate a random API key with 32 characters (16 bytes)
        const apiKey = generateApiKey(16);
        console.log(apiKey);
        let data = req.body;
        try {
            if (!data || !data.id) {
                return res.status(400).send('Invalid request body');
            }
            console.log(data.id)
            const updatedUser = await User.findOneAndUpdate(
                { _id: data.id }, // Query condition
                { api_key: apiKey }
            );

            // Send predictions as response
            res.status(200).json({ apiKey });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}
async function validateApiKey(req, res, next) {
    try {
        // Retrieve the Authorization header from the request
        const authHeader = req.headers.authorization;

        // Check if the Authorization header is provided
        if (!authHeader || !authHeader.startsWith("API_KEY ")) {
            return res.status(401).json({ message: "Invalid API key format" });
        }

        // Extract the API key from the Authorization header
        const api_key = authHeader.split(" ")[1];
        console.log('api_key');
        console.log(api_key);

        // Find the user with the provided API key
        const user = await User.findOne({ api_key });

        // Check if the user exists
        if (!user) {
            return res.status(401).json({ message: "Invalid API key" });
        }

        // Attach the user object to the request for further processing
        req.user = user;

        // API key is valid, proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}
module.exports = { validationModule, validateApiKey };
