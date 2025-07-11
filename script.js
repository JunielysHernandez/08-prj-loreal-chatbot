/* DOM elements */
// Set initial message
/* Handle form submit */
// Show message
/*
 * L'Oréal Beauty Assistant Chatbot
 * Secure chatbot using OpenAI API through Cloudflare Worker
 * Only responds to L'Oréal and beauty-related questions
 */

/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

/* Configuration */
// Replace this URL with your Cloudflare Worker endpoint
const workersURL = "https://beauty-assistant.herna954.workers.dev/";

// The URL of your Cloudflare Worker (replace with your actual Worker URL)
const CLOUDFLARE_WORKER_URL = "https://beauty-assistant.herna954.workers.dev/";

/* System prompt to ensure L'Oréal-focused responses */
const SYSTEM_PROMPT = `You are a L'Oréal Beauty Assistant. You can ONLY answer questions about:
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

/* Message history for conversation context */
let messageHistory = [{ role: "system", content: SYSTEM_PROMPT }];

/* Initialize chat and handle quick-reply buttons */
function initializeChat() {
  // Add initial messages
  addMessage("Hello! I'm your L'Oréal Beauty Assistant. 💄✨", "ai");
  addMessage(
    "I can help you with L'Oréal products, beauty routines, skincare advice, and makeup tips. What would you like to know?",
    "ai"
  );

  // Set up quick-reply buttons
  const quickReplyButtons = document.querySelectorAll(".quick-reply-btn");
  quickReplyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const message = button.dataset.message;

      // Disable all quick-reply buttons temporarily
      quickReplyButtons.forEach((btn) => (btn.disabled = true));

      // Send the message
      await handleUserMessage(message);

      // Re-enable quick-reply buttons
      quickReplyButtons.forEach((btn) => (btn.disabled = false));
    });
  });
}

/* Handle user message submission */
async function handleUserMessage(message) {
  // Disable input and send button
  sendBtn.disabled = true;
  userInput.disabled = true;

  // Add user message to chat
  addMessage(message, "user");

  // Clear input if it was a text input (not a quick-reply)
  if (userInput.value === message) {
    userInput.value = "";
  }

  // Show loading indicator
  showLoading();

  try {
    // Get AI response
    const aiResponse = await sendToOpenAI(message);

    // Hide loading and show response
    hideLoading();
    addMessage(aiResponse, "ai");
  } catch (error) {
    hideLoading();
    addMessage("Sorry, I encountered an error. Please try again!", "ai");
  }

  // Re-enable input and send button
  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.focus();
}

/* Add message to chat window */
function addMessage(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `msg ${sender}`;
  messageDiv.textContent = text;
  chatWindow.appendChild(messageDiv);

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Add loading indicator */
function showLoading() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai loading";
  loadingDiv.textContent = "Thinking about your beauty question...";
  loadingDiv.id = "loading-message";
  chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Remove loading indicator */
function hideLoading() {
  const loadingMsg = document.getElementById("loading-message");
  if (loadingMsg) {
    loadingMsg.remove();
  }
}

/* Check if question is L'Oréal/beauty related */
function isBeautyRelated(question) {
  const beautyKeywords = [
    "loreal",
    "l'oreal",
    "makeup",
    "skincare",
    "beauty",
    "cosmetics",
    "foundation",
    "lipstick",
    "mascara",
    "shampoo",
    "conditioner",
    "hair",
    "skin",
    "face",
    "routine",
    "product",
    "cream",
    "serum",
    "moisturizer",
    "cleanser",
    "toner",
    "primer",
    "concealer",
    "eyeshadow",
    "blush",
    "bronzer",
    "powder",
    "nail",
    "perfume",
    "fragrance",
    "anti-aging",
    "acne",
    "wrinkle",
    "hydrating",
  ];

  const lowerQuestion = question.toLowerCase();
  return beautyKeywords.some((keyword) => lowerQuestion.includes(keyword));
}

/* Send message to OpenAI via Cloudflare Worker */
async function sendToOpenAI(userMessage) {
  try {
    // Check if question seems beauty-related
    if (!isBeautyRelated(userMessage)) {
      return "I'm here to help with L'Oréal products and beauty questions! Please ask me about skincare routines, makeup tips, hair care, or specific L'Oréal products. What beauty topic can I assist you with today? 💄";
    }

    // Add user message to history
    messageHistory.push({ role: "user", content: userMessage });

    // Prepare request for Cloudflare Worker - just send the message
    const requestBody = {
      message: userMessage,
    };

    // Make request to Cloudflare Worker
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Worker error:", errorData);
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();

    // Extract AI response
    const aiResponse = data.message || data.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("Invalid response format from Worker");
    }

    // Add AI response to message history
    messageHistory.push({ role: "assistant", content: aiResponse });

    // Keep conversation history manageable (last 10 exchanges + system prompt)
    if (messageHistory.length > 21) {
      messageHistory = [messageHistory[0], ...messageHistory.slice(-20)];
    }

    return aiResponse;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return "I apologize, but I'm having trouble connecting right now. Please try again in a moment. In the meantime, feel free to visit loreal.com for product information! 🌟";
  }
}

/* Handle form submission */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  await handleUserMessage(message);
});

/* Handle Enter key in input */
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

/* Initialize when page loads */
document.addEventListener("DOMContentLoaded", () => {
  initializeChat();
  userInput.focus();
});
