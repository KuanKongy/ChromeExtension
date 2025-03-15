let Brands = {"nike":"america", "tesla":"america", "apple":"america", "coca-cola":"america", "ford":"america", "amazon":"america"};
console.log("Loaded brands:", Brands);
let lastWebsiteCheck = { located_in_country: false };
let cartItems = [];
const brandCache = {}; // Cache to store brand lookups
const OPENAI_API_KEY = "key";
let selected_country = "america";

chrome.storage.local.get("Brands", (result) => {
    let cachedBrands = result.Brands || {};
    let updatedBrands = { ...cachedBrands, ...Brands }; // Merge dictionaries
    chrome.storage.local.set({ Brands: updatedBrands }, () => {
        console.log("Updated cached brands:", updatedBrands);
    });
});


function addCompanyToCache(companyName) {
    chrome.storage.local.get('Brands', (result) => {
        let cachedBrands = result.Brands || {};
        let companyKey = companyName.toLowerCase();
        if (!cachedBrands.hasOwnProperty(companyKey)) {
            cachedBrands[companyKey] = selected_country;
            chrome.storage.local.set({ Brands: cachedBrands }, () => {
                console.log(`Added ${companyName} with country ${selected_country} to cache.`);
            });
        } else {
            console.log(`${companyName} is already in the cache.`);
        }
    });
}

async function checkBrandswithCache(companyName) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('Brands', (result) => {
            let cachedBrands = result.Brands || {};
            if (companyName === undefined) {
                console.log("30: checkBrandswithCache brandName is undefined", cachedBrands);
                resolve(false);
                return;
            }
            let located_in_country = cachedBrands.hasOwnProperty(companyName.toLowerCase()) && cachedBrands[companyName.toLowerCase()] === selected_country;
            console.log("34: checkBrandswithCache return values", cachedBrands, located_in_country);
            resolve(located_in_country);
        });
    });
}

async function checkBrandWithChatGPT(brandName, type) {
    if (brandCache[brandName] !== undefined) {
        console.log("found in cache:", brandName)
        return brandCache[brandName]; // Return cached result
    }

    const promptWeb = `Is the company "${brandName}" a company located in ${selected_country}? Ignore regional subsidiaries, country-specific websites, or locations. Only answer "yes" if the company's headquarters is in the United States; otherwise, answer "no". Respond with only "yes" or "no" and nothing else.`;
    const promptCart = `Is the company that owns and controls the brand "${brandName}" headquartered in the United States? Focus only on the ultimate parent company that has controlling ownership over the brand.

- Ignore manufacturers, product names, subsidiaries, distributors, regional offices, country-specific websites, or retail locations. 
- Answer "yes" only if the official headquarters of the ultimate parent company is in the United States.
- Answer "no" if the ultimate parent company's headquarters is located in any other country, even if the brand's products are sold or manufactured in the United States.
- If there is no clear information about the parent company's headquarters, answer "unknown" instead of guessing.

Respond with only "yes", "no", or "unknown", and nothing else.`;

    try {
        let response = "unknown";
        if (type === "web") {
            response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: promptWeb }],
                    max_tokens: 5,
                    temperature: 0.2, // Reduce randomness for consistent responses
                }),
            });
        } else if (type === "cart") {
            response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: promptCart }],
                    max_tokens: 5,
                    temperature: 0.2, // Reduce randomness for consistent responses
                }),
            });
        }
        console.log("ChatGPT says:", response);

        if (!response.ok) {
            console.error("OpenAI API request failed:", response.status, response.statusText);
            //delete after
            addCompanyToCache(brandName);
            return checkBrandswithCache(brandName);
            if (response.status === 429) {
                console.warn("Rate limit exceeded! Retrying after 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s & retry
                return await checkBrandWithChatGPT(brandName);
            }

            return false; // Default to "not" on API failure
        }

        const data = await response.json();

        console.log("ChatGPT says data:", data);

        if (!data.choices || data.choices.length === 0) {
            console.error("Unexpected OpenAI response:", data);
            return false;
        }

        const reply = data.choices[0].message?.content?.trim().toLowerCase();
        console.log(`ChatGPT says data: ${reply}, ${type}`);
        const located_in_country = reply.includes("yes");
        console.log(`ChatGPT says data: ${located_in_country}, ${type}`);

        brandCache[brandName] = located_in_country; // Cache result
        console.log("background.js: adding company name to cache");
        if(located_in_country){
            addCompanyToCache(brandName);
        }
        return located_in_country;

    } catch (error) {
        console.error("Error while calling OpenAI API:", error);
        return false;
    }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "checkWebsite") {

        console.log("Checking company name:", request.companyName);
        let companyName = request.companyName.toLowerCase();
        //cache value
        chrome.storage.local.set({ currentCompanyName: companyName }, () => {
            console.log(`Stored company name: ${companyName}`);
        });

        lastWebsiteCheck = {located_in_country: await checkBrandswithCache(companyName)};

        if (!lastWebsiteCheck.located_in_country) {
            console.log(`Brand \"${companyName}\" not found in local database. Checking with ChatGPT...`);
            lastWebsiteCheck = {located_in_country: await checkBrandWithChatGPT(companyName, "web")};
            console.log("returned", lastWebsiteCheck.located_in_country);
            // if (lastWebsiteCheck.located_in_country) {
            //     Brands.push(companyName);
            // }
        }
        console.log(`Brand is in country ${selected_country}?`, lastWebsiteCheck.located_in_country);
        if (!request.url.includes("amazon")) {
            cartItems = [];
            console.log("Cleared cart items");
        }
        console.log("unique text before update popup");
        // Send response back to the popup
        sendResponse(lastWebsiteCheck);
    } else if (request.action === "getWebsiteStatus") {
        console.log("Getting website status:", lastWebsiteCheck.located_in_country);
        // Send response back to the popup
        sendResponse({located_in_country: lastWebsiteCheck.located_in_country, selected_country: selected_country});


    } else if (request.action === "getWebsiteStatusUpdated") {
        chrome.storage.local.get('currentCompanyName', (result) => {
            if (result.currentCompanyName) {
                console.log(`Retrieved stored company name: ${result.currentCompanyName}`);
                companyName = result.currentCompanyName;
            } else {
                console.log("No company name stored.");

            }
        });
        selected_country = request.country;
        console.log("Checking company name in updated status:", request.companyName);
        lastWebsiteCheck = {located_in_country: await checkBrandswithCache(companyName)};

        if (!lastWebsiteCheck.located_in_country) {
            console.log(`Brand \"${companyName}\" not found in local database. Checking with ChatGPT...`);
            lastWebsiteCheck = {located_in_country: await checkBrandWithChatGPT(companyName, "web")};
            console.log("returned", lastWebsiteCheck.located_in_country);
        }
        console.log(`Brand is in country ${selected_country}?`, lastWebsiteCheck.located_in_country);

        console.log("Getting updated website status:", lastWebsiteCheck.located_in_country);
        // Send response back to the popup
        sendResponse({located_in_country: lastWebsiteCheck.located_in_country, selected_country: selected_country});


    } else if (request.action === "checkCartItems") {
        console.log("Checking cart items:", request.items);

        cartItems = request.items.filter(item =>
            Brands.some(brand => item.title.toLowerCase().includes(brand.toLowerCase()))
        );

        if (cartItems.length != request.items.length) {
            const uncheckedItems = request.items.filter(item =>
                !cartItems.some(cartItem => cartItem.title.toLowerCase() === item.title.toLowerCase())
            );

            console.log(`Items not found in local database. Checking with ChatGPT...`, uncheckedItems);

            const results = await Promise.all(
                uncheckedItems.map(async item => {
                    const located_in_country = await checkBrandWithChatGPT(item.title, "cart");
                    return {item, located_in_country};
                })
            );

            const newItems = results.filter(result => result.located_in_country).map(result => result.item);
            //console.log("returned", newItems);
            //console.log("before push", cartItems);
            cartItems.push(...newItems);
            //console.log("after push", cartItems);
        }

        console.log("US cart items:", cartItems);
        sendResponse({americanItems: cartItems});
    } else if (request.action === "getCartItems") {
        console.log("Getting cart items:", cartItems);
        sendResponse({americanItems: cartItems});

    } else if (request.action === "setSelectedCountry") {
        selected_country = request.country;
        chrome.storage.local.set({selected_country}, () => {
            console.log(`Selected country set to ${selected_country}`);
            sendResponse({success: true});
        });
        return true
    }
});

function getCachedCompanyName(companyName, callback) {
    // Check in-memory cache first
    if (brandCache.hasOwnProperty(companyName)) {
        console.log(`Found ${companyName} in in-memory cache.`);
        callback(brandCache[companyName]);
        return;
    }
    // Check local storage cache
    chrome.storage.local.get('Brands', (result) => {
        let cachedBrands = result.Brands || {};
        if (cachedBrands.hasOwnProperty(companyName.toLowerCase())) {
            console.log(`Found ${companyName} in local storage cache.`);
            callback(cachedBrands[companyName.toLowerCase()]);
        } else {
            console.log(`${companyName} not found in cache.`);
            callback(null);
        }
    });
}

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