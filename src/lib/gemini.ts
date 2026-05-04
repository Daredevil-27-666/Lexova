import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
export const genai = new GoogleGenAI({ apiKey });
export const GEMINI_MODEL = 'gemini-2.0-flash';
