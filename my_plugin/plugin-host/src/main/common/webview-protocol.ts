/**
 * Each webview should be deployed on a unique origin (https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
 * to ensure isolation from browser shared state as cookies, local storage and so on.
 *
 * Default hostname pattern of a origin is `{{uuid}}.webview.{{hostname}}`. Where `{{uuid}}` is a placeholder for a webview global id.
 * For electron target the default pattern is always used.
 * For the browser target use `THEIA_WEBVIEW_EXTERNAL_ENDPOINT` env variable to customize it.
 */
export namespace WebviewExternalEndpoint {
    export const pattern = 'THEIA_WEBVIEW_EXTERNAL_ENDPOINT';
    // export const defaultPattern = '{{uuid}}.webview.{{hostname}}';
    export const defaultPattern = '{{hostname}}';
}
