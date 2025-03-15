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
            if (response && response.americanItems.length > 0) {
                cartResult.innerHTML = "<h3>Shopping cart check:</h3>";
                response.americanItems.forEach(item => {
                    cartResult.innerHTML += `<p><img class='list-img' src='../icons/american.png'/>
                    ${item.title}</p>`;
                });
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
                brandResult.innerHTML += `<p><img class = 'list-img' src = '../icons/american.png'/> ${searchText} is American!</p>`;
            } else {
                brandResult.innerHTML += `<p><img class = 'list-img' src = '../icons/canada.png'/> ${searchText} is NOT American.</p>`;
            }
        });
    }
});

document.getElementById("dismiss").addEventListener("click", () => {
    window.close();
});