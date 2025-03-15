let americanBrands = ["nike", "tesla", "apple", "coca-cola", "ford", "amazon"];
console.log("Loaded American brands:", americanBrands);
let lastWebsiteCheck = { isAmerican: false };
let cartItems = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkWebsite") {
        console.log("Checking company name:", request.companyName);
        lastWebsiteCheck = { isAmerican: americanBrands.some(brand => request.companyName.toLowerCase().includes(brand.toLowerCase())) };
        console.log(lastWebsiteCheck.isAmerican);

        // If user is on a non-Amazon site, clear cart items
        if (!request.url.includes("amazon")) {
            cartItems = [];
            console.log("cleared cart");
        }

        sendResponse(lastWebsiteCheck);
    } 
    else if (request.action === "getWebsiteStatus") {
        console.log("Getting website status:", lastWebsiteCheck.isAmerican);
        sendResponse(lastWebsiteCheck);
    } 
    else if (request.action === "checkCartItems") {
        console.log("Checking cart items:", request.items);
        cartItems = request.items.filter(item =>
            americanBrands.some(brand => item.title.toLowerCase().includes(brand.toLowerCase()))
        );
        console.log(cartItems);
        sendResponse({ americanItems: cartItems });
    } 
    else if (request.action === "getCartItems") {
        console.log("Getting cart items:", cartItems);
        sendResponse({ americanItems: cartItems });
    }
});

chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab.url && tab.url.startsWith("http")) {
            console.log("Tab switched to:", tab.url);

            chrome.scripting.executeScript({
                target: { tabId: activeInfo.tabId },
                files: ["scripts/content.js"]
            }).catch(err => console.warn("Script injection failed:", err));
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
        console.log("Page loaded or updated:", tab.url);

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["scripts/content.js"]
        }).catch(err => console.warn("Script injection failed:", err));
    }
});

