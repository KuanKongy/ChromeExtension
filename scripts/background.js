
let lastWebsiteCheck = { isAmerican: false };
let cartItems = [];
const brandCache = {}; // Cache to store brand lookups
const OPENAI_API_KEY = "";
let americanBrands = ["nike", "tesla", "apple", "coca-cola", "ford", "amazon"];
console.log("Loaded American brands:", americanBrands);
chrome.storage.local.set({ americanBrands: americanBrands }, () => {
    console.log("American brands cached:", americanBrands);
});

function addCompanyToCache(companyName) {
    chrome.storage.local.get('americanBrands', (result) => {
        let cachedBrands = result.americanBrands || [];
        if (!cachedBrands.includes(companyName.toLowerCase())) {
            cachedBrands.push(companyName.toLowerCase());
            chrome.storage.local.set({ americanBrands: cachedBrands }, () => {
                console.log(`Added ${companyName} to cache.`);
            });
        } else {
            console.log(`${companyName} is already in the cache.`);
        }
    });
}

async function checkBrandswithCache(companyName) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('americanBrands', (result) => {
            let cachedBrands = result.americanBrands || [];
            if (companyName === undefined) {
                console.log("30: checkBrandswithCache brandName is undefined", cachedBrands);
                resolve(false);
                return;
            }
            let isAmerican = cachedBrands.some(brand => companyName.toLowerCase().includes(brand.toLowerCase()));
            console.log("34: checkBrandswithCache return values", cachedBrands, isAmerican);
            resolve(isAmerican);
        });
    });
}

async function checkBrandWithChatGPT(companyName) {
    if (brandCache[companyName] !== undefined) {
        return brandCache[companyName]; // Return cached result
    }

    const prompt = `Is the company "${companyName}" an American company? Ignore regional subsidiaries, country-specific websites, or locations. Only answer "yes" if the company's headquarters is in the United States; otherwise, answer "no". Respond with only "yes" or "no" and nothing else.`;

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
            //this section was to test without API key, when api fails it assumes the company is american, adds it to cache and returns true
            //console.log("65: test function, checkBrandWithGPT failed, add name to cache, get cache value and return", companyName);
            //addCompanyToCache(companyName);
            //return checkBrandswithCache(companyName);

            if (response.status === 429) {
                console.warn("Rate limit exceeded! Retrying after 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s & retry
                return await checkBrandWithChatGPT(companyName);
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
        //this is where it should be added to the cache. previous tester function should be there
        console.log("background.js: adding company name to cache");
        if(isAmerican){
            addCompanyToCache(companyName);
        }
        return isAmerican;

    } catch (error) {
        console.error("Error while calling OpenAI API:", error);
        return false;
    }
}

//main listener
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "checkWebsite") {
        console.log("102: main, times called", times_called);
        console.log("104: main, company name recieved", request.companyName);
        let companyName = request.companyName.toLowerCase();
        let isAmerican = await checkBrandswithCache(companyName);
        lastWebsiteCheck = { isAmerican: isAmerican};
        console.log("107: main, checking website status with cache", lastWebsiteCheck.isAmerican);
        if (!lastWebsiteCheck.isAmerican) {
            console.log(`108: main not found in cache. Checking with ChatGPT`);
            lastWebsiteCheck = { isAmerican: await checkBrandWithChatGPT(companyName) };
            console.log("110: main chatgpt returned. ", lastWebsiteCheck.isAmerican);
        }

        console.log("114: main, after cache and gpt", lastWebsiteCheck.isAmerican);

        if (!request.url.includes("amazon")) {
            cartItems = [];
        }
        sendResponse(lastWebsiteCheck);

    } else if (request.action === "getWebsiteStatus") {
        checkBrandswithCache()
        console.log("Getting website status:", lastWebsiteCheck);
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

