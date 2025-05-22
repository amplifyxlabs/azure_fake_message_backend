# Fake Conversation Video Generator

This project provides a backend service to generate fake conversation videos by overlaying animated text bubbles with synthesized speech onto a background video. It utilizes FFmpeg for video processing, ElevenLabs for text-to-speech, and Cloudinary for media storage.

## Features

- Generate videos from a sequence of messages.
- Use custom background videos.
- Synthesize speech for messages using different voices (via ElevenLabs).
- Animate message bubbles with scrolling behavior within a chat interface overlay.
- Upload final generated videos to Cloudinary.

## Prerequisites

Before running this project, ensure you have the following installed:

- Node.js (v14 or higher recommended)
- FFmpeg and FFprobe (usually bundled with `@ffmpeg-installer/ffmpeg`)
- Access to the following services:
    - ElevenLabs API (for text-to-speech)
    - Cloudinary Account (for media storage)

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd azure_fake_message
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the root directory based on the provided `.env.example` (if available, otherwise create it manually) and add your credentials:

    ```env
    PORT=3001
    ELEVENLABS_API_KEY=your_elevenlabs_api_key
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    ```
    Replace the placeholder values with your actual API keys and Cloudinary details.

4.  **Ensure necessary directories exist:** The application will automatically create `temp` and `output` directories if they don't exist.

## Running the Application

Start the Node.js server by running:

```bash
npm start
```
Or using nodemon for development with automatic restarts:
```bash
nodemon index.js
```
The server will start on the port specified in your `.env` file (default is 3001).

## API Endpoint

The application exposes a single endpoint for generating videos:

### `POST /generate-fake-conversation-video`

This endpoint accepts a JSON payload describing the conversation and video parameters.

**Request Body:**

The request body should be a JSON object with the following properties:

-   `messages` (Array of Objects): A list of message objects. Each message object should have:
    -   `text` (String): The content of the message.
    -   `sender` (String): The sender of the message. Use `'person1'` for the user (right/blue bubble) and any other value (e.g., `'person2'`) for the other person (left/gray bubble).
-   `backgroundVideoUrl` (String): The URL of the background video to use.
-   `voiceSettings` (Object): An object specifying the ElevenLabs voice IDs to use for each sender:
    -   `person1Voice` (String): ElevenLabs voice ID for the 'person1' sender.
    -   `person2Voice` (String): ElevenLabs voice ID for the 'person2' sender.

**Example Request Body:**

```json
{
  "messages": [
    {
      "text": "Hey, how are you doing?",
      "sender": "person2"
    },
    {
      "text": "I'm doing great, thanks! Just finished working on a cool project.",
      "sender": "person1"
    },
    {
      "text": "Oh, nice! What project was that?",
      "sender": "person2"
    }
  ],
  "backgroundVideoUrl": "YOUR_BACKGROUND_VIDEO_URL_HERE",
  "voiceSettings": {
    "person1Voice": "YOUR_PERSON1_VOICE_ID",
    "person2Voice": "YOUR_PERSON2_VOICE_ID"
  }
}
```

**Response:**

-   On success, returns a JSON object with `message`, `jobId`, and `videoUrl` (the Cloudinary URL of the generated video).
-   On error, returns a JSON object with an `error` message and optional `details`.

## Project Structure

```
.
├── azure_fake_message/
│   ├── output/         # Generated videos are saved here temporarily before upload
│   ├── temp/           # Temporary files (audio, bubble images) are stored here
│   ├── .dockerignore
│   ├── .env            # Environment variables (create this file)
│   ├── .gitignore
│   ├── Dockerfile
│   ├── index.js        # Main application file
│   ├── package-lock.json
│   ├── package.json    # Project dependencies
│   └── README.md       # Project documentation
```

## Contributing

(Add contributing guidelines here if applicable)

## License

(Add license information here if applicable) 