let americanBrands = ["nike", "tesla", "apple", "coca-cola", "ford"];
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