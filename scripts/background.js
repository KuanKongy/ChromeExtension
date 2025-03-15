let americanBrands = ["nike", "tesla", "apple", "coca-cola", "ford", "amazon"];
console.log("Loaded American brands:", americanBrands);
let lastWebsiteCheck = { isAmerican: false };
let cartItems = [];
const brandCache = {}; // Cache to store brand lookups
const OPENAI_API_KEY = "";

async function checkBrandWithChatGPT(brandName) {
    if (brandCache[brandName] !== undefined) {
        return brandCache[brandName]; // Return cached result
    }

    const prompt = `Is the company "${brandName}" an American company? Ignore regional subsidiaries, country-specific websites, or locations. Only answer "yes" if the company's headquarters is in the United States; otherwise, answer "no". Respond with only "yes" or "no" and nothing else.`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 5,
                temperature: 0.2, // Reduce randomness for consistent responses
            }),
        });

        if (!response.ok) {
            console.error("OpenAI API request failed:", response.status, response.statusText);

            if (response.status === 429) {
                console.warn("Rate limit exceeded! Retrying after 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s & retry
                return await checkBrandWithChatGPT(brandName);
            }

            return false; // Default to "not American" on API failure
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            console.error("Unexpected OpenAI response:", data);
            return false;
        }

        const reply = data.choices[0].message?.content?.trim().toLowerCase();
        const isAmerican = reply.includes("yes");

        brandCache[brandName] = isAmerican; // Cache result
        return isAmerican;

    } catch (error) {
        console.error("Error while calling OpenAI API:", error);
        return false;
    }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "checkWebsite") {
        console.log("Checking company name:", request.companyName);
        let companyName = request.companyName.toLowerCase();
        lastWebsiteCheck = { isAmerican: americanBrands.some(brand => companyName.includes(brand.toLowerCase())) };

        if (!lastWebsiteCheck.isAmerican) {
            console.log(`Brand \"${companyName}\" not found in local database. Checking with ChatGPT...`);
            lastWebsiteCheck = { isAmerican: await checkBrandWithChatGPT(companyName) };
            console.log("returned", lastWebsiteCheck.isAmerican);
            if (lastWebsiteCheck.isAmerican) {
                americanBrands.push(companyName);
            }
        }

        console.log("Brand is American?", lastWebsiteCheck.isAmerican);

        if (!request.url.includes("amazon")) {
            cartItems = [];
            console.log("Cleared cart items");
        }

        sendResponse(lastWebsiteCheck);
    } else if (request.action === "getWebsiteStatus") {
        console.log("Getting cart items:", cartItems);
        sendResponse(lastWebsiteCheck);
    } else if (request.action === "checkCartItems") {
        console.log("Checking cart items:", cartItems);

        cartItems = request.items.filter(item =>
            americanBrands.some(brand => item.title.toLowerCase().includes(brand.toLowerCase()))
        );
        console.log("US cart items:", cartItems);
        sendResponse({ americanItems: cartItems });
    } else if (request.action === "getCartItems") {
        console.log("Getting cart items:", cartItems);
        sendResponse({ americanItems: cartItems });
    }
    else if (request.action === "checkBrandStatus") {
        let brandName = request.brandName.toLowerCase();
        console.log("brandName: ", brandName);
        let american = { isAmerican: americanBrands.some(brand => brandName.includes(brand.toLowerCase())) };
        sendResponse(american);
    }
});

const injectScript = (tabId) => {
    chrome.scripting.executeScript({
        target: { tabId },
        files: ["scripts/content.js"],
    }).catch(err => console.warn("Script injection failed:", err));
};

chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab.url && tab.url.startsWith("http")) {
            console.log("Tab switched to:", tab.url);
            injectScript(activeInfo.tabId);
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
        console.log("Page loaded or updated:", tab.url);
        injectScript(tabId);
    }
});

