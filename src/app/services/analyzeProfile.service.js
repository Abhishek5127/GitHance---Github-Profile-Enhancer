import axios from "axios";

export async function analyzeProfile(data) {
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "kwaipilot/kat-coder-pro:free",

                messages: [
                    {
                        role: "system",
                        content: `
            You are a github Profile Analyzer giving Statics and data about a github Repo using the json data
            Return ONLY this JSON:
       {
            "bullets": ["string", "string", ...]
    }

Rules:
`}]
            })
    } catch (error) {

    }
}