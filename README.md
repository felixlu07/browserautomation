# OpenAI Powered Browser Automation (Based on Puppeteer Extension Transport)

The idea was inspired by Adept.ai where you could ask an interface a natural language question, OpenAI's would reply in a standardized way, and we could use that standardized format to plug in variables to accomplish browser automation.

E.g. I want to go to Korea. 

OpenAI will return:
{
Country: Korea
}

Browser Automation will extract Korea and go to the Destination field in the UI and type in Korea.

Will add more documentation to come.

This package allows you to use [**puppeteer-core**](https://github.com/puppeteer/puppeteer#puppeteer-core) in your browser extension's background page/service worker. It internally uses chrome.debugger extension api.

<br>

> **IMPORTANT NOTE** :- 
> For this to work, extension should have **debugger** permission specified in it's manifest json. Check [manifest.json](examples/extension-v2/manifest.json) in examples for reference.

<br>

## Installation

To install this package run:
```
git clone https://github.com/felixlu07/browserautomation.git
cd browserautomation
npm install
npm run compile
cd build/examples/extension-v3
```

<br>

## Usage

There are [v2 extension example](examples/extension-v2) and [v3 extension example](examples/extension-v3) in examples folder which you can load in your browser to test.

Check puppeteer documentation [here](https://pptr.dev/).

<br>

## API

Check other available options/config for this package [here](docs/README.md).

<br>

## FAQ

**Q: With which browsers can this be used ?**
<br>
This can be used with chrome and chromium based browsers.

<br>

**Q: Does this require browser to be started with some CLI flags ?**
<br>
No. This package internally uses `chrome.debugger` api to communicate with chrome devtools protocol.

<br>

**Q: What do i need to specify in manifest.json of extension ?**
<br>
You will atleast need to specify below in manifest.json:
```json
"permissions": ["debugger","storage"]
```
Check example [v2 manifest.json](examples/extension-v2/manifest.json) or [v3 manifest.json](examples/extension-v3/manifest.json) 

<br>

**Q: Who could use this ?**
<br>
The potential use cases for this code could include:

Automating the booking of flights/hotels: By using natural language processing to extract information from user queries, the code could be used to automatically populate fields in a booking form, thereby streamlining the booking process for users.

Streamlining data entry tasks: The code could be used to automatically extract relevant information from unstructured data sources (such as emails, PDFs, etc.) and populate fields in a database or spreadsheet.

Facilitating voice-activated UIs: The code could be used to extract user intent from voice commands and trigger actions accordingly (such as navigating to a specific webpage, playing a song, etc.).
<br>

## Puppeteer IDE Extension
[Extension](https://github.com/gajananpp/puppeteer-ide-extension) made using this library.
