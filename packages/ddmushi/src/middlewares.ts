import { type AnyParser, getParser } from './parser';
import type { Middleware } from './types';

export function createInputMiddleware<TInput = unknown>(parser: AnyParser) {
  const middleware: Middleware<any, TInput> =
    async function validateInputMiddleware({ opts, next }) {
      const parse = getParser(parser);
      const parsed = (await parse(opts.input)) as TInput;
      return await next({ ...opts, input: parsed });
    };
  return middleware;
}

export function createOutputMiddleware(parser: AnyParser) {
  const middleware: Middleware<any> = async function validateOutputMiddleware({
    opts,
    next,
  }) {
    const result = await next(opts);
    const parse = getParser(parser);
    const parsed = await parse(result);
    return parsed;
  };
  return middleware;
}
