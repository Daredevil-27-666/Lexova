import axios from 'axios';

// Move this to a .env file!
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

/**
 * Searches for music videos and returns a simplified track object.
 */
async function searchMusic(query) {
    if (!query) return [];

    const params = {
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10', 
        videoEmbeddable: 'true',
        key: YOUTUBE_API_KEY,
        maxResults: 10
    };

    try {
        const { data } = await axios.get(BASE_URL, { params });
        
        // Transform the data immediately for the UI
        return data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium.url,
            publishDate: item.snippet.publishedAt
        }));

    } catch (error) {
        // Log to a service in production, but don't let the app crash
        console.error("Search API Failure:", error.response?.data || error.message);
        return []; 
    }
}