import {
    createTemporaryReferenceSet,
    decodeAction,
    decodeFormState,
    decodeReply,
    loadServerAction,
    renderToReadableStream,
} from "@vitejs/plugin-rsc/rsc";
import { unstable_matchRSCServerRequest as matchRSCServerRequest } from "react-router";
// @ts-expect-error no types
import routes from "virtual:react-router/unstable_rsc/routes";
// @ts-expect-error no types
import basename from "virtual:react-router/unstable_rsc/basename";

export function fetchServer(request: Request) {
    return matchRSCServerRequest({
        createTemporaryReferenceSet,
        decodeAction,
        decodeFormState,
        decodeReply,
        loadServerAction,
        request,
        routes,
        basename,
        generateResponse(match, options) {
            return new Response(renderToReadableStream(match.payload, options), {
                status: match.statusCode,
                headers: match.headers,
            });
        },
    });
}

if (import.meta.hot) {
    import.meta.hot.accept();
}

let handler: ExportedHandler<Env> = {
    fetch(request) {
        return fetchServer(request);
    },
};

export default handler;
