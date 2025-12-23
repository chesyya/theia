import { QueryParameters } from '../../common/env';
export { EnvMainImpl } from '../common/env-main';

/**
 * Returns query parameters from current page.
 */
export function getQueryParameters(): QueryParameters {
    const queryParameters: QueryParameters = {};
    if (window.location.search !== '') {
        const queryParametersString = window.location.search.substring(1); // remove question mark
        const params = queryParametersString.split('&');
        for (const pair of params) {
            if (pair === '') {
                continue;
            }

            const keyValue = pair.split('=');
            let key: string = keyValue[0];
            let value: string = keyValue[1] ? keyValue[1] : '';
            try {
                key = decodeURIComponent(key);
                if (value !== '') {
                    value = decodeURIComponent(value);
                }
            } catch (error) {
                // skip malformed URI sequence
                continue;
            }

            const existedValue = queryParameters[key];
            if (existedValue) {
                if (existedValue instanceof Array) {
                    existedValue.push(value);
                } else {
                    // existed value is string
                    queryParameters[key] = [existedValue, value];
                }
            } else {
                queryParameters[key] = value;
            }
        }
    }
    return queryParameters;
}
