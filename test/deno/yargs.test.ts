/* global Deno */

import {
  assertMatch
} from 'https://deno.land/std/testing/asserts.ts'
import yargs from '../../deno.ts'
import { Arguments } from '../../types.ts'

Deno.test('demandCommand(1) throw error if no command provided', () => {
  let err: Error|null = null
  yargs()
    .demandCommand(1)
    .parse(Deno.args, (_err: Error) => {
      err = _err
    })
  assertMatch(err!.message, /Not enough non-option/)
})

// TODO: we should think of a way to support this functionality
Deno.test('guesses version # based on package.json', () => {
  let output: string|null = null
  yargs()
    .parse('--version', (_err: Error, argv: Arguments, _output: string) => {
      output = _output
    })
  assertMatch('' + output, /[0-9]+\.[0-9]+\.[0-9]+/)
})
