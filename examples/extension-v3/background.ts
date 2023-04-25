import puppeteer from 'puppeteer-core/lib/cjs/puppeteer/web';
import { ExtensionDebuggerTransport } from '../../lib';

const run = async (tabId: number, loadingPort: string, dischargePort: string) => {
  const extensionTransport = await ExtensionDebuggerTransport.create(tabId);
  const browser = await puppeteer.connect({
    transport: extensionTransport,
    defaultViewport: null,
  });

  // use first page from pages instead of using browser.newPage()
  const [page] = await browser.pages();

  // For example, filling in fields based on user input from the popup:
  await page.click('div.css-164r41r button[type="button"]');

  // Wait for the modal to appear
  const modalSelector = '.MuiDialog-root';
  await page.waitForSelector(modalSelector);

  // Type "Singapore" into the loading.port input field and select the first autocomplete option
  await page.type('input[name="loading.port"]', loadingPort);
  const loadingPortAutocompleteSelector = '.MuiAutocomplete-option';
  await page.waitForSelector(loadingPortAutocompleteSelector);
  const loadingPortAutocompleteOptions = await page.$$(loadingPortAutocompleteSelector);
  await loadingPortAutocompleteOptions[0].click();

  // Type "Bangkok" into the discharge.port input field and select the first autocomplete option
  await page.type('input[name="discharge.port"]', dischargePort);
  const dischargePortAutocompleteSelector = '.MuiAutocomplete-option';
  await page.waitForSelector(dischargePortAutocompleteSelector);
  const dischargePortAutocompleteOptions = await page.$$(dischargePortAutocompleteSelector);
  await dischargePortAutocompleteOptions[0].click();

  // Enter the date into the input field
  await page.type('input[name="etd"]', '23/04/2023 00:00');

  // Click on the "Save" button
  await page.click('button[data-testid="modalSave"]');          

};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "executePuppeteerScript") {
      run(request.tabId, request.loadingPort, request.dischargePort);
    }
  });

// get the current time for context in the system message
let time = new Date().toLocaleString('en-US');

// create a system message
const systemMessage = "You are a helpful chat bot. Your answer should not be too long. current time: " + time;

// initialize the message array with a system message
let messageArray = [
    { role: "system", content: systemMessage }
];

// a event listener to listen for a message from the content script that says the user has openend the popup
chrome.runtime.onMessage.addListener(function (request) {
    // check if the request contains a message that the user has opened the popup
    if (request.openedPopup) {
        // reset the message array to remove the previous conversation
        messageArray = [
            { role: "system", content: systemMessage }
        ];
    }
});

chrome.action.onClicked.addListener((tab) => {
    // Store the current tab ID in the chrome.storage.local
    chrome.storage.local.set({ currentTabId: tab.id });
  });

// listen for a request message from the content script
chrome.runtime.onMessage.addListener(async function (request) {
    if (request.input) {
        // let apiKey = await new Promise(resolve => chrome.storage.local.get(['apiKey'], result => resolve(result.apiKey)));
        let apiKey = "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";
        // let apiModel = await new Promise(resolve => chrome.storage.local.get(['apiModel'], result => resolve(result.apiModel)));
        let apiModel = "gpt-3.5-turbo";
        // payload format to append to messageArray

        let uniqueMessage = "I want you to only reply with the output inside one unique code block, and nothing else. DO NOT write explanations. Extract shipment information from the user and provide the information in the following payload format: \n{\n  loading.port: {country/port from},\n  discharge.port: {country/port to}\n}\n\nQuery:";

        // Add the user's message and uniqueMessage to the message array
        messageArray.push({ role: "user", content: uniqueMessage + request.input });

        try {
            // send the request containing the messages to the OpenAI API
            let response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    "model": apiModel,
                    "messages": messageArray
                })
            });

            // check if the API response is ok Else throw an error
            if (!response.ok) {
                throw new Error(`Failed to fetch. Status code: ${response.status}`);
            }

            // get the data from the API response as json
            let data = await response.json();

            // check if the API response contains an answer
            if (data && data.choices && data.choices.length > 0) {
                // get the answer from the API response
                let response = data.choices[0].message.content;

                // send the answer back to the content script
                chrome.runtime.sendMessage({ answer: response });

                // Add the response from the assistant to the message array
                messageArray.push({ role: "assistant", "content": response });
            }
        } catch (error) {
            // send error message back to the content script
            chrome.runtime.sendMessage({ answer: "No answer Received: Make sure the entered API-Key is correct." });
        }
    }
    // return true to indicate that the message has been handled
    return true;
});
