chrome.runtime.sendMessage({ action: "checkWebsite" }, response => {
    let resultElement = document.getElementById("result");
    console.log(response);
    if (response && response.isAmerican) {
        resultElement.innerText = "✅ This website is American!";
    } else {
        resultElement.innerText = "❌ This website is NOT American.";
    }
});
