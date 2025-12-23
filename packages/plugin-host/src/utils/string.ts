const matchHTMLRegExp = /["'&<>]/;

export function escapeHTML(html: string = ""): string {
    const match = matchHTMLRegExp.exec(html);

    if(!match) {
        return html;
    }

    let result = "";
    let lastIdx = 0;
    for (let i = 0; i < html.length; i++) {
        let replacement: string | undefined = undefined;
        switch (html.charCodeAt(i)) {
            case 34: // "
                replacement = "&quot;";
                break;
            case 38: // &
                replacement = "&amp;";
                break;
            case 39: // '
                replacement = "&#39;";
                break;
            case 60: // <
                replacement = "&lt;";
                break;
            case 62: // >
                replacement = "&gt;";
                break;
        }
        if (replacement) {
            result += html.substring(lastIdx, i) + replacement;
            lastIdx = i + 1;
        }
    }

    return result + html.substring(lastIdx);
}