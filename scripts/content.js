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

getCompanyName(); // Start function