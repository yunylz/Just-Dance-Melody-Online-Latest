# Services

This directory contains all the API routes for the Hub API.

## Routes

### Auth

| Route | Method | Description |
| --- | --- | --- |
| `/auth/v1/register` | POST | Register a new user |
| `/auth/v1/session` | POST | Login a user |
| `/auth/v1/change-password` | POST | Change a user's password |
| `/auth/v1/reset-password` | POST | Reset a user's password |
| `/auth/v1/forgot-password` | POST | Send a password reset email |
| `/auth/v1/resend-verification` | POST | Resend a user's verification email |

### Admin
This is route only works with Admin token.

| Route | Method | Description |
| --- | --- | --- |
| `/admin/v1/ban-user` | POST | Ban a user |
| `/admin/v1/unban-user` | POST | Unban a user |
| `/admin/v1/delete-user` | POST | Delete a user |
| `/admin/v1/unlink-profile` | POST | Unlink a profile from a user |
| `/admin/v1/add-to-qa` | POST | Add a user to QA |
| `/admin/v1/remove-from-qa` | POST | Remove a user from QA |


### Editorial

| Route | Method | Description |
| --- | --- | --- |
| `/editorial/v1/home` | GET | Get the home page content |

### JMCS

| Route | Method | Description |
| --- | --- | --- |
| `/jmcs/v1/songdb` | GET | Get the song database |
| `/jmcs/v1/games` | GET | Get the games supported by JMCS |
| `/jmcs/v1/playlists` | GET | Get the playlists supported by JMCS |
| `/jmcs/v1/leaderboard` | GET | Get the leaderboard for a game |
| `/jmcs/v1/wdf/status` | GET | Get the WDF status for a room |
| `/jmcs/v1/dotw` | GET | Get the dotw for a game |

### Status

| Route | Method | Description |
| --- | --- | --- |
| `/status/v1/ping` | GET | Ping the API |
| `/status/v1/info` | GET | Get information about the API |
| `/status/v1/errors` | GET | Get the list of error codes |

### Users

| Route | Method | Description |
| --- | --- | --- |
| `/users/v1/me` | GET | Get the current user |
| `/users/v1/me/profiles` | GET | Get the current user's profiles |
| `/users/v1/me/profiles` | POST | Add a profile to the current user |
| `/users/v1/me/profiles/:platform` | PATCH | Update a profile for the current user |
| `/users/v1/me/profiles/:platform` | DELETE | Delete a profile for the current user |
| `/users/v1/me/news` | GET | Get the current user's news |
| `/users/v1/me/news` | POST | Add a news item to the current user |
