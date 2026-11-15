import { transitionResponse } from '../_shared/card-transition.ts';

Deno.serve((req) => transitionResponse(req));
