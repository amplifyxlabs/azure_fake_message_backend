require('dotenv').config();
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const axios = require('axios');
const fs = require('fs-extra');
const { createCanvas } = require('canvas');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { ElevenLabsClient } = require('elevenlabs');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('Cloudinary configured successfully.');
} else {
  console.error('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not fully set. Cloudinary uploads will fail.');
}

const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const TEMP_DIR = path.join(__dirname, 'temp');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure directories exist
fs.ensureDirSync(TEMP_DIR);
fs.ensureDirSync(OUTPUT_DIR);

// Helper function to download a file
async function downloadFile(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Helper function to get audio duration
function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration);
    });
  });
}

// Function to create a text bubble image
async function createMessageBubbleImage(text, senderType, outputPath) {
  const canvasWidth = 600; // Adjusted to new nominal width
  const padding = 35; // Increased padding
  const borderRadius = 20; // Rounded corners for the bubble
  const tailWidth = 15;
  const tailHeight = 15; // Height of the tail, also affects bubble position slightly
  const maxWidth = canvasWidth - 2 * padding;

  const canvas = createCanvas(canvasWidth, 500); // Initial large height, will be trimmed
  const ctx = canvas.getContext('2d');

  ctx.font = 'bold 24px Arial'; // Further Reduced font size

  // Calculate text dimensions for wrapping
  let lines = [];
  let currentLine = '';
  const words = text.split(' ');

  for (let word of words) {
    const testLine = currentLine + word + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && currentLine !== '') {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine.trim());

  const lineHeight = 38; // Further Adjusted line height
  const textBlockHeight = lines.length * lineHeight;
  const bubbleHeight = textBlockHeight + 2 * padding;
  const imageActualHeight = bubbleHeight + tailHeight; // Total height needed for the image

  // Create final canvas with precise dimensions
  const finalCanvas = createCanvas(canvasWidth, imageActualHeight);
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.font = 'bold 24px Arial'; // Further Reduced font size

  // Bubble drawing logic (simplified for clarity, original logic for shape is complex)
  const bubbleDrawY = 0; // Draw bubble at the top of its image canvas

  finalCtx.beginPath();
  if (senderType === 'person1') { // User (e.g., blue bubble on the right)
    finalCtx.fillStyle = '#007AFF';
    const bubbleContentWidth = Math.min(maxWidth, ctx.measureText(lines[0]).width + 2 * padding); // More accurate width
    const startX = canvasWidth - bubbleContentWidth - padding; // Align actual bubble content to the right
    
    finalCtx.moveTo(startX + borderRadius, bubbleDrawY);
    finalCtx.lineTo(startX + bubbleContentWidth - borderRadius, bubbleDrawY);
    finalCtx.quadraticCurveTo(startX + bubbleContentWidth, bubbleDrawY, startX + bubbleContentWidth, bubbleDrawY + borderRadius);
    finalCtx.lineTo(startX + bubbleContentWidth, bubbleDrawY + bubbleHeight - borderRadius);
    // Tail for person1 (bottom-right)
    finalCtx.lineTo(startX + bubbleContentWidth, bubbleDrawY + bubbleHeight); // Start of tail base
    finalCtx.lineTo(startX + bubbleContentWidth + tailWidth, bubbleDrawY + bubbleHeight + tailHeight / 2); // Point of tail
    finalCtx.lineTo(startX + bubbleContentWidth, bubbleDrawY + bubbleHeight + tailHeight); // End of tail base
    finalCtx.lineTo(startX + bubbleContentWidth, bubbleDrawY + bubbleHeight + borderRadius); // Connect back to bubble body

    finalCtx.quadraticCurveTo(startX + bubbleContentWidth, bubbleDrawY + bubbleHeight, startX + bubbleContentWidth - borderRadius, bubbleDrawY + bubbleHeight);


    finalCtx.lineTo(startX + borderRadius, bubbleDrawY + bubbleHeight);
    finalCtx.quadraticCurveTo(startX, bubbleDrawY + bubbleHeight, startX, bubbleDrawY + bubbleHeight - borderRadius);
    finalCtx.lineTo(startX, bubbleDrawY + borderRadius);
    finalCtx.quadraticCurveTo(startX, bubbleDrawY, startX + borderRadius, bubbleDrawY);
  } else { // Other person (e.g., gray bubble on the left)
    finalCtx.fillStyle = '#E5E5EA';
    const bubbleContentWidth = Math.min(maxWidth, ctx.measureText(lines[0]).width + 2 * padding); // More accurate width
    const startX = padding;

    finalCtx.moveTo(startX + borderRadius, bubbleDrawY);
    finalCtx.lineTo(startX + bubbleContentWidth - borderRadius, bubbleDrawY);
    finalCtx.quadraticCurveTo(startX + bubbleContentWidth, bubbleDrawY, startX + bubbleContentWidth, bubbleDrawY + borderRadius);
    finalCtx.lineTo(startX + bubbleContentWidth, bubbleDrawY + bubbleHeight - borderRadius);
    
    // Tail for person2 (bottom-left) - Simplified, adjust as needed
    finalCtx.lineTo(startX, bubbleDrawY + bubbleHeight + tailHeight / 2); // Point of tail, needs adjustment relative to bubble body
    
    finalCtx.quadraticCurveTo(startX + bubbleContentWidth, bubbleDrawY + bubbleHeight, startX + bubbleContentWidth-borderRadius, bubbleDrawY + bubbleHeight);


    finalCtx.lineTo(startX + borderRadius, bubbleDrawY + bubbleHeight);
    finalCtx.quadraticCurveTo(startX, bubbleDrawY + bubbleHeight, startX, bubbleDrawY + bubbleHeight - borderRadius);
    finalCtx.lineTo(startX, bubbleDrawY + borderRadius);
    finalCtx.quadraticCurveTo(startX, bubbleDrawY, startX + borderRadius, bubbleDrawY);
  }
  finalCtx.closePath();
  finalCtx.fill();

  // Text drawing
  finalCtx.fillStyle = senderType === 'person1' ? '#FFFFFF' : '#000000';
  finalCtx.textAlign = 'left';
  finalCtx.textBaseline = 'top';

  const textStartX = (senderType === 'person1' ? (canvasWidth - Math.min(maxWidth, ctx.measureText(lines[0]).width + 2*padding) - padding) : padding) + padding;

  lines.forEach((line, index) => {
    finalCtx.fillText(line, textStartX, bubbleDrawY + padding + (index * lineHeight) + (lineHeight - 24)/2); // Adjusted for new font size
  });

  await fs.writeFile(outputPath, finalCanvas.toBuffer('image/png'));
  console.log(`Generated bubble: ${outputPath}`);
}


app.post('/generate-fake-conversation-video', async (req, res) => {
  const { messages, backgroundVideoUrl, voiceSettings } = req.body;
  const jobId = uuidv4();
  const jobTempDir = path.join(TEMP_DIR, jobId);
  await fs.ensureDir(jobTempDir);

  console.log(`[Job ${jobId}] Received request:`, req.body);

  if (!messages || !backgroundVideoUrl || !voiceSettings) {
    return res.status(400).json({ error: 'Missing required fields: messages, backgroundVideoUrl, or voiceSettings' });
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("ELEVENLABS_API_KEY not found in .env");
    return res.status(500).json({ error: 'Server configuration error: Missing ElevenLabs API key.' });
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary credentials not found in .env");
    return res.status(500).json({ error: 'Server configuration error: Missing Cloudinary credentials.' });
  }

  try {
    // 1. Download background video
    const backgroundVideoPath = path.join(jobTempDir, 'background.mp4');
    console.log(`[Job ${jobId}] Downloading background video from: ${backgroundVideoUrl}`);
    await downloadFile(backgroundVideoUrl, backgroundVideoPath);
    console.log(`[Job ${jobId}] Background video downloaded to: ${backgroundVideoPath}`);

    // Get background video dimensions
    let bgWidth, bgHeight;
    try {
        console.log(`[Job ${jobId}] Probing background video for dimensions: ${backgroundVideoPath}`);
        const metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(backgroundVideoPath, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream || typeof videoStream.width !== 'number' || typeof videoStream.height !== 'number') { // Added type check
            throw new Error('Could not find valid video stream dimensions.');
        }
        bgWidth = videoStream.width;
        bgHeight = videoStream.height;
        console.log(`[Job ${jobId}] Background video dimensions: ${bgWidth}x${bgHeight}`);
    } catch (probeError) {
        console.error(`[Job ${jobId}] Error probing video:`, probeError);
        return res.status(500).json({ error: 'Failed to process background video dimensions.', details: probeError.message });
    }

    // Define chat container properties
    const chatContainerW = Math.round(bgWidth * 0.9);
    const chatContainerH = Math.round(bgHeight * 0.55); // Made taller
    const chatContainerX = Math.round((bgWidth - chatContainerW) / 2);
    const chatContainerY = Math.round(bgHeight * 0.03); // Moved higher
    const bubblePaddingHorizontal = 30; // Further Increased
    const bubblePaddingBottom = 30; // Further Increased
    const bubbleImageNominalWidth = 600; // Adjusted nominal width for bubbles

    const MAX_VISIBLE_MESSAGES = 3;
    const avgBubbleHeight = 115; // Estimated average height of a single message bubble image
    const bubbleSpacing = 30;    // Vertical spacing between bubbles - Further INCREASED
    const SYNC_OFFSET = -0.05; // Visuals lead audio by 50ms. Adjust as needed. +/- 0.05 to 0.15 are common starting points.

    // Calculate Y positions for the TOP of each bubble in its slot
    // Slots are 0 (top-most visible) to MAX_VISIBLE_MESSAGES - 1 (bottom-most visible)
    const chatBoxHeaderApproxPercent = 0.18; // Adjust as needed for the "Unknown" / time area
    const chatBoxFooterApproxPercent = 0.15; // Adjust as needed for the iMessage input bar area
    
    const topOfUsableChatAreaY = chatContainerY + (chatContainerH * chatBoxHeaderApproxPercent);
    const bottomOfUsableChatAreaY = chatContainerY + chatContainerH - (chatContainerH * chatBoxFooterApproxPercent);
    const usableChatAreaHeight = bottomOfUsableChatAreaY - topOfUsableChatAreaY;

    let slotTopY = new Array(MAX_VISIBLE_MESSAGES);

    // Position slots from the bottom of the usable area, stacking up
    // Slot MAX_VISIBLE_MESSAGES - 1 (bottom-most onscreen)
    slotTopY[MAX_VISIBLE_MESSAGES - 1] = bottomOfUsableChatAreaY - avgBubbleHeight - bubblePaddingBottom; // A little padding from very bottom of usable area

    for (let i = MAX_VISIBLE_MESSAGES - 2; i >= 0; i--) {
        slotTopY[i] = slotTopY[i+1] - avgBubbleHeight - bubbleSpacing;
    }
    // Ensure slots don't go above the top of the usable area (simple clamp)
    for (let i = 0; i < MAX_VISIBLE_MESSAGES; i++) {
        if (slotTopY[i] < topOfUsableChatAreaY) {
            slotTopY[i] = topOfUsableChatAreaY + (i * (avgBubbleHeight + bubbleSpacing)); // Fallback stacking from top if overflow
        }
    }

    // URL for the chatbox background image
    const chatBoxImageUrl = "https://res.cloudinary.com/dxn80wdoa/image/upload/v1747801514/ChatGPT_Image_May_21_2025_09_54_57_AM_lwhlp9.png";
    const chatBoxImagePath = path.join(jobTempDir, 'chatbox_background.png');

    // 2. Generate audio for each message and get durations
    const audioFiles = [];
    const bubbleImageFiles = [];
    let currentAudioTime = 0;
    const overlayTiming = []; // To store { imagePath, startTime (of audio), audioDuration }

    // Before generating audio, download the chatbox image
    try {
        console.log(`[Job ${jobId}] Downloading chatbox background image from: ${chatBoxImageUrl}`);
        await downloadFile(chatBoxImageUrl, chatBoxImagePath);
        console.log(`[Job ${jobId}] Chatbox background image downloaded to: ${chatBoxImagePath}`);
    } catch (downloadError) {
        console.error(`[Job ${jobId}] Error downloading chatbox background image:`, downloadError);
        // Decide if this is a fatal error or if you can proceed without it (e.g., fallback to drawbox or no box)
        return res.status(500).json({ error: 'Failed to download chatbox background image.', details: downloadError.message });
    }

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const audioPath = path.join(jobTempDir, `message_${i}.mp3`);
      const bubbleImagePath = path.join(jobTempDir, `bubble_${i}.png`);

      console.log(`[Job ${jobId}] Generating audio for message ${i}: "${message.text}" using voice ${message.sender === 'person1' ? voiceSettings.person1Voice : voiceSettings.person2Voice}`);
      
      const audioResult = await elevenLabsClient.textToSpeech.convert( 
        message.sender === 'person1' ? voiceSettings.person1Voice : voiceSettings.person2Voice, 
        {
          text: message.text,
          model_id: "eleven_multilingual_v2", // Or your preferred model
        }
      );

      const fileWriteStream = fs.createWriteStream(audioPath);
      
      // Check if audioResult is a stream directly, or if the stream is nested
      let audioStream = audioResult; // Default assumption
      if (audioResult && typeof audioResult.pipe !== 'function' && audioResult.data && typeof audioResult.data.pipe === 'function') {
        // If the stream is in audioResult.data (common with some HTTP clients)
        audioStream = audioResult.data;
      } else if (audioResult && typeof audioResult.pipe !== 'function') {
        // If it's not a stream and not in .data, this is an unexpected structure
        console.error(`[Job ${jobId}] Unexpected audio result structure from ElevenLabs:`, audioResult);
        throw new Error('Unexpected audio result structure from ElevenLabs');
      }
      
      audioStream.pipe(fileWriteStream);
      await new Promise((resolve, reject) => {
          fileWriteStream.on('finish', resolve);
          fileWriteStream.on('error', reject);
      });

      console.log(`[Job ${jobId}] Audio for message ${i} saved to: ${audioPath}`);
      audioFiles.push(audioPath);

      const audioDuration = await getAudioDuration(audioPath);
      console.log(`[Job ${jobId}] Audio duration for message ${i}: ${audioDuration}s`);

      overlayTiming.push({
          imagePath: bubbleImagePath,
          startTime: currentAudioTime, // Start time of this specific audio clip
          audioDuration: parseFloat(audioDuration)
      });
      
      currentAudioTime += parseFloat(audioDuration);
      if (i < messages.length - 1) { // Only add pause if NOT the last message
        currentAudioTime += 0.5; 
      }

      // Create bubble image
      console.log(`[Job ${jobId}] Generating bubble image for message ${i}`);
      await createMessageBubbleImage(message.text, message.sender, bubbleImagePath);
      bubbleImageFiles.push(bubbleImagePath);
    }

    // 3. Concatenate audio files (if more than one)
    const concatenatedAudioPath = path.join(jobTempDir, 'conversation_audio.mp3');
    if (audioFiles.length > 0) {
        await new Promise((resolve, reject) => {
            const ffmpegCommand = ffmpeg();
            audioFiles.forEach(audioFile => ffmpegCommand.input(audioFile));
            ffmpegCommand
                .on('error', (err) => {
                    console.error(`[Job ${jobId}] Error concatenating audio: `, err);
                    reject(err);
                })
                .on('end', () => {
                    console.log(`[Job ${jobId}] Audio concatenated successfully to: ${concatenatedAudioPath}`);
                    resolve();
                })
                .mergeToFile(concatenatedAudioPath, jobTempDir); // temp dir for intermediate files if any
        });
    } else {
        // Handle case with no audio (e.g., create a silent audio track of total duration or skip audio steps)
        console.log(`[Job ${jobId}] No audio messages to process. Skipping audio concatenation.`);
        // Create a short silent audio if needed by FFmpeg later, or ensure FFmpeg handles no audio input gracefully
    }


    // 4. Assemble video with FFmpeg
    const outputVideoPath = path.join(OUTPUT_DIR, `fake_conversation_${jobId}.mp4`);
    console.log(`[Job ${jobId}] Assembling final video to: ${outputVideoPath}`);

    const cloudinaryUrl = await new Promise((resolve, reject) => {
      const command = ffmpeg(backgroundVideoPath);

      if (fs.existsSync(concatenatedAudioPath)) {
        command.input(concatenatedAudioPath); // This will be input [1:a] if it exists
      }
      
      // Add chatbox image input if it was downloaded
      let chatboxImageInputIndex = -1;
      if (fs.existsSync(chatBoxImagePath)) {
        chatboxImageInputIndex = (fs.existsSync(concatenatedAudioPath) ? 2 : 1);
        command.input(chatBoxImagePath); // This will be [2:v] or [1:v]
      }

      // Add bubble image inputs. These will start after video, optional audio, and optional chatbox image.
      overlayTiming.forEach((overlay) => {
        command.input(overlay.imagePath);
      });

      let filters = [];
      let currentVideoSourceTag = '[0:v]'; // Initial background video stream

      // Filter 1: Overlay the chat container image (if downloaded)
      let chatContainerEffectiveW = chatContainerW; // Use defined width by default
      let chatContainerEffectiveH = chatContainerH; // Use defined height by default

      if (chatboxImageInputIndex !== -1) {
        const chatBoxImageTag = `[${chatboxImageInputIndex}:v]`;
        const chatBoxScaledTag = `[v_chatbox_scaled]`;
        const chatBoxOverlaidTag = `[v_chatbox_overlaid]`;
        
        // Scale the chatbox image to fit the defined chatContainerW and chatContainerH
        filters.push(
            `${chatBoxImageTag}scale=${chatContainerW}:${chatContainerH}${chatBoxScaledTag}`
        );
        // Overlay the scaled chatbox image
        filters.push(
            `${currentVideoSourceTag}${chatBoxScaledTag}overlay=x=${chatContainerX}:y=${chatContainerY}${chatBoxOverlaidTag}`
        );
        currentVideoSourceTag = chatBoxOverlaidTag;
      } else {
        // Fallback: Draw the semi-transparent box if image failed or wasn't used (optional, or just error out earlier)
        const chatBoxDrawnTag = '[v_chatbox_drawn]';
         filters.push(
             `${currentVideoSourceTag}drawbox=x=${chatContainerX}:y=${chatContainerY}:w=${chatContainerW}:h=${chatContainerH}:color=black@0.75:t=fill${chatBoxDrawnTag}`
         );
         currentVideoSourceTag = chatBoxDrawnTag;
      }

      // Filter 2 to N: Overlay bubbles with scrolling logic
      const finalVideoDuration = messages.length > 0 ? currentAudioTime : 0;

      overlayTiming.forEach((currentMessageMetrics, msgIdx) => {
          let bubbleImageBaseIndex = 1; 
          if (fs.existsSync(concatenatedAudioPath)) bubbleImageBaseIndex++;
          if (chatboxImageInputIndex !== -1) bubbleImageBaseIndex++;
          
          const bubbleImageInputIndex = bubbleImageBaseIndex + msgIdx;
          const bubbleImageTag = `[${bubbleImageInputIndex}:v]`;

          // Determine X position based on sender (once per message)
          let xPosExpr;
          if (messages[msgIdx].sender === 'person1') {
              xPosExpr = `${chatContainerX} + ${chatContainerEffectiveW} - ${bubbleImageNominalWidth} - ${bubblePaddingHorizontal}`;
          } else {
              xPosExpr = `${chatContainerX} + ${bubblePaddingHorizontal}`;
          }

          for (let screenSlotIdx = 0; screenSlotIdx < MAX_VISIBLE_MESSAGES; screenSlotIdx++) {
              // screenSlotIdx: 0 = top-most visible message slot, MAX_VISIBLE_MESSAGES-1 = bottom-most.
              
              // Which message appearing at the bottom triggers msgIdx to be in screenSlotIdx?
              // triggerMsgForBottomSlot is the index of the message that is AT THE BOTTOM (newest)
              // when msgIdx is in screenSlotIdx.
              const triggerMsgForBottomSlotIndex = msgIdx + (MAX_VISIBLE_MESSAGES - 1 - screenSlotIdx);

              if (triggerMsgForBottomSlotIndex < 0 || triggerMsgForBottomSlotIndex >= overlayTiming.length) {
                  // This specific msgIdx can't be in screenSlotIdx based on this trigger logic
                  // or the trigger message doesn't exist.
                  continue;
              }

              const audioStartOfTrigger = overlayTiming[triggerMsgForBottomSlotIndex].startTime;
              const displayStartTime = Math.max(0, audioStartOfTrigger + SYNC_OFFSET);
              
              let displayEndTime;
              const nextTriggerMsgIndex = triggerMsgForBottomSlotIndex + 1;
              if (nextTriggerMsgIndex < overlayTiming.length) {
                  const audioStartOfNextTrigger = overlayTiming[nextTriggerMsgIndex].startTime;
                  displayEndTime = audioStartOfNextTrigger + SYNC_OFFSET;
              } else {
                  displayEndTime = finalVideoDuration; // Visuals for last scene extend to end of all audio
              }

              // Ensure displayEndTime is always slightly after displayStartTime
              if (displayEndTime <= displayStartTime) {
                  displayEndTime = displayStartTime + 0.03; // Min display duration of 30ms for safety
              }
              
              const yPosForSlot = slotTopY[screenSlotIdx];
              const outputTag = `[v_msg${msgIdx}_s${screenSlotIdx}]`; // Unique tag for each overlay segment

              filters.push(
                  `${currentVideoSourceTag}${bubbleImageTag}overlay=x=(${xPosExpr}):y=${yPosForSlot}:enable='between(t,${displayStartTime},${displayEndTime})'${outputTag}`
              );
              currentVideoSourceTag = outputTag;
          }
      });

      if (filters.length > 0) {
        command.complexFilter(filters);
      }
      
      let videoMapTagForOutput;
      if (overlayTiming.length > 0) { 
          videoMapTagForOutput = currentVideoSourceTag; 
      } else if (chatboxImageInputIndex !== -1 || (filters.length > 0 && filters[0].includes('drawbox'))) { // Chatbox image or drawn box was applied
          videoMapTagForOutput = currentVideoSourceTag; 
      } else { 
          videoMapTagForOutput = '[0:v]'; 
      }
      // Ensure it has brackets for the -map option
      if (videoMapTagForOutput && !videoMapTagForOutput.startsWith('[')) {
        videoMapTagForOutput = `[${videoMapTagForOutput}]`;
      }


      let audioMapTarget = null;
      if (fs.existsSync(concatenatedAudioPath)) {
        audioMapTarget = '1:a'; // Concatenated audio is from input 1 (removed brackets)
      }
      
      let outputCommandOptions = [];
      if (audioMapTarget) {
        outputCommandOptions.push('-map', videoMapTagForOutput, '-map', audioMapTarget);
      } else {
        outputCommandOptions.push('-map', videoMapTagForOutput);
      }

      // Add video duration trimming
      outputCommandOptions.push('-t', finalVideoDuration.toString());

      command
        .outputOptions(outputCommandOptions) // Apply all output options together
        .outputOptions([
            '-c:v libx264',
            '-preset ultrafast',
            '-crf 23',
        ])
        .audioCodec(audioMapTarget ? 'aac' : 'copy')
        .audioBitrate(audioMapTarget ? '192k' : 'copy')
        .on('start', (commandLine) => {
          console.log(`[Job ${jobId}] FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[Job ${jobId}] FFmpeg processing: ${progress.percent.toFixed(2)}% done`);
          }
        })
        .on('error', (err, stdout, stderr) => {
          console.error(`[Job ${jobId}] FFmpeg error: `, err);
          console.error(`[Job ${jobId}] FFmpeg stdout: `, stdout);
          console.error(`[Job ${jobId}] FFmpeg stderr: `, stderr);
          reject(err);
        })
        .on('end', async () => {
          console.log(`[Job ${jobId}] Video processing finished. Output: ${outputVideoPath}`);
          try {
            console.log(`[Job ${jobId}] Uploading video to Cloudinary...`);
            const uploadResult = await cloudinary.uploader.upload(outputVideoPath, {
              resource_type: "video",
              public_id: `fake_conversations/${jobId}`,
              overwrite: true,
            });
            console.log(`[Job ${jobId}] Video uploaded to Cloudinary: ${uploadResult.secure_url}`);
            await fs.remove(outputVideoPath);
            console.log(`[Job ${jobId}] Removed local video file: ${outputVideoPath}`);
            resolve(uploadResult.secure_url);
          } catch (uploadError) {
            console.error(`[Job ${jobId}] Failed to upload to Cloudinary or delete local file: `, uploadError);
            reject(uploadError);
          }
        })
        .save(outputVideoPath);
    });

    res.json({
      message: 'Video generation and upload to Cloudinary started successfully!',
      jobId: jobId,
      videoUrl: cloudinaryUrl
    });

  } catch (error) {
    console.error(`[Job ${jobId}] Error processing video: `, error.message, error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate video.', details: error.message });
    }
  } finally {
    // Optional: Clean up temp files for this job after some time or based on a cron job
    // For now, we'll leave them for debugging.
    // await fs.remove(jobTempDir);
    // console.log(`[Job ${jobId}] Cleaned up temp directory: ${jobTempDir}`);
  }
});

// Serve static files from output directory (for accessing generated videos)
// app.use('/output', express.static(OUTPUT_DIR));


app.listen(port, () => {
  console.log(`Fake conversation backend listening at http://localhost:${port}`);
}); 