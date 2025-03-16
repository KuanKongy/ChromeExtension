// Request Website Status
//✅
chrome.runtime.sendMessage({ action: "getWebsiteStatus" }, response => {
    format(response);
});
// Listen for messages from the background script

chrome.runtime.sendMessage({ action: "getWebsiteStatus" }, response => {
    const selectedCountry = response.selected_country;
    const countrySelect = document.getElementById("country-select");
    countrySelect.value = selectedCountry;
    console.log("Selected country set to:", selectedCountry);
});

function format(response) {
    let websiteResult = document.getElementById("website-result");
    let country = response.selected_country;
    let countryName = country.charAt(0).toUpperCase() + country.slice(1);
    let countryImage = `../icons/${country}.png`;
    console.log("format:", response);
    if (response && response.located_in_country) {
        websiteResult.innerHTML = `<p><img class='list-img' src='${countryImage}'/> This website is from ${countryName}!</p>`;
    } else {
        websiteResult.innerHTML = `<img class='list-img' src='${countryImage}'/> This website is NOT from ${countryName}.`;
    }
}
/*
// Request Shopping Cart Analysis
chrome.runtime.sendMessage({ action: "getCartItems" }, response => {
    let cartResult = document.getElementById("cart-result");

    if (response && response.americanItems.length > 0) {
        cartResult.innerHTML = "<h3>These items might be American:</h3>";
        response.americanItems.forEach(item => {
            cartResult.innerHTML += `<p>❌ ${item.title}</p>`;
        });
    } else {
        cartResult.innerText = "✅ No American items detected in your cart!";
    }
});*/
/*❌*/

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let currentTab = tabs[0];
    let popupContainer = document.querySelector(".popup-container");
    if (currentTab && currentTab.url.includes("amazon")) {
        // If on Amazon, check cart items
        chrome.runtime.sendMessage({ action: "getCartItems" }, response => {
            let cartResult = document.getElementById("cart-result");
            let websiteResult = document.getElementById("website-result");
            if (response && response.countriesItems.length > 0) {
                cartResult.innerHTML = "<h3>Shopping cart check:</h3>";
                response.countriesItems.forEach(item => {
                    cartResult.innerHTML += `<p><img class='list-img' src='../icons/america.png'/> ${item.title}</p>`;
                });
            } else {
                cartResult.innerHTML = "<h3>Shopping cart check:</h3>";
                cartResult.innerHTML += "<p>✅ No American items detected in your cart!</p>";
            }
            popupContainer.style.height = "230px";  // Set a default height if there's no content
        });
    }
});

document.getElementById("settings").addEventListener("click", () => {
    const settingsContainer = document.getElementById("settings-container");
    if (settingsContainer.style.display === "none") {
        settingsContainer.style.display = "block";
    } else {
        settingsContainer.style.display = "none";
    }
});

document.getElementById("country-select").addEventListener("input", async (event) => {
    const selectedCountry = event.target.value;
    console.log("Selected country:", selectedCountry);

    // Send the selected country to the background script
    const setSelectedCountry = () => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "setSelectedCountry", country: selectedCountry }, (response) => {
                console.log("Response from background:", response);
                resolve(response);
            });
        });
    };
    // Wait for the selected country to be set
    await setSelectedCountry();
    // Send a message to the content script and wait for the response
    const getCompanyName = () => {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "getCompanyName" }, (response) => {
                    console.log("Response from content script:", response);
                    resolve(response);
                });
            });
        });
    };
    // Wait for the company name to be retrieved
    await getCompanyName();
    console.log("107: comapny name retrieved about to get website status");
    // Request the updated website status
    await new Promise(resolve => setTimeout(resolve, 200)); // 2 seconds delay

    chrome.runtime.sendMessage({ action: "getWebsiteStatus" }, response => {
        console.log("Response from background to getWebsiteStatus:");
        format(response);
    });
    // Close the settings menu
    const settingsContainer = document.getElementById("settings-container");
    settingsContainer.style.display = "none";
});



document.getElementById("dismiss").addEventListener("click", () => {
    window.close();
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
