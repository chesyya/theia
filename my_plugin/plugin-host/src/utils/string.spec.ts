import escapeHTML from "escape-html";

describe("string", () => {
    test("escapeHTML", () => {
        expect(escapeHTML("")).toBe("");
        expect(escapeHTML("foo")).toBe("foo");
        expect(escapeHTML("foo'bar")).toBe("foo&#39;bar");
        expect(escapeHTML("foo\"bar")).toBe("foo&quot;bar");
        expect(escapeHTML("foo&bar")).toBe("foo&amp;bar");
        expect(escapeHTML("foo<bar")).toBe("foo&lt;bar");
        expect(escapeHTML("foo>bar")).toBe("foo&gt;bar");
    })
})