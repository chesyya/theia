import * as theia from '@baosky/plugin';
import { SerializedAutoClosingPair, SerializedIndentationRule, SerializedOnEnterRule, SerializedRegExp } from '../common';
import { SyntaxTokenType } from './types-impl';

export function serializeEnterRules(rules?: theia.OnEnterRule[]): SerializedOnEnterRule[] | undefined {
    if (typeof rules === 'undefined' || rules === null) {
        return undefined;
    }

    return rules.map(r =>
    ({
        beforeText: serializeRegExp(r.beforeText),
        afterText: serializeRegExp(r.afterText),
        previousLineText: serializeRegExp(r.previousLineText),
        action: r.action,
    } as SerializedOnEnterRule));
}

export function serializeRegExp(regexp?: RegExp): SerializedRegExp | undefined {
    if (typeof regexp === 'undefined' || regexp === null) {
        return undefined;
    }

    return {
        pattern: regexp.source,
        flags: (regexp.global ? 'g' : '') + (regexp.ignoreCase ? 'i' : '') + (regexp.multiline ? 'm' : '')
    };
}

export function serializeIndentation(indentationRules?: theia.IndentationRule): SerializedIndentationRule | undefined {
    if (typeof indentationRules === 'undefined' || indentationRules === null) {
        return undefined;
    }

    return {
        increaseIndentPattern: serializeRegExp(indentationRules.increaseIndentPattern),
        decreaseIndentPattern: serializeRegExp(indentationRules.decreaseIndentPattern),
        indentNextLinePattern: serializeRegExp(indentationRules.indentNextLinePattern),
        unIndentedLinePattern: serializeRegExp(indentationRules.unIndentedLinePattern)
    };
}

export function serializeAutoClosingPairs(pairs: theia.AutoClosingPair[] | undefined): SerializedAutoClosingPair[] | undefined {
    if (!pairs) {
        return undefined;
    };
    return pairs.map(pair => ({
        open: pair.open,
        close: pair.close,
        notIn: pair.notIn ? pair.notIn.map(tokenType => SyntaxTokenType.toString(tokenType)) : undefined
    }));
}
