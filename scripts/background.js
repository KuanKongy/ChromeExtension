// Define American brands directly in the script
let americanBrands = ["nike", "tesla", "apple", "coca-cola", "ford"];
console.log("Loaded American brands:", americanBrands);


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkWebsite") {
        console.log("getWebsiteStatus reached, will return true")
        checkWebsiteOrigin(request.companyName, sendResponse);
        return true; // Keep the message channel open for sendResponse
    } else if (request.action === "getWebsiteStatus") {
        // Example response, you need to implement the actual logic

        sendResponse({ isAmerican: false });
    }
});

function checkWebsiteOrigin(companyName, sendResponse) {
    console.log("hi");
    console.log("Checking company name:", companyName);

    let isAmerican = americanBrands.includes(companyName);
    console.log(isAmerican);
    sendResponse({ isAmerican });
}