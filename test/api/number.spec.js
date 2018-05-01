'use strict'
/* global describe, it, beforeEach, afterEach */

const expect = require('chai').expect

describe('number', () => {
  let yargs
  beforeEach(() => {
    yargs = require('../../')
  })

  afterEach(() => {
    delete require.cache[require.resolve('../../')]
    yargs = undefined
  })

  it('accepts number arguments when a number type is specified', () => {
    const argv = yargs('-w banana')
      .number('w')
      .argv

    expect(typeof argv.w).to.equal('number')
  })

  it('should expose an options short-hand for numbers', () => {
    const argv = yargs('-w banana')
      .option('w', {
        number: true
      })
      .alias('w', 'x')
      .argv

    expect(typeof argv.w).to.equal('number')
    expect(typeof argv.x).to.equal('number')
  })
})
