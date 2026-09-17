// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: "jmcs-main",
            script: "./node_modules/.bin/nodemon",
            args: "--watch 'src/**/*.ts' --exec 'tsx' src/server.ts",
            watch: false,
            autorestart: true,
        },
    ],
};