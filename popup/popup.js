// Request Website Status
//✅
chrome.runtime.sendMessage({ action: "getWebsiteStatus" }, response => {
    let websiteResult = document.getElementById("website-result");
    if (response && response.isAmerican) {
        websiteResult.innerHTML = "<p><img class = 'list-img' src = '../icons/american.png'/> This website is American!</p>";
    } else {
        websiteResult.innerHTML = "<img class = 'list-img' src = '../icons/canada.png'/> This website is NOT American.";
    }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let currentTab = tabs[0];
    let popupContainer = document.querySelector(".popup-container");
    if (currentTab && currentTab.url.includes("amazon")) {
        // If on Amazon, check cart items
        chrome.runtime.sendMessage({ action: "getCartItems" }, response => {
            let cartResult = document.getElementById("cart-result");
            let websiteResult = document.getElementById("website-result");
            let altResult = document.getElementById("alternative-result");
            if (response && response.americanItems.length > 0) {
                console.log("response: ", response);
                console.log("alt response: ", response.alternatives);
                const keys = Object.keys(response.alternatives);
                console.log("key: ", keys);
                cartResult.innerHTML = "<h3>Shopping cart check:</h3>";
                response.americanItems.forEach(item => {
                    cartResult.innerHTML += `<p><img class='list-img' src='../icons/american.png'/>
                    ${item.title}</p>`;
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
            popupContainer.style.height = "230px"; // height if on the amazon website
        });
    } 
});

// manually searching if a brand is american or not
document.getElementById("search-button").addEventListener("click", () => {
    let searchResult = document.getElementById("search-input");
    let searchText = searchResult.value;
    console.log("searchText: ", searchText);
    if(searchText.trim() !== "") {
        chrome.runtime.sendMessage({ action: "checkBrandStatus", brandName : searchText.toLowerCase() }, response => {
            let brandResult = document.getElementById("brand-result");
            brandResult.innerHTML = "<h3>Brand Check:</h3>"
            if (response && response.isAmerican) {
                brandResult.innerHTML += `
                <span class = 'list-item'>
                    <p>
                    <img class = 'list-img' src = '../icons/american.png'/> 
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
                    <img class = 'list-img' src = '../icons/canada.png'/> 
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
});
// &#9825;
//❤️

// Event delegation to handle the click on the dynamically created button
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


//document.getElementById("show-fav").addEventListener('click', displayFavourites);
//document.getElementById("fav-selector").addEventListener("change", displayFavourites);
/*
document.getElementById("dismiss").addEventListener("click", () => {
    window.close();
});*/

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