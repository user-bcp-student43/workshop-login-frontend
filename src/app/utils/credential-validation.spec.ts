import { expect, it } from 'vitest';
import { isBlankCredential } from './credential-validation';

it.each([null, undefined, '', '  '])('recognizes an empty credential %s', value => {
  expect(isBlankCredential(value)).toBe(true);
});

it.each([' student ', 'password', 0, false])('does not normalize a nonempty credential %s', value => {
  expect(isBlankCredential(value)).toBe(false);
});