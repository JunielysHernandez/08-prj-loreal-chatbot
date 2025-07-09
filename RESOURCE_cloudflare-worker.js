// Copy this code into your Cloudflare Worker script
// L'Oréal Beauty Assistant Cloudflare Worker
// This securely handles OpenAI API requests and hides the API key from users


export default {
 async fetch(request, env) {
   const corsHeaders = {
     "Access-Control-Allow-Origin": "*", // In production, replace * with your domain
     "Access-Control-Allow-Methods": "POST, OPTIONS",
     "Access-Control-Allow-Headers": "Content-Type",
     "Content-Type": "application/json",
   };


   try {
     const url = new URL(request.url);


     // Health check endpoint
     if (url.pathname === "/ping") {
       return new Response(JSON.stringify({ status: "ok" }), {
         headers: corsHeaders,
       });
     }


     // Handle CORS preflight requests
     if (request.method === "OPTIONS") {
       return new Response(null, { headers: corsHeaders });
     }


     // Only allow POST requests to root
     if (request.method !== "POST" || url.pathname !== "/") {
       return new Response(
         JSON.stringify({
           error: "Method not allowed or invalid endpoint",
         }),
         {
           status: 405,
           headers: corsHeaders,
         }
       );
     }


     // Require API key from environment variable only
     const apiKey = env.API_Key;
     if (!apiKey) {
       return new Response(
         JSON.stringify({
           error: "OpenAI API key not configured in environment variables.",
           debug: `Available env vars: ${Object.keys(env).join(", ")}`,
           apiKeyFound: !!env.API_Key,
           apiKeyLength: env.API_Key ? env.API_Key.length : 0,
         }),
         { status: 500, headers: corsHeaders }
       );
     }


     // Parse request body
     let userInput;
     try {
       userInput = await request.json();
       if (!userInput?.message) {
         return new Response(
           JSON.stringify({ error: "No message provided in request body" }),
           { status: 400, headers: corsHeaders }
         );
       }
     } catch (err) {
       return new Response(
         JSON.stringify({ error: "Invalid JSON in request body." }),
         { status: 400, headers: corsHeaders }
       );
     }


     // L'Oréal system prompt
     const systemPrompt = `You are a L'Oréal Beauty Assistant. You can ONLY answer questions about:
- L'Oréal products (skincare, makeup, hair care, etc.)
- Beauty routines and skincare advice
- General beauty tips and techniques
- L'Oréal company information
- Beauty trends and ingredient education


If someone asks about:
- Competitors' products
- Non-beauty topics
- Personal information requests
- Inappropriate content


Politely redirect them to L'Oréal-related topics. Always be helpful, friendly, and professional. End responses with suggestions for specific L'Oréal products when relevant.`;


     // OpenAI API configuration
     const apiUrl = "https://api.openai.com/v1/chat/completions";
     const requestBody = {
       model: "gpt-3.5-turbo",
       messages: [
         { role: "system", content: systemPrompt },
         { role: "user", content: userInput.message },
       ],
       max_tokens: 500,
       temperature: 0.7,
       presence_penalty: 0.1,
       frequency_penalty: 0.1,
     };


     // Make request to OpenAI API
     const response = await fetch(apiUrl, {
       method: "POST",
       headers: {
         Authorization: `Bearer ${apiKey}`,
         "Content-Type": "application/json",
         "User-Agent": "L-Oreal-Beauty-Assistant/1.0",
       },
       body: JSON.stringify(requestBody),
     });


     // Check if OpenAI API request was successful
     if (!response.ok) {
       const errorData = await response.text();
       // Log error for debugging
       return new Response(
         JSON.stringify({
           error: `OpenAI API error: ${response.status}`,
           details: errorData,
         }),
         { status: response.status, headers: corsHeaders }
       );
     }


     const data = await response.json();
     const aiMessage = data.choices[0].message.content;


     return new Response(
       JSON.stringify({
         message: aiMessage,
       }),
       {
         headers: corsHeaders,
         status: 200,
       }
     );
   } catch (error) {
     // Log error for debugging
     return new Response(
       JSON.stringify({
         error: "Worker Error",
         details: error.message || error.toString(),
       }),
       { headers: corsHeaders, status: 500 }
     );
   }
 },
};


/*
DEPLOYMENT INSTRUCTIONS:


1. Go to Cloudflare Workers dashboard (workers.cloudflare.com)
2. Create a new Worker
3. Replace the default code with this code
4. In Settings > Environment Variables, add:
  - Variable name: OPENAI_API_KEY
  - Value: your-openai-api-key
5. Deploy the Worker
6. Copy the Worker URL and update it in script.js (CLOUDFLARE_WORKER_URL variable)
7. For production, update CORS origin from '*' to your specific domain


SECURITY FEATURES:
- API key is hidden from frontend users
- CORS protection
- Request validation
- Error handling with detailed error messages for debugging
- Rate limiting can be added if needed
*/


// Example request body
/*
{
 "messages": [
   { "role": "system", "content": "You are a helpful assistant." },
   { "role": "user", "content": "Hello!" }
 ]
}
*/


