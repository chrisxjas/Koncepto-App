const youtubeCaptionsScraper = require('youtube-captions-scraper');

async function GetCaptions(videoId, fallbackDescription) {
  try {
    const captions = await youtubeCaptionsScraper.getSubtitles({
      videoID: videoId,
      lang: 'en'
    });

    // captions is an array of { start, dur, text }
    const fullText = captions.map(c => c.text).join(' ');
    return fullText;

  } catch (err) {
    console.log("No captions found, fallback to description.");
    return fallbackDescription; // use description if no subtitles
  }
}

module.exports = GetCaptions;