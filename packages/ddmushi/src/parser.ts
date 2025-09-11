import { StandardSchemaV1Error } from './standard-schema/error';
import type { StandardSchemaV1 } from './standard-schema/spec';

export type Parser<TInput, TParserInput> = StandardSchemaV1<
  TInput,
  TParserInput
>;

export type AnyParser = Parser<any, any>;

export type ParseFn<TType> = (value: unknown) => Promise<TType> | TType;

export function getParser<TType>(parser: AnyParser): ParseFn<TType> {
  return async (value) => {
    const result = await parser['~standard'].validate(value);
    if (result.issues) {
      throw new StandardSchemaV1Error(result.issues);
    }
    return result.value;
  };
}
