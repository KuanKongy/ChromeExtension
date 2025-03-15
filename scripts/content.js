// Get the current website URL
let currentUrl = window.location.hostname;

// Extract the company name from the website's content
let companyName = document.querySelector('meta[property="og:site_name"]')?.content ||
    document.querySelector('meta[name="application-name"]')?.content ||
    document.title;

// Remove .com or .ca from the company name
companyName = companyName.replace(/(\.com|\.ca)$/i, '');

console.log("content");
console.log(companyName);

// Send data to the background script for processing
chrome.runtime.sendMessage({ action: "checkWebsite", url: currentUrl, companyName: companyName.toLowerCase() });