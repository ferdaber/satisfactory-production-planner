export function assert(x: unknown, expectMessage: string | (() => string)): asserts x {
    if (!x) {
        const message = `Assertion error, expected: ${
            typeof expectMessage === "string" ? expectMessage : expectMessage()
        }`;
        throw new Error(message);
    }
}

export function assertNever(expectMessage: string | (() => string)): never {
    throw new Error(
        `Assertion error, expected: ${typeof expectMessage === "string" ? expectMessage : expectMessage()}`,
    );
}

export function ensure<T>(x: T, expectMessage: string | (() => string)): NonNullable<T> {
    assert(x != null, expectMessage);
    return x;
}

export function assertNumber(n: unknown, bindingName = "n"): asserts n is number {
    assert(typeof n === "number" && !Number.isNaN(n), `${bindingName} to be a real number`);
}

export function isNonNullable<T>(x: T): x is NonNullable<T> {
    return x != null;
}

export function isObject(x: unknown): x is object {
    return x !== null && typeof x === "object";
}
