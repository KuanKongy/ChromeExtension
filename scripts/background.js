let americanBrands = ["nike", "tesla", "apple", "coca-cola", "ford", "amazon"];
console.log("Loaded American brands:", americanBrands);
let lastWebsiteCheck = { isAmerican: false };
let cartItems = [];
const brandCache = {}; // Cache to store brand lookups, boolean
const promptCache = {}; // Cache to store brand lookups, string


chrome.storage.local.get("americanBrands", (result) => {
    let cachedBrands = result.americanBrands || [];
    let updatedBrands = Array.from(new Set([...cachedBrands, ...americanBrands])); // Merge and deduplicate
    chrome.storage.local.set({ americanBrands: updatedBrands }, () => {
        console.log("Updated cached American brands:", updatedBrands);
    });
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

async function checkBrandWithChatGPT(brandName, type) {
    if (brandCache[brandName] !== undefined) {
        console.log("found in cache:", brandName)
        return brandCache[brandName]; // Return cached result
    }

    const promptWeb = `Is the company "${brandName}" an American company? Ignore regional subsidiaries, country-specific websites, or locations. Only answer "yes" if the company's headquarters is in the United States; otherwise, answer "no". Respond with only "yes" or "no" and nothing else.`;
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

        if (!response.ok) {
            console.error("OpenAI API request failed:", response.status, response.statusText);

            if (response.status === 429) {
                console.warn("Rate limit exceeded! Retrying after 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s & retry
                return await checkBrandWithChatGPT(brandName, type);
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
        console.log(`background.js: adding company name to cache: "${brandName}"`);
        if(isAmerican){
            addCompanyToCache(brandName);
        }
        return isAmerican;

    } catch (error) {
        console.error("Error while calling OpenAI API:", error);
        return false;
    }
}

async function getSearchPromptFromChatGPT(brandName, type) {
    if (promptCache[brandName] !== undefined) {
        console.log("found in cache:", brandName)
        return promptCache[brandName]; // Return cached result
    }

    const promptSearch = `Generate an Amazon search prompt for alternatives to "${brandName}" and return only the search prompt, nothing else`;

    try {
        let response = "unknown";
        if (type === "search") {
            response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: promptSearch }],
                    max_tokens: 5,
                    temperature: 0.2, // Reduce randomness for consistent responses
                }),
            });
        }

        if (!response.ok) {
            console.error("OpenAI API request failed:", response.status, response.statusText);

            if (response.status === 429) {
                console.warn("Rate limit exceeded! Retrying after 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s & retry
                return await getSearchPromptFromChatGPT(brandName, type);
            }

            return false; // Default to "not American" on API failure
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            console.error("Unexpected OpenAI response:", data);
            return false;
        }

        const reply = data.choices[0].message?.content?.trim().toLowerCase();

        console.log(`Generated prompt ${brandName}: ${reply}`)

        promptCache[brandName] = reply; // Cache result
        return reply;

    } catch (error) {
        console.error("Error while calling OpenAI API:", error);
        return false;
    }
}

async function searchAmazonForAlternatives(query) {
    const body = {
        'source': 'amazon_search',
        'query': query,
        'parse': true,
        'domain': 'ca',
    };
    const authHeader = 'Basic ' + btoa(username + ':' + password);
    //'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
    try {
        const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            }
        });

        const result = await response.json();
        const finalRes = extractAsinsAndTitles(result);
        console.log(finalRes);
        return finalRes;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function extractAsinsAndTitles(data) {
    const results = data?.results[0]?.content?.results;
    if (!results) return [];

    const extractedItems = [];

    ['paid', 'organic'].forEach(category => {
        if (Array.isArray(results[category])) {
            results[category].forEach(item => {
                if (item.asin && item.title) {
                    extractedItems.push({ title: item.title, asin: item.asin });
                }
            });
        }
    });

    return extractedItems;
}

async function filterNonAmericanProducts(products) {
    const nonAmericanProducts = [];
    let count = 0;
    for (const product of products) {
        console.log("by title", product.title);
        const isAmerican = await checkBrandWithChatGPT(product.title, "web");
        if (!isAmerican) {
            nonAmericanProducts.push(product);
            count++;
            if (count === 5) {
                break;
            }
        }
    }
    return nonAmericanProducts;
}


chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "checkWebsite") {
        console.log("Checking company name:", request.companyName);
        let companyName = request.companyName.toLowerCase();
        lastWebsiteCheck = { isAmerican: americanBrands.some(brand => companyName.includes(brand.toLowerCase())) };
        lastWebsiteCheck = { isAmerican: await checkBrandswithCache(companyName)};

        if (!lastWebsiteCheck.isAmerican) {
            console.log(`Brand \"${companyName}\" not found in local database. Checking with ChatGPT...`);
            lastWebsiteCheck = { isAmerican: await checkBrandWithChatGPT(companyName, "web") };
            console.log("returned", lastWebsiteCheck.isAmerican);
        }

        console.log("Brand is American?", lastWebsiteCheck.isAmerican);

        if (!request.url.includes("amazon")) {
            cartItems = [];
            console.log("Cleared cart items");
        }

        sendResponse(lastWebsiteCheck);
    } else if (request.action === "getWebsiteStatus") {
        console.log("Getting website status:", lastWebsiteCheck.isAmerican);
        sendResponse(lastWebsiteCheck);
    } else if (request.action === "checkCartItems") {
        console.log("Checking cart items:", request.items);

        cartItems = request.items.filter(item =>
            americanBrands.some(brand => item.title.toLowerCase().includes(brand.toLowerCase()))
        );

        if (cartItems.length !== request.items.length) {
            const uncheckedItems = request.items.filter(item => 
                !cartItems.some(cartItem => cartItem.title.toLowerCase() === item.title.toLowerCase())
            );

            console.log(`Items not found in local database. Checking with ChatGPT...`, uncheckedItems);

            const results = await Promise.all(
                uncheckedItems.map(async item => {
                    const isAmerican = await checkBrandWithChatGPT(item.title, "cart");
                    return { item, isAmerican };
                })
            );

            const newItems = results.filter(result => result.isAmerican).map(result => result.item);
            cartItems.push(...newItems);
        }

        const nonAmericanAlternatives = {};
        if (cartItems.length !== 0) {
            for (const item of cartItems) {
                const alternativePrompt = await getSearchPromptFromChatGPT(item.title, "search");
                const searchResults = await searchAmazonForAlternatives(alternativePrompt);
                const nonAmericanItems = await filterNonAmericanProducts(searchResults);
                nonAmericanAlternatives[item.title] = nonAmericanItems;
            }
        }

        console.log("US cart items:", cartItems);
        console.log("Alternatives:", nonAmericanAlternatives);
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