let americanBrands = ["nike", "tesla", "apple", "coca-cola", "ford", "amazon"];
console.log("Loaded American brands:", americanBrands);
let isAmerican = false;


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkWebsite") {
        console.log("getWebsiteStatus reached, will return true")
        checkWebsiteOrigin(request.companyName, sendResponse);
        return true;
    } else if (request.action === "getWebsiteStatus") {
        // Example response, you need to implement the actual logic

        sendResponse({ isAmerican: false });
    }
});

function checkWebsiteOrigin(companyName, sendResponse) {
    console.log("Checking company name:", companyName);
    if (companyName) {
        isAmerican = americanBrands.some(brand => companyName.toLowerCase().includes(brand.toLowerCase()));   
    }
    console.log("got there");
    console.log(isAmerican);
    sendResponse({ isAmerican });
}

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