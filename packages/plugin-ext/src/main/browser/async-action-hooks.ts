// import * as React from '@theia/core/shared/react';
// import { useInject } from '@theia/core/lib/browser/react-hooks';
// import { AsyncActionFrontendService } from './async-action-frontend-service';
// import { AsyncActionItem, ActionContext } from '../../common/async-action-protocol';

// export function useAsyncActions(context: ActionContext) {
//     const service = useInject(AsyncActionFrontendService);
//     const [actions, setActions] = React.useState<AsyncActionItem[]>([]);
//     const [loading, setLoading] = React.useState(false);

//     React.useEffect(() => {
//         let active = true;
//         setLoading(true);

//         service.fetchActions(context)
//             .then(items => {
//                 if (active) {
//                     setActions(items);
//                     setLoading(false);
//                 }
//             })
//             .catch(err => {
//                 console.error('Failed to fetch async actions', err);
//                 if (active) {
//                     setLoading(false);
//                 }
//             });

//         return () => { active = false; };
//     }, [context.anchorId, context.uri]);

//     const execute = (item: AsyncActionItem) => {
//         service.run(item, context).catch(console.error);
//     };

//     return { actions, loading, execute };
// }
