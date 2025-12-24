import { VSXSearchOptions } from "./ovsx-types";

/**
 * 处理用户搜索，转为VSXSearchOptions
 * @date 2025/07/04 - 13:57:41 PM
 * @author wubing
 *
 * @export
 * @param {string} rawQuery
 * @returns {VSXSearchOptions}
 */
export function parseSearchQuery(rawQuery: string): VSXSearchOptions {
    const options: VSXSearchOptions = {};
    let processedQuery = rawQuery.trim();

    const tagHandlers: Array<{
        regex: RegExp;
        action: (match: string[], options: VSXSearchOptions) => void;
    }> = [
            // @category:value → category
            {
                regex: /@category:(\w+)/g,
                action: (match, opts) => { opts.category = match[1]; }
            },
            // @sort:key(:order)? → sortBy + sortOrder
            {
                regex: /@sort:(\w+)(?::(asc|desc))?/g,
                action: (match, opts) => {
                    opts.sortBy = match[1] as VSXSearchOptions['sortBy'];
                    if (match[2]) opts.sortOrder = match[2] as 'asc' | 'desc';
                }
            },
            // @offset:N → offset
            {
                regex: /@offset:(\d+)/g,
                action: (match, opts) => { opts.offset = parseInt(match[1], 10); }
            },
            // @includeAllVersions → includeAllVersions
            {
                regex: /@includeAllVersions/g,
                action: (_, opts) => { opts.includeAllVersions = true; }
            },
            // @id:value -> id
            {
                regex: /@id:([^\s]+)/g,
                action: (match, opts) => { opts.id = match[1] }
            }
        ];

    tagHandlers.forEach(({ regex, action }) => {
        let match;
        while ((match = regex.exec(processedQuery))) { // Added missing parenthesis
            action(match, options);
            processedQuery = processedQuery.replace(match[0], '');
        }
    })

    //剩下内容则为query
    options.query = processedQuery.trim();

    return options;

}

