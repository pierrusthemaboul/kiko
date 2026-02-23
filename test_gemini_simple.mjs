
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log(result.response.text());
    } catch (e) {
        console.error(e);
    }
}
test();
