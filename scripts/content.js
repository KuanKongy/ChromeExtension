function getCompanyName() {
    let name =
        document.querySelector('meta[property="og:site_name"]')?.content ||
        document.querySelector('meta[name="application-name"]')?.content ||
        document.title;

    if (!name || name.trim() === "") {
        console.warn("Company name not found yet. Retrying...");
        setTimeout(getCompanyName, 500); // Retry after 500ms
        return;
    }

    name = name.replace(/(\.com|\.ca)$/i, '').trim().toLowerCase();

    console.log("Extracted company name:", name);

    chrome.runtime.sendMessage(
        { action: "checkWebsite", url: window.location.hostname, companyName: name },
        response => {
            console.log("Response from background:", response);
        }
    );
}

// Extract Cart Items
function extractCartItems() {
    let items = [];
    document.querySelectorAll(".sc-list-item").forEach(item => {
        let title = item.querySelector(".a-truncate-cut")?.innerText.trim();
        let asin = item.dataset.asin;

        if (title) {
            items.push({ title, asin });
        }
    });

    console.log("Extracted Cart Items:", items);
    chrome.runtime.sendMessage({ action: "checkCartItems", items });
}

// Run extractCartItems if Amazon (works only if .ca)
if (window.location.href.includes("amazon") && window.location.href.includes("/cart/")) {
    extractCartItems();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getCompanyName") {
        console.log("Received request for company name");
        getCompanyName();
        sendResponse({ message: "Company name retrieved!" });
    }
});

getCompanyName(); // Start function