import { ConnectionTransport } from 'puppeteer-core';
/**
 * A puppeteer connection transport for extension.
 */
export declare class ExtensionDebuggerTransport implements ConnectionTransport {
    private target;
    private debugee;
    /**
     * If required, adjust this value to increase or decrese delay in ms between subsequent commands.
     * > Note :- decreasing it too much can give issues
     *
     * @default 0.04 * 1000
     */
    delay: number;
    private _sessionId;
    /** @internal */
    onmessage?: (message: string) => void;
    /** @internal */
    onclose?: () => void;
    /**
     * Returns a puppeteer connection transport instance for extension.
     * @example
     * How to use it:
     * ```javascript
     * const extensionTransport = await ExtensionDebuggerTransport.create(tabId)
     * const browser = await puppeteer.connect({
     *  transport: extensionTransport,
     *  defaultViewport: null
     * })
     *
     * // use first page from pages instead of using browser.newPage()
     * const [page] = await browser.pages()
     * await page.goto('https://wikipedia.org')
     * ```
     *
     * @param tabId - The id of tab to target. You can get this using chrome.tabs api
     * @param functionSerializer - Optional function serializer. If not specified and
     * if extension's manifest.json contains `unsafe_eval` then defaults to `new Function()`
     * else defaults to `() => {}`
     * @returns - The instance of {@link ExtensionDebuggerTransport}
     *
     * @throws Error
     * If debugger permission not given to extension
     */
    static create(tabId: number, functionSerializer?: FunctionConstructor): Promise<ExtensionDebuggerTransport>;
    private constructor();
    /** @internal */
    send(message: string): void;
    /** @internal */
    close(): void;
    private static _getTargetInfo;
    private _initialize;
    private _handleCommandResponse;
    private _handleTargetCommand;
    private _emitTargetCreated;
    private _emitTargetAttached;
    private _emitTargetDetached;
    private _closeTarget;
    private _emit;
    private _delaySend;
}
