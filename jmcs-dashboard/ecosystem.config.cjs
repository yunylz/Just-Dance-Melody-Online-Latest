require('dotenv').config({ path: '/opt/jdmo/frontend/jmcs-dashboard/.env' });

module.exports = {
    apps: [
        {
            name: 'jmcs-dashboard',
            script: 'build/index.js',
            env: {
                PORT: 8550,
                NODE_ENV: 'production',
                ...process.env  // spreads all env vars including from .env
            }
        }
    ]
};