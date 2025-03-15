// Request Website Status
chrome.runtime.sendMessage({ action: "getWebsiteStatus" }, response => {
    let websiteResult = document.getElementById("website-result");
    
    if (response && response.isAmerican) {
        websiteResult.innerText = "✅ This website is American!";
    } else {
        websiteResult.innerText = "❌ This website is NOT American.";
    }
});

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
});
