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
            let altResult = document.getElementById("alternative-result");

            if (response && response.countriesItems.length > 0) {
                cartResult.innerHTML = "<h3>Shopping cart check:</h3>";
                console.log("response: ", response);
                console.log("alt response: ", response.alternatives);
                const keys = Object.keys(response.alternatives);
                console.log("key: ", keys);
                response.countriesItems.forEach(item => {
                    cartResult.innerHTML += `<p><img class='list-img' src='../icons/america.png'/> ${item.title}</p>`;
                });

                for (const item_name of keys) {  // Use 'of' to iterate over array values
                    const alternatives = response.alternatives[item_name]; // Get the alternatives array
                    if (Array.isArray(alternatives)) {  // Ensure it's an array
                        altResult.innerHTML += `
                            <h3>
                                alternatives for ${item_name}:
                            </h3> 
                        `;
                        for (const alt of alternatives) {
                            altResult.innerHTML += `
                            <p>
                                ✅ ${alt.title}
                            </p>`;
                            console.log(`Alternative for ${item_name}: ${alt.title} (ASIN: ${alt.asin})`);
                        }
                    } else {
                        console.log(`No alternatives found for ${item_name}`);
                    }
                }
            } else {
                cartResult.innerHTML = "<h3>Shopping cart check:</h3>";
                cartResult.innerHTML += "<p>✅ No American items detected in your cart!</p>";
            }
            popupContainer.style.height = "230px";  // Set a default height if there's no content
        });
    }
});
document.getElementById("search-button").addEventListener("click", () => {
    let searchResult = document.getElementById("search-input");
    let searchText = searchResult.value;
    console.log("searchText: ", searchText);
    if(searchText.trim() !== "") {
        chrome.runtime.sendMessage({ action: "checkBrandStatus", companyName : searchText.toLowerCase() }, response => {
            let brandResult = document.getElementById("brand-result");
            brandResult.innerHTML = "<h3>Brand Check:</h3>"
            console.log("response: ", response);
            searchText = searchText.toLowerCase();
            if (searchText === "apple" || searchText === "amazon" || searchText === "tesla" || searchText === "ford" || searchText === "nike") {
                brandResult.innerHTML += `
                <span class = 'list-item'>
                    <p>
                    ${searchText} is American! 
                    </p>
                    <button class = 'save'>&#8942;</button>
                    <div class = 'save-popup'>
                       <button id = "fav" data-brand = "${searchText}">Add to favourites</button> 
                    </div>
                </span>
                `;
            } else {
                brandResult.innerHTML += `
                <span class = 'list-item'>
                    <p>
                    ${searchText} is NOT American.
                    </p>
                    <button class = 'save'>️&#8942;</button>
                    <div class = "save-popup">
                        <button id = "fav" data-brand="${searchText}">Add to favourites</button>
                    </div>
                </span>
                `;
            }
        });
    }
})
    /*
document.getElementById("search-button").addEventListener("click", async () => {
    let searchResult = document.getElementById("search-input");
    let searchText = searchResult.value.trim(); // Trim whitespace
    console.log("searchText: ", searchText);

    if (searchText !== "") {
        try {
            let response = await sendMessagePromise({ action: "checkBrandStatus", companyName: searchText.toLowerCase() });

            console.log("✅ Response received:", response);
            let brandResult = document.getElementById("brand-result");
            brandResult.innerHTML = "<h3>Brand Check:</h3>";

            if (response && response.located_in_country) {
                brandResult.innerHTML += 
                <span class='list-item'>
                    <p>${searchText} is American!</p>
                    <button class='save'>&#8942;</button>
                    <div class='save-popup'>
                        <button id="fav" data-brand="${searchText}">Add to favourites</button> 
                    </div>
                </span>
                ;
            } else {
                brandResult.innerHTML += 
                <span class='list-item'>
                    <p>${searchText} is NOT American.</p>
                    <button class='save'>&#8942;</button>
                    <div class='save-popup'>
                        <button id="fav" data-brand="${searchText}">Add to favourites</button>
                    </div>
                </span>
                ;
            }
        } catch (error) {
            console.error("❌ Error:", error);
        }
    }
});*/
// ✅ Wrap sendMessage in a Promise
function sendMessagePromise(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}


document.body.addEventListener('click', function(event) {
    // Check if the clicked element is the "save" button
    if (event.target && event.target.classList.contains("save")) {
        let button = event.target;
        console.log("save clicked");

        let listItem = event.target.closest('.list-item');

        let popup = listItem.querySelector('.save-popup');
        // Toggle the "show" class on the popup
        popup.classList.toggle("show");
    }
     if (event.target && event.target.id === "fav") {
        // Save the searchText
        let searchText = event.target.getAttribute('data-brand');
        console.log("Add to favourites button clicked!");
        console.log("searchText is: ", searchText);
        // Toggle the "show" class on the popup
        let listItem = event.target.closest('.list-item');

        // Find the associated popup (which is the parent div)
        let popup = listItem.querySelector('.save-popup');

        // Remove the "show" class to hide the popup
        popup.classList.remove("show");
        chrome.storage.local.get("favourite", function(result) {
            let brands = result.favourite || [];
            console.log("brands: ", brands);
            if (!brands.includes(searchText)) {
                brands.push(searchText);
            } else {
                console.log("Brand already in the list");
            }
            chrome.storage.local.set({favourite : brands}, function() {
                console.log("favourited new brand: ", searchText);
            });
            // updating the list immediately after adding to array
            let listElement = document.getElementById("fav-selector");
            listElement.innerHTML = "";
            brands.forEach(brand => {
                let option = document.createElement("option"); // Create a new option element
                option.textContent = brand; // Set the option text to the brand name
                listElement.appendChild(option); // Append the option to the select elemen 
            });
        });
    }
});

chrome.storage.local.get("favourite", function(result) {
        if(result.favourite) {
            let favList = result.favourite;
            let listElement = document.getElementById("fav-selector");
            listElement.innerHTML = "";
            favList.forEach(brand => {
                let option = document.createElement("option"); // Create a new option element
                option.textContent = brand; // Set the option text to the brand name
                option.value = brand;
                listElement.appendChild(option); // Append the option to the select elemen 
            });
        } else {
            console.log("no brands favourited")
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
                console.log("Response from background setSelectedCountry:", response);
                resolve(response);
            });
        });
    };
    // Wait for the selected country to be set
    await setSelectedCountry();
    //await new Promise(resolve => setTimeout(resolve, 200)); // 2 seconds delay
    // Send a message to the content script and wait for the response
    const getCompanyName = () => {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "getCompanyName" }, (response) => {
                    console.log("Response from content script getCompanyName:", response);
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

    // chrome.runtime.sendMessage({ action: "getWebsiteStatus" }, response => {
    //     console.log("Response from background to getWebsiteStatus:");
    //     format(response);
    // });
    const getWebsiteStatus = () => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "getWebsiteStatus" }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    console.log("Response from background to getWebsiteStatus:", response);
                    resolve(response);
                }
            });
        });
    };

    let websiteStatus = await getWebsiteStatus();
    format(websiteStatus);
    // Close the settings menu
    const settingsContainer = document.getElementById("settings-container");
    settingsContainer.style.display = "none";
});



/*document.getElementById("dismiss").addEventListener("click", () => {
    window.close();
});*/

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


document.getElementById("remove-fav").addEventListener("click", function() {
    let selectElement = document.getElementById("fav-selector");
    let selectedValue = selectElement.value; // Get the selected value

    if (selectedValue) {
        // Loop through all options in the select element
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === selectedValue) {
                selectElement.remove(i); // Remove the selected option
                break; // Exit the loop once the option is removed
            }
        }

        // Optionally, you can also update your local storage to reflect the change
        let updatedFavourites = [];
        // Loop through all the remaining options and get their values
        for (let i = 0; i < selectElement.options.length; i++) {
            updatedFavourites.push(selectElement.options[i].value);
        }

        // Save the updated favourites to local storage (or update as needed)
        chrome.storage.local.set({ "favourite": updatedFavourites });

        console.log("Removed:", selectedValue); // Log the removed brand
    } else {
        alert("Please select a favourite to remove.");
    }
});