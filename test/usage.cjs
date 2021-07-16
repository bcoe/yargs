'use strict';
/* global describe, it, beforeEach */
/* eslint-disable no-unused-vars */

const checkUsage = require('./helpers/utils.cjs').checkOutput;
const chalk = require('chalk');
const yargs = require('../index.cjs');
const expect = require('chai').expect;
const {YError} = require('../build/index.cjs');

const should = require('chai').should();

const noop = () => {};
async function wait(n = 10) {
  return new Promise(resolve => {
    setTimeout(resolve, n);
  });
}

describe('usage tests', () => {
  beforeEach(() => {
    yargs.getInternalMethods().reset();
  });

  describe('demand options', () => {
    describe('using .demand()', () => {
      it('should show an error along with the missing arguments on demand fail', () => {
        const r = checkUsage(() =>
          yargs('-x 10 -z 20')
            .usage('Usage: $0 -x NUM -y NUM')
            .demand(['x', 'y'])
            .wrap(null)
            .parse()
        );
        r.result.should.have.property('x', 10);
        r.result.should.have.property('z', 20);
        r.result.should.have.property('_').with.length(0);
        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage -x NUM -y NUM',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -x  [required]',
            '  -y  [required]',
            'Missing required argument: y',
          ]);
        r.logs.should.have.length(0);
        r.exit.should.equal(true);
      });

      it('missing argument message given if one command, but an argument not on the list is provided', () => {
        const r = checkUsage(() =>
          yargs('wombat -w 10 -y 10')
            .usage('Usage: $0 -w NUM -m NUM')
            .demand(1, ['w', 'm'])
            .strict()
            .wrap(null)
            .parse()
        );
        r.result.should.have.property('w', 10);
        r.result.should.have.property('y', 10);
        r.result.should.have.property('_').with.length(1);
        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage -w NUM -m NUM',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -w  [required]',
            '  -m  [required]',
            'Missing required argument: m',
          ]);
        r.logs.should.have.length(0);
        r.exit.should.equal(true);
      });

      it('missing command message if all the required arguments exist, but not enough commands are provided', () => {
        const r = checkUsage(() =>
          yargs('-w 10 -y 10')
            .usage('Usage: $0 -w NUM -m NUM')
            .demand(1, ['w', 'm'])
            .strict()
            .wrap(null)
            .parse()
        );
        r.result.should.have.property('w', 10);
        r.result.should.have.property('y', 10);
        r.result.should.have.property('_').with.length(0);
        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage -w NUM -m NUM',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -w  [required]',
            '  -m  [required]',
            'Not enough non-option arguments: got 0, need at least 1',
          ]);
        r.logs.should.have.length(0);
        r.exit.should.equal(true);
      });

      it('no failure occurs if the required arguments and the required number of commands are provided', () => {
        const r = checkUsage(() =>
          yargs('wombat -w 10 -m 10')
            .usage('Usage: $0 -w NUM -m NUM')
            .command('wombat', 'wombat handlers')
            .demand(1, ['w', 'm'])
            .wrap(null)
            .parse()
        );

        r.result.should.have.property('w', 10);
        r.result.should.have.property('m', 10);
        r.result.should.have.property('_').with.length(1);
        r.should.have.property('errors').with.length(0);
        r.should.have.property('logs').with.length(0);
        r.should.have.property('exit', false);
      });

      describe('using .require()', () => {
        it('should show an error along with the missing arguments on demand fail', () => {
          const r = checkUsage(() =>
            yargs('-x 10 -z 20')
              .usage('Usage: $0 -x NUM -y NUM')
              .require(['x', 'y'])
              .wrap(null)
              .parse()
          );
          r.result.should.have.property('x', 10);
          r.result.should.have.property('z', 20);
          r.result.should.have.property('_').with.length(0);
          r.errors
            .join('\n')
            .split(/\n+/)
            .should.deep.equal([
              'Usage: usage -x NUM -y NUM',
              'Options:',
              '      --help     Show help  [boolean]',
              '      --version  Show version number  [boolean]',
              '  -x  [required]',
              '  -y  [required]',
              'Missing required argument: y',
            ]);
          r.logs.should.have.length(0);
          r.exit.should.equal(true);
        });
        it('missing argument message given if one command and an argument not on the list are provided', () => {
          const r = checkUsage(() =>
            yargs('wombat -w 10 -y 10')
              .usage('Usage: $0 -w NUM -m NUM')
              .required(1, ['w', 'm'])
              .strict()
              .wrap(null)
              .parse()
          );
          r.result.should.have.property('w', 10);
          r.result.should.have.property('y', 10);
          r.result.should.have.property('_').with.length(1);
          r.errors
            .join('\n')
            .split(/\n+/)
            .should.deep.equal([
              'Usage: usage -w NUM -m NUM',
              'Options:',
              '      --help     Show help  [boolean]',
              '      --version  Show version number  [boolean]',
              '  -w  [required]',
              '  -m  [required]',
              'Missing required argument: m',
            ]);
          r.logs.should.have.length(0);
          r.exit.should.equal(true);
        });
      });

      it('missing command message if all the required arguments exist, but not enough commands are provided', () => {
        const r = checkUsage(() =>
          yargs('-w 10 -y 10')
            .usage('Usage: $0 -w NUM -m NUM')
            .require(1, ['w', 'm'])
            .strict()
            .wrap(null)
            .parse()
        );
        r.result.should.have.property('w', 10);
        r.result.should.have.property('y', 10);
        r.result.should.have.property('_').with.length(0);
        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage -w NUM -m NUM',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -w  [required]',
            '  -m  [required]',
            'Not enough non-option arguments: got 0, need at least 1',
          ]);
        r.logs.should.have.length(0);
        r.exit.should.equal(true);
      });
    });

    it('should show an error along with a custom message on demand fail', () => {
      const r = checkUsage(() =>
        yargs('-z 20')
          .usage('Usage: $0 -x NUM -y NUM')
          .demand(
            ['x', 'y'],
            'x and y are both required to multiply all the things'
          )
          .wrap(null)
          .parse()
      );
      r.result.should.have.property('z', 20);
      r.result.should.have.property('_').with.length(0);
      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Usage: usage -x NUM -y NUM',
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -x  [required]',
          '  -y  [required]',
          'Missing required arguments: x, y',
          'x and y are both required to multiply all the things',
        ]);
      r.logs.should.have.length(0);
      r.exit.should.equal(true);
    });

    it('should return valid values when demand passes', () => {
      const r = checkUsage(() =>
        yargs('-x 10 -y 20')
          .usage('Usage: $0 -x NUM -y NUM')
          .demand(['x', 'y'])
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('x', 10);
      r.result.should.have.property('y', 20);
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('errors').with.length(0);
      r.should.have.property('logs').with.length(0);
      r.should.have.property('exit', false);
    });

    it('should not show a custom message if msg is null', () => {
      const r = checkUsage(() =>
        yargs('').usage('Usage: foo').demand(1, null).wrap(null).parse()
      );

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Usage: foo',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
          '',
        ]);
    });

    // see #169.
    describe('min/max demanded count', () => {
      it("does not output an error if '_' count is within the min/max range", () => {
        const r = checkUsage(() =>
          yargs(['foo', 'bar', 'apple'])
            .usage('Usage: foo')
            .demand(2, 3)
            .wrap(null)
            .parse()
        );

        r.errors.length.should.equal(0);
      });

      it("outputs an error if '_' count is above max", () => {
        const r = checkUsage(() =>
          yargs(['foo', 'bar', 'apple', 'banana'])
            .usage('Usage: foo')
            .demand(2, 3)
            .wrap(null)
            .parse()
        );

        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: foo',
            'Options:',
            '  --help     Show help  [boolean]',
            '  --version  Show version number  [boolean]',
            'Too many non-option arguments: got 4, maximum of 3',
          ]);
      });

      it("outputs an error if '_' count is below min", () => {
        const r = checkUsage(() =>
          yargs(['foo']).usage('Usage: foo').demand(2, 3).wrap(null).parse()
        );

        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: foo',
            'Options:',
            '  --help     Show help  [boolean]',
            '  --version  Show version number  [boolean]',
            'Not enough non-option arguments: got 1, need at least 2',
          ]);
      });

      it('allows a customer error message to be provided', () => {
        const r = checkUsage(() =>
          yargs(['foo'])
            .usage('Usage: foo')
            .demand(2, 3, 'pork chop sandwiches')
            .wrap(null)
            .parse()
        );

        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: foo',
            'Options:',
            '  --help     Show help  [boolean]',
            '  --version  Show version number  [boolean]',
            'pork chop sandwiches',
          ]);
      });

      it("shouldn't interpret the second argument as a max when it is an array", () => {
        const r = checkUsage(() =>
          yargs(['koala', 'wombat', '--1'])
            .usage('Usage: foo')
            .demand(1, ['1'])
            .wrap(null)
            .parse()
        );

        r.errors.length.should.equal(0);
      });
    });
  });

  describe('deprecate options', () => {
    describe('using .option(x, {deprecate: [boolean|string]})', () => {
      it('{deprecated: true} should show [deprecated]', () => {
        const r = checkUsage(() =>
          yargs('--help').option('x', {deprecated: true}).wrap(null).parse()
        );
        r.logs[0].should.include('  -x  [deprecated]');
      });
      it('{deprecated: string} should show [deprecated: string]', () => {
        const r = checkUsage(() =>
          yargs('--help').option('x', {deprecated: 'string'}).wrap(null).parse()
        );
        r.logs[0].should.include('  -x  [deprecated: string]');
      });
      it('{deprecated: boolean} in sub-command', () => {
        const r = checkUsage(() =>
          yargs('command --help')
            .option('x', {deprecated: true})
            .command('command', 'command', yargs =>
              yargs.option('y', {deprecated: true})
            )
            .wrap(null)
            .parse()
        );
        r.logs[0].should.include('  -x  [deprecated]');
        r.logs[0].should.include('  -y  [deprecated]');
      });
      it('{deprecated: string} in sub-command', () => {
        const r = checkUsage(() =>
          yargs('command --help')
            .option('x', {deprecated: 'string'})
            .command('command', 'command', yargs =>
              yargs.option('y', {deprecated: 'string'})
            )
            .wrap(null)
            .parse()
        );
        r.logs[0].should.include('  -x  [deprecated: string]');
        r.logs[0].should.include('  -y  [deprecated: string]');
      });
    });
    describe('using .deprecateOption(x, [string])', () => {
      it('.deprecateOption(x) should show [deprecated]', () => {
        const r = checkUsage(() =>
          yargs('--help').option('x').deprecateOption('x').wrap(null).parse()
        );
        r.logs[0].should.include('  -x  [deprecated]');
      });
      it('.deprecateOption(x, string) should show [deprecated: string]', () => {
        const r = checkUsage(() =>
          yargs('--help')
            .option('x')
            .deprecateOption('x', 'string')
            .wrap(null)
            .parse()
        );
        r.logs[0].should.include('  -x  [deprecated: string]');
      });
      it('.deprecateOption(x) in a sub-command', () => {
        const r = checkUsage(() =>
          yargs('command --help')
            .option('x')
            .deprecateOption('x')
            .command('command', 'command', yargs =>
              yargs.option('y').deprecateOption('y')
            )
            .wrap(null)
            .parse()
        );
        r.logs[0].should.include('  -x  [deprecated]');
        r.logs[0].should.include('  -y  [deprecated]');
      });
      it('.deprecateOption(x, string) in a sub-command', () => {
        const r = checkUsage(() =>
          yargs('command --help')
            .option('x')
            .deprecateOption('x', 'string')
            .command('command', 'command', yargs =>
              yargs.option('y').deprecateOption('y', 'string')
            )
            .wrap(null)
            .parse()
        );
        r.logs[0].should.include('  -x  [deprecated: string]');
        r.logs[0].should.include('  -y  [deprecated: string]');
      });
    });
  });

  it('should return valid values when check passes', () => {
    const r = checkUsage(() =>
      yargs('-x 10 -y 20')
        .usage('Usage: $0 -x NUM -y NUM')
        .check(argv => {
          if (!('x' in argv)) throw Error('You forgot about -x');
          if (!('y' in argv)) throw Error('You forgot about -y');
          else return true;
        })
        .parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('x', 10);
    r.result.should.have.property('y', 20);
    r.result.should.have.property('_').with.length(0);
    r.should.have.property('errors').with.length(0);
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit', false);
  });

  it('should display missing arguments when check fails with a thrown exception', () => {
    const r = checkUsage(() =>
      yargs('-x 10 -z 20')
        .usage('Usage: $0 -x NUM -y NUM')
        .wrap(null)
        .check(argv => {
          if (!('x' in argv)) throw Error('You forgot about -x');
          if (!('y' in argv)) throw Error('You forgot about -y');
        })
        .parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('x', 10);
    r.result.should.have.property('z', 20);
    r.result.should.have.property('_').with.length(0);
    r.errors
      .join('\n')
      .split(/\n+/)
      .should.deep.equal([
        'Usage: usage -x NUM -y NUM',
        'Options:',
        '  --help     Show help  [boolean]',
        '  --version  Show version number  [boolean]',
        'You forgot about -y',
      ]);
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit').and.equal(true);
  });

  it('should display missing arguments when check fails with a return value', () => {
    const r = checkUsage(() =>
      yargs('-x 10 -z 20')
        .usage('Usage: $0 -x NUM -y NUM')
        .wrap(null)
        .check(argv => {
          if (!('x' in argv)) return 'You forgot about -x';
          if (!('y' in argv)) return 'You forgot about -y';
        })
        .parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('x', 10);
    r.result.should.have.property('z', 20);
    r.result.should.have.property('_').with.length(0);
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit').and.equal(true);
    r.should.have.property('errors');
    r.errors
      .join('\n')
      .split(/\n+/)
      .should.deep.equal([
        'Usage: usage -x NUM -y NUM',
        'Options:',
        '  --help     Show help  [boolean]',
        '  --version  Show version number  [boolean]',
        'You forgot about -y',
      ]);
  });

  it('should return a valid result when check condition passes', () => {
    function checker(argv) {
      return 'x' in argv && 'y' in argv;
    }
    const r = checkUsage(() =>
      yargs('-x 10 -y 20')
        .usage('Usage: $0 -x NUM -y NUM')
        .check(checker)
        .parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('x', 10);
    r.result.should.have.property('y', 20);
    r.result.should.have.property('_').with.length(0);
    r.should.have.property('errors').with.length(0);
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit', false);
  });

  it('should display a failed message when check condition fails', () => {
    function checker(argv) {
      return 'x' in argv && 'y' in argv;
    }
    const r = checkUsage(() =>
      yargs('-x 10 -z 20')
        .usage('Usage: $0 -x NUM -y NUM')
        .check(checker)
        .wrap(null)
        .parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('x', 10);
    r.result.should.have.property('z', 20);
    r.result.should.have.property('_').with.length(0);
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit').and.equal(true);
    r.should.have.property('errors');
    r.errors
      .join('\n')
      .split(/\n+/)
      .join('\n')
      .should.equal(
        'Usage: usage -x NUM -y NUM\n' +
          'Options:\n' +
          '  --help     Show help  [boolean]\n' +
          '  --version  Show version number  [boolean]\n' +
          `Argument check failed: ${checker.toString()}`
      );
  });

  describe('when exitProcess is false', () => {
    describe('when check fails with a thrown exception', () => {
      it('should display missing arguments once', () => {
        const r = checkUsage(() => {
          try {
            return yargs('-x 10 -z 20')
              .usage('Usage: $0 -x NUM -y NUM')
              .exitProcess(false)
              .wrap(null)
              .check(argv => {
                if (!('x' in argv)) throw Error('You forgot about -x');
                if (!('y' in argv)) throw Error('You forgot about -y');
              })
              .parse();
          } catch (err) {
            // ignore the error, we only test the output here
          }
        });
        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage -x NUM -y NUM',
            'Options:',
            '  --help     Show help  [boolean]',
            '  --version  Show version number  [boolean]',
            'You forgot about -y',
          ]);
        r.should.have.property('logs').with.length(0);
        r.should.have.property('exit').and.equal(false);
      });
    });
    describe('fail()', () => {
      it('is called with the original error message as the first parameter', () => {
        const r = checkUsage(() => {
          return yargs()
            .fail(message => {
              console.log(message);
            })
            .wrap(null)
            .check(argv => {
              throw new Error('foo');
            })
            .parse();
        });
        r.logs.should.deep.equal(['foo']);
        r.should.have.property('exit').and.equal(false);
      });

      it('is invoked with yargs instance as third argument', () => {
        const r = checkUsage(() =>
          yargs('foo')
            .command(
              'foo',
              'desc',
              {
                bar: {
                  describe: 'bar command',
                },
              },
              argv => {
                throw new YError('blah');
              }
            )
            .fail((message, error, yargs) => {
              yargs.showHelp();
            })
            .wrap(null)
            .parse()
        );

        r.errors[0].should.contain('bar command');
      });

      describe('when check() throws error', () => {
        it('fail() is called with the original error object as the second parameter', () => {
          const r = checkUsage(() => {
            return yargs()
              .fail((message, error) => {
                console.log(error.message);
              })
              .wrap(null)
              .check(() => {
                throw new Error('foo');
              })
              .parse();
          });
          r.logs.should.deep.equal(['foo']);
          r.should.have.property('exit').and.equal(false);
        });
      });
      describe('when command() throws error', () => {
        it('fail() is called with the original error object as the second parameter', () => {
          const r = checkUsage(() => {
            return yargs('test')
              .fail(() => {
                console.log('is triggered last');
              })
              .wrap(null)
              .command(
                'test',
                'test',
                subYargs => {
                  subYargs
                    .fail((message, error) => {
                      console.log([error.name, error.message]);
                    })
                    .exitProcess(false);
                },
                argv => {
                  throw new YError('foo');
                }
              )
              .parse();
          });
          r.logs.should.deep.equal([
            "[ 'YError', 'foo' ]",
            'is triggered last',
          ]);
          r.should.have.property('exit').and.equal(false);
        });
      });

      it('allows "false" to be provided to prevent exit/output', () => {
        try {
          yargs()
            .fail(false)
            .wrap(null)
            .check(argv => {
              throw new Error('sync error');
            })
            .parse();
          throw Error('unreachable');
        } catch (err) {
          err.message.should.equal('sync error');
        }
      });

      it('does not allow "true" as argument', () => {
        try {
          yargs()
            .fail(true)
            .wrap(null)
            .check(argv => {
              throw new Error('sync error');
            })
            .parse();
          throw Error('unreachable');
        } catch (err) {
          err.message.should.match(/Invalid first argument/);
        }
      });
    });
  });

  it('should return a valid result when demanding a count of non-hyphenated values', () => {
    const r = checkUsage(() =>
      yargs('1 2 3 --moo')
        .usage('Usage: $0 [x] [y] [z] {OPTIONS}')
        .demand(3)
        .parse()
    );
    r.should.have.property('result');
    r.should.have.property('errors').with.length(0);
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit', false);
    r.result.should.have.property('_').and.deep.equal([1, 2, 3]);
    r.result.should.have.property('moo', true);
  });

  it('should return a failure message when not enough non-hyphenated arguments are found after a demand count', () => {
    const r = checkUsage(() =>
      yargs('1 2 --moo')
        .usage('Usage: $0 [x] [y] [z] {OPTIONS}')
        .demand(3)
        .wrap(null)
        .parse()
    );
    r.should.have.property('result');
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit').and.equal(true);
    r.result.should.have.property('_').and.deep.equal([1, 2]);
    r.result.should.have.property('moo', true);
    r.should.have.property('errors');
    r.errors
      .join('\n')
      .split(/\n+/)
      .should.deep.equal([
        'Usage: usage [x] [y] [z] {OPTIONS}',
        'Options:',
        '  --help     Show help  [boolean]',
        '  --version  Show version number  [boolean]',
        'Not enough non-option arguments: got 2, need at least 3',
      ]);
  });

  it('should return a custom failure message when not enough non-hyphenated arguments are found after a demand count', () => {
    const r = checkUsage(() =>
      yargs('src --moo')
        .usage('Usage: $0 [x] [y] [z] {OPTIONS} <src> <dest> [extra_files...]')
        .demand(2, 'src and dest files are both required')
        .wrap(null)
        .parse()
    );
    r.should.have.property('result');
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit').and.equal(true);
    r.result.should.have.property('_').and.deep.equal(['src']);
    r.result.should.have.property('moo', true);
    r.should.have.property('errors');
    r.errors
      .join('\n')
      .split(/\n+/)
      .should.deep.equal([
        'Usage: usage [x] [y] [z] {OPTIONS} <src> <dest> [extra_files...]',
        'Options:',
        '  --help     Show help  [boolean]',
        '  --version  Show version number  [boolean]',
        'src and dest files are both required',
      ]);
  });

  it('should return a valid result when setting defaults for singles', () => {
    const r = checkUsage(() =>
      yargs('--foo 50 --baz 70 --powsy')
        .default('foo', 5)
        .default('bar', 6)
        .default('baz', 7)
        .parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('foo', 50);
    r.result.should.have.property('bar', 6);
    r.result.should.have.property('baz', 70);
    r.result.should.have.property('powsy', true);
    r.result.should.have.property('_').with.length(0);
  });

  it('should return a valid result when default is set for an alias', () => {
    const r = checkUsage(() =>
      yargs('').alias('f', 'foo').default('f', 5).parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('f', 5);
    r.result.should.have.property('foo', 5);
    r.result.should.have.property('_').with.length(0);
  });

  it('should print a single line when failing and default is set for an alias', () => {
    const r = checkUsage(() =>
      yargs('').alias('f', 'foo').default('f', 5).demand(1).wrap(null).parse()
    );
    r.errors
      .join('\n')
      .split(/\n+/)
      .should.deep.equal([
        'Options:',
        '      --help     Show help  [boolean]',
        '      --version  Show version number  [boolean]',
        '  -f, --foo  [default: 5]',
        'Not enough non-option arguments: got 0, need at least 1',
      ]);
  });

  it('should allow you to set default values for a hash of options', () => {
    const r = checkUsage(() =>
      yargs('--foo 50 --baz 70').default({foo: 10, bar: 20, quux: 30}).parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('_').with.length(0);
    r.result.should.have.property('foo', 50);
    r.result.should.have.property('baz', 70);
    r.result.should.have.property('bar', 20);
    r.result.should.have.property('quux', 30);
  });

  describe('required arguments', () => {
    describe('with options object', () => {
      it('should show a failure message if a required option is missing', () => {
        const r = checkUsage(() => {
          const opts = {
            foo: {description: 'foo option', alias: 'f', requiresArg: true},
            bar: {description: 'bar option', alias: 'b', requiresArg: true},
          };

          return yargs('-f --bar 20')
            .usage('Usage: $0 [options]')
            .options(opts)
            .wrap(null)
            .parse();
        });
        r.should.have.property('result');
        r.result.should.have.property('_').with.length(0);
        r.should.have.property('errors');
        r.should.have.property('logs').with.length(0);
        r.should.have.property('exit').and.equal(true);
        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage [options]',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -f, --foo      foo option',
            '  -b, --bar      bar option',
            'Not enough arguments following: f',
          ]);
      });

      it('should show a failure message if more than one required option is missing', () => {
        const r = checkUsage(() => {
          const opts = {
            foo: {description: 'foo option', alias: 'f', requiresArg: true},
            bar: {description: 'bar option', alias: 'b', requiresArg: true},
          };

          return yargs('-f --bar')
            .usage('Usage: $0 [options]')
            .options(opts)
            .wrap(null)
            .parse();
        });
        r.should.have.property('result');
        r.result.should.have.property('_').with.length(0);
        r.should.have.property('errors');
        r.should.have.property('logs').with.length(0);
        r.should.have.property('exit').and.equal(true);
        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage [options]',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -f, --foo      foo option',
            '  -b, --bar      bar option',
            'Not enough arguments following: bar',
          ]);
      });
    });

    describe('with requiresArg method', () => {
      it('should show a failure message if a required option is missing', () => {
        const r = checkUsage(() => {
          const opts = {
            foo: {description: 'foo option', alias: 'f'},
            bar: {description: 'bar option', alias: 'b'},
          };

          return yargs('-f --bar 20')
            .usage('Usage: $0 [options]')
            .options(opts)
            .requiresArg(['foo', 'bar'])
            .wrap(null)
            .parse();
        });
        r.should.have.property('result');
        r.result.should.have.property('_').with.length(0);
        r.should.have.property('errors');
        r.should.have.property('logs').with.length(0);
        r.should.have.property('exit').and.equal(true);
        r.errors
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage [options]',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -f, --foo      foo option',
            '  -b, --bar      bar option',
            'Not enough arguments following: f',
          ]);
      });
    });

    it("still requires argument if 'type' hints are given", () => {
      const r = checkUsage(() =>
        yargs('--foo --bar')
          .requiresArg('foo')
          .string('foo')
          .requiresArg('bar')
          .array('bar')
          .wrap(null)
          .parse()
      );

      r.errors[2].should.equal('Not enough arguments following: bar');
    });
  });

  describe('with strict() option set', () => {
    it('should fail given an option argument that is not demanded', () => {
      const r = checkUsage(() => {
        const opts = {
          foo: {demand: 'foo option', alias: 'f'},
          bar: {demand: 'bar option', alias: 'b'},
        };

        return yargs('-f 10 --bar 20 --baz 30')
          .usage('Usage: $0 [options]')
          .options(opts)
          .strict()
          .wrap(null)
          .parse();
      });

      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.result.should.have.property('f', 10);
      r.result.should.have.property('foo', 10);
      r.result.should.have.property('b', 20);
      r.result.should.have.property('bar', 20);
      r.result.should.have.property('baz', 30);
      r.should.have.property('errors');
      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Usage: usage [options]',
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -f, --foo  [required]',
          '  -b, --bar  [required]',
          'Unknown argument: baz',
        ]);
      r.should.have.property('logs').with.length(0);
      r.should.have.property('exit').and.equal(true);
    });

    describe('with hyphens in options', () => {
      it('fails when an invalid argument is provided', done => {
        return yargs('--foo-bar')
          .strict()
          .fail(msg => {
            return done();
          }).argv;
      });

      it('accepts valid options', () => {
        const r = checkUsage(() => {
          const opts = {
            '--foo-bar': {description: 'foo bar option'},
            '--bar-baz': {description: 'bar baz option'},
          };

          return yargs('--foo-bar --bar-baz').options(opts).strict().parse();
        });

        r.result.should.have.property('foo-bar', true);
        r.result.should.have.property('fooBar', true);
        r.result.should.have.property('bar-baz', true);
        r.result.should.have.property('barBaz', true);
      });

      it('works with aliases', () => {
        const r = checkUsage(() => {
          const opts = {
            '--foo-bar': {description: 'foo bar option', alias: 'f'},
            '--bar-baz': {description: 'bar baz option', alias: 'b'},
          };

          return yargs('--foo-bar -b').options(opts).strict().parse();
        });

        r.result.should.have.property('foo-bar', true);
        r.result.should.have.property('fooBar', true);
        r.result.should.have.property('f', true);
        r.result.should.have.property('bar-baz', true);
        r.result.should.have.property('barBaz', true);
        r.result.should.have.property('b', true);
      });

      it('accepts mixed options with values', () => {
        const r = checkUsage(() => {
          const opts = {
            '--foo-bar': {description: 'foo bar option', demand: true},
            '--baz': {description: 'baz option', demand: true},
          };

          return yargs('--foo-bar 150 --baz').options(opts).strict().parse();
        });

        r.result.should.have.property('foo-bar', 150);
        r.result.should.have.property('fooBar', 150);
        r.result.should.have.property('baz', true);
      });
    });

    it('should fail given an option argument without a corresponding description', () => {
      const r = checkUsage(() => {
        const opts = {
          foo: {description: 'foo option', alias: 'f'},
          bar: {description: 'bar option', alias: 'b'},
        };

        return yargs('-f 10 --bar 20 --baz 30')
          .usage('Usage: $0 [options]')
          .options(opts)
          .strict()
          .wrap(null)
          .parse();
      });

      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.result.should.have.property('f', 10);
      r.result.should.have.property('foo', 10);
      r.result.should.have.property('b', 20);
      r.result.should.have.property('bar', 20);
      r.result.should.have.property('baz', 30);
      r.should.have.property('errors');
      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Usage: usage [options]',
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -f, --foo      foo option',
          '  -b, --bar      bar option',
          'Unknown argument: baz',
        ]);
      r.should.have.property('logs').with.length(0);
      r.should.have.property('exit').and.equal(true);
    });

    it('should fail given multiple option arguments without corresponding descriptions', () => {
      const r = checkUsage(() => {
        const opts = {
          foo: {description: 'foo option', alias: 'f'},
          bar: {description: 'bar option', alias: 'b'},
        };

        return yargs('-f 10 --bar 20 --baz 30 -q 40')
          .usage('Usage: $0 [options]')
          .options(opts)
          .strict()
          .wrap(null)
          .parse();
      });

      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.result.should.have.property('f', 10);
      r.result.should.have.property('foo', 10);
      r.result.should.have.property('b', 20);
      r.result.should.have.property('bar', 20);
      r.result.should.have.property('baz', 30);
      r.result.should.have.property('q', 40);
      r.should.have.property('errors');
      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Usage: usage [options]',
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -f, --foo      foo option',
          '  -b, --bar      bar option',
          'Unknown arguments: baz, q',
        ]);
      r.should.have.property('logs').with.length(0);
      r.should.have.property('exit').and.equal(true);
    });

    it('should pass given option arguments with corresponding descriptions', () => {
      const r = checkUsage(() => {
        const opts = {
          foo: {description: 'foo option'},
          bar: {description: 'bar option'},
        };

        return yargs('--foo 10 --bar 20')
          .usage('Usage: $0 [options]')
          .options(opts)
          .strict()
          .parse();
      });

      r.should.have.property('result');
      r.result.should.have.property('foo', 10);
      r.result.should.have.property('bar', 20);
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('errors').with.length(0);
      r.should.have.property('logs').with.length(0);
      r.should.have.property('exit', false);
    });
  });

  it('should display example on fail', () => {
    const r = checkUsage(() =>
      yargs('')
        .example('$0 something', 'description')
        .example('$0 something else', 'other description')
        .demand(['y'])
        .wrap(null)
        .parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('_').with.length(0);
    r.should.have.property('errors');
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit').and.equal(true);
    r.errors
      .join('\n')
      .split(/\n+/)
      .should.deep.equal([
        'Options:',
        '      --help     Show help  [boolean]',
        '      --version  Show version number  [boolean]',
        '  -y  [required]',
        'Examples:',
        '  usage something       description',
        '  usage something else  other description',
        'Missing required argument: y',
      ]);
  });

  it('should display examples on fail when passing multiple examples at once', () => {
    const r = checkUsage(() =>
      yargs('')
        .example([
          ['$0 something', 'description'],
          ['$0 something else', 'other description'],
        ])
        .demand(['y'])
        .wrap(null)
        .parse()
    );
    r.should.have.property('result');
    r.result.should.have.property('_').with.length(0);
    r.should.have.property('errors');
    r.should.have.property('logs').with.length(0);
    r.should.have.property('exit').and.equal(true);
    r.errors
      .join('\n')
      .split(/\n+/)
      .should.deep.equal([
        'Options:',
        '      --help     Show help  [boolean]',
        '      --version  Show version number  [boolean]',
        '  -y  [required]',
        'Examples:',
        '  usage something       description',
        '  usage something else  other description',
        'Missing required argument: y',
      ]);
  });

  describe('demand option with boolean flag', () => {
    describe('with demand option', () => {
      it('should report missing required arguments', () => {
        const r = checkUsage(() =>
          yargs('-y 10 -z 20')
            .usage('Usage: $0 -x NUM [-y NUM]')
            .options({
              x: {description: 'an option', demand: true},
              y: {description: 'another option', demand: false},
            })
            .wrap(null)
            .parse()
        );
        r.result.should.have.property('y', 10);
        r.result.should.have.property('z', 20);
        r.result.should.have.property('_').with.length(0);
        r.errors
          .join('\n')
          .split(/\n/)
          .should.deep.equal([
            'Usage: usage -x NUM [-y NUM]',
            '',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -x             an option  [required]',
            '  -y             another option',
            '',
            'Missing required argument: x',
          ]);
        r.logs.should.have.length(0);
        r.exit.should.equal(true);
      });
    });

    describe('with required option', () => {
      it('should report missing required arguments', () => {
        const r = checkUsage(() =>
          yargs('-y 10 -z 20')
            .usage('Usage: $0 -x NUM [-y NUM]')
            .options({
              x: {description: 'an option', required: true},
              y: {description: 'another option', required: false},
            })
            .wrap(null)
            .parse()
        );
        r.result.should.have.property('y', 10);
        r.result.should.have.property('z', 20);
        r.result.should.have.property('_').with.length(0);
        r.errors
          .join('\n')
          .split(/\n/)
          .should.deep.equal([
            'Usage: usage -x NUM [-y NUM]',
            '',
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -x             an option  [required]',
            '  -y             another option',
            '',
            'Missing required argument: x',
          ]);
        r.logs.should.have.length(0);
        r.exit.should.equal(true);
      });
    });

    it('should not report missing required arguments when given an alias', () => {
      const r = checkUsage(() =>
        yargs('-w 10')
          .usage('Usage: $0 --width NUM [--height NUM]')
          .options({
            width: {description: 'Width', alias: 'w', demand: true},
            height: {description: 'Height', alias: 'h', demand: false},
          })
          .wrap(null)
          .parse()
      );
      r.result.should.have.property('w', 10);
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('errors').with.length(0);
      r.logs.should.have.length(0);
    });
  });

  describe('help option', () => {
    it('should display usage', () => {
      const r = checkUsage(() =>
        yargs(['--help']).demand(['y']).wrap(null).parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('errors');
      r.should.have.property('logs').with.length(1);
      r.should.have.property('exit').and.equal(true);
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -y  [required]',
        ]);
    });

    it('should not show both dashed and camelCase aliases', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .usage('Usage: $0 options')
          .describe('some-opt', 'Some option')
          .default('some-opt', 2)
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('exit').and.equal(true);
      r.should.have.property('errors').with.length(0);
      r.should.have.property('logs');
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Usage: usage options',
          'Options:',
          '  --help      Show help  [boolean]',
          '  --version   Show version number  [boolean]',
          '  --some-opt  Some option  [default: 2]',
        ]);
    });

    it('should use 2 dashes for general 1-digit usage', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('1', {
            type: 'string',
            description: 'First one',
            default: 'first',
          })
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('exit').and.equal(true);
      r.should.have.property('errors').with.length(0);
      r.should.have.property('logs');
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  --1        First one  [string] [default: "first"]',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('should use single dashes for 1-digit boolean key usage', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('1', {
            type: 'boolean',
            description: 'Negative one',
          })
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('exit').and.equal(true);
      r.should.have.property('errors').with.length(0);
      r.should.have.property('logs');
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  -1             Negative one  [boolean]',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
        ]);
    });

    it('should use single dashes for 1-digit boolean alias usage', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('negativeone', {
            alias: '1',
            type: 'boolean',
            description: 'Negative one',
          })
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('exit').and.equal(true);
      r.should.have.property('errors').with.length(0);
      r.should.have.property('logs');
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --help         Show help  [boolean]',
          '      --version      Show version number  [boolean]',
          '  -1, --negativeone  Negative one  [boolean]',
        ]);
    });

    it('should use 2 dashes for multiple-digit alias usage', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('onehundred', {
            alias: '100',
            type: 'boolean',
            description: 'one hundred',
          })
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('exit').and.equal(true);
      r.should.have.property('errors').with.length(0);
      r.should.have.property('logs');
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  --help               Show help  [boolean]',
          '  --version            Show version number  [boolean]',
          '  --onehundred, --100  one hundred  [boolean]',
        ]);
    });

    describe('when exitProcess is false', () => {
      it('should not validate arguments (required argument)', () => {
        const r = checkUsage(() =>
          yargs(['--help'])
            .usage('Usage: $0 options')
            .alias('help', 'h')
            .describe('some-opt', 'Some option')
            .demand('some-opt')
            .wrap(null)
            .exitProcess(false)
            .parse()
        );
        r.should.have.property('result');
        r.result.should.have.property('_').with.length(0);
        r.result.should.have.property('help').and.equal(true);
        r.result.should.have.property('h').and.equal(true);
        r.should.have.property('exit').and.equal(false);
        r.should.have.property('errors').with.length(0);
        r.should.have.property('logs');
        r.logs
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage options',
            'Options:',
            '  -h, --help      Show help  [boolean]',
            '      --version   Show version number  [boolean]',
            '      --some-opt  Some option  [required]',
          ]);
      });

      // We need both this and the previous spec because a required argument
      // is a validation error and nargs is a parse error
      it('should not validate arguments (nargs)', () => {
        const r = checkUsage(() =>
          yargs(['--help', '--some-opt'])
            .usage('Usage: $0 options')
            .alias('help', 'h')
            .describe('some-opt', 'Some option')
            .demand('some-opt')
            .nargs('some-opt', 3)
            .wrap(null)
            .exitProcess(false)
            .parse()
        );
        r.should.have.property('result');
        r.result.should.have.property('_').with.length(0);
        r.result.should.have.property('help').and.equal(true);
        r.result.should.have.property('h').and.equal(true);
        r.should.have.property('exit').and.equal(false);
        r.should.have.property('errors').with.length(0);
        r.should.have.property('logs');
        r.logs
          .join('\n')
          .split(/\n+/)
          .should.deep.equal([
            'Usage: usage options',
            'Options:',
            '  -h, --help      Show help  [boolean]',
            '      --version   Show version number  [boolean]',
            '      --some-opt  Some option  [required]',
          ]);
      });
    });
  });

  describe('version option', () => {
    it('should display version', () => {
      const r = checkUsage(() =>
        yargs(['--version'])
          .version('version', 'Show version number', '1.0.1')
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('errors');
      r.should.have.property('logs').with.length(1);
      r.should.have.property('exit').and.equal(true);
      r.logs[0].should.eql('1.0.1');
    });

    it('accepts version option as first argument, and version number as second argument', () => {
      const r = checkUsage(() =>
        yargs(['--version']).version('version', '1.0.0').wrap(null).parse()
      );
      r.logs[0].should.eql('1.0.0');
    });

    it("should default to 'version' as version option", () => {
      const r = checkUsage(() =>
        yargs(['--version']).version('1.0.2').wrap(null).parse()
      );
      r.logs[0].should.eql('1.0.2');
    });

    // Addresses: https://github.com/yargs/yargs/issues/1979
    describe('when an option or alias "version" is set', () => {
      it('fails unless version is disabled', done => {
        yargs
          .command('cmd1', 'cmd desc', yargs =>
            yargs.option('v', {
              alias: 'version',
              describe: 'version desc',
              type: 'string',
            })
          )
          .fail(msg => {
            msg.should.match(/reserved word/);
            return done();
          })
          .wrap(null)
          .parse('cmd1 --version 0.25.10');
      });

      it('works if version is disabled', () => {
        yargs
          .command(
            'cmd1',
            'cmd1 desc',
            yargs =>
              yargs.version(false).option('version', {
                alias: 'v',
                describe: 'version desc',
                type: 'string',
              }),
            argv => {
              argv.version.should.equal('0.25.10');
            }
          )
          .fail(() => {
            expect.fail();
          })
          .parse('cmd1 --version 0.25.10');
      });
    });

    describe('when exitProcess is false', () => {
      it('should not validate arguments (required argument)', () => {
        const r = checkUsage(() =>
          yargs(['--version'])
            .version('version', 'Show version number', '1.0.1')
            .demand('some-opt')
            .wrap(null)
            .exitProcess(false)
            .parse()
        );
        r.should.have.property('result');
        r.result.should.have.property('_').with.length(0);
        r.result.should.have.property('version').and.equal(true);
        r.should.have.property('exit').and.equal(false);
        r.should.have.property('errors').with.length(0);
        r.should.have.property('logs');
        r.logs[0].should.eql('1.0.1');
      });

      // We need both this and the previous spec because a required argument
      // is a validation error and nargs is a parse error
      it('should not validate arguments (nargs)', () => {
        const r = checkUsage(() =>
          yargs(['--version', '--some-opt'])
            .nargs('some-opt', 3)
            .version('version', 'Show version number', '1.0.1')
            .wrap(null)
            .exitProcess(false)
            .parse()
        );
        r.should.have.property('result');
        r.result.should.have.property('_').with.length(0);
        r.result.should.have.property('version').and.equal(true);
        r.should.have.property('exit').and.equal(false);
        r.should.have.property('errors').with.length(0);
        r.should.have.property('logs');
        r.logs[0].should.eql('1.0.1');
      });
    });
  });

  describe('showHelpOnFail', () => {
    it('should display user supplied message', () => {
      const opts = {
        foo: {desc: 'foo option', alias: 'f'},
        bar: {desc: 'bar option', alias: 'b'},
      };

      const r = checkUsage(() =>
        yargs(['--foo'])
          .usage('Usage: $0 [options]')
          .options(opts)
          .demand(['foo', 'bar'])
          .showHelpOnFail(false, 'Specify --help for available options')
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('errors');
      r.should.have.property('logs').with.length(0);
      r.should.have.property('exit').and.equal(true);
      r.errors
        .join('\n')
        .split(/\n/)
        .should.deep.equal([
          'Missing required argument: bar',
          '',
          'Specify --help for available options',
        ]);
    });
  });

  describe('exitProcess', () => {
    it('should not call process.exit on error if disabled', () => {
      const opts = {
        foo: {desc: 'foo option', alias: 'f'},
      };

      const r = checkUsage(() =>
        yargs(['--foo'])
          .exitProcess(false)
          .usage('Usage: $0 [options]')
          .options(opts)
          .demand(['foo'])
          .wrap(null)
          .parse()
      );
      r.should.have.property('result');
      r.result.should.have.property('_').with.length(0);
      r.should.have.property('errors');
      r.should.have.property('logs').with.length(0);
      r.should.have.property('exit').and.equal(false);
    });
  });

  describe('scriptName', () => {
    it('should display user supplied scriptName', () => {
      const r = checkUsage(() =>
        yargs(['--help']).scriptName('custom').command('command').parse()
      );
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'custom [command]',
          'Commands:',
          '  custom command',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
      r.errors.should.have.length(0);
      r.exit.should.equal(true);
    });

    it('should not alter the user supplied scriptName', () => {
      const r = checkUsage(() =>
        yargs(['--help']).scriptName('./custom').command('command').parse()
      );
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          './custom [command]',
          'Commands:',
          '  ./custom command',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
      r.errors.should.have.length(0);
      r.exit.should.equal(true);
    });
  });

  it('should not print usage string if help() is called without arguments', () => {
    const r = checkUsage(() => yargs([]).usage('foo').help().parse());

    r.logs.length.should.equal(0);
  });

  it('should add --help as an option for printing usage text if help() is called without arguments', () => {
    const r = checkUsage(() => yargs(['--help']).usage('foo').help().parse());

    r.logs.length.should.not.equal(0);
  });

  describe('wrap', () => {
    it('should wrap argument descriptions onto multiple lines', () => {
      const r = checkUsage(() =>
        yargs([])
          .option('fairly-long-option', {
            alias: 'f',
            default: 'fairly-long-default',
            description:
              'npm prefix used to locate globally installed npm packages',
          })
          .demand('foo')
          .wrap(50)
          .parse()
      );

      r.errors[0].split('\n').forEach((line, i) => {
        if (!i || !line) return; // ignore first and last line.
        line.length.should.lte(50);
      });
    });

    it('should wrap based on window-size if no wrap is provided', function () {
      if (!process.stdout.isTTY) {
        return this.skip();
      }

      const width = process.stdout.columns;

      const r = checkUsage(() =>
        yargs([])
          .option('fairly-long-option', {
            alias: 'f',
            // create a giant string that should wrap.
            description: new Array((width + 1) * 5).join('s'),
          })
          .demand('foo')
          .parse()
      );

      // the long description should cause several line
      // breaks when wrapped.
      r.errors[0].split('\n').length.should.gte(4);
    });

    it('should not raise an exception when long default and description are provided', () =>
      yargs([])
        .option('fairly-long-option', {
          alias: 'f',
          default: 'npm prefix used to locate globally installed npm packages',
          description:
            'npm prefix used to locate globally installed npm packages',
        })
        .wrap(40)
        .help());

    it('should wrap the left-hand-column if it takes up more than 50% of the screen', () => {
      const r = checkUsage(() =>
        yargs([])
          .example(
            'i am a fairly long example',
            'description that is also fairly long'
          )
          .demand('foo')
          .wrap(40)
          .parse()
      );

      // should split example usage onto multiple lines.
      r.errors[0].split('\n').length.should.equal(10);

      // should wrap within appropriate boundaries.
      r.errors[0].split('\n').forEach((line, i) => {
        // ignore headings and blank lines.
        if (!line || line.match('Examples:') || line.match('Options:')) return;

        line.length.should.lte(40);
      });
    });

    it('should not wrap left-hand-column if no description is provided', () => {
      const r = checkUsage(() =>
        yargs([])
          .example('i am a fairly long example that is like really long woooo')
          .demand('foo')
          .wrap(50)
          .parse()
      );

      r.errors[0].split('\n').forEach((line, i) => {
        // ignore headings and blank lines.
        if (!line.match('i am a fairly long example')) return;

        // with two white space characters on the left,
        // line length should be 50 - 2
        line.length.should.equal(48);
      });
    });

    it('should wrap the usage string', () => {
      const r = checkUsage(() =>
        yargs([])
          .usage('i am a fairly long usage string look at me go.')
          .demand('foo')
          .wrap(20)
          .parse()
      );

      // the long usage string should cause line-breaks.
      r.errors[0].split('\n').length.should.gt(6);
    });

    it('should align span columns when ansi colors are not used in a description', () => {
      const noColorAddedDescr = 'The file to add or remove';

      const r = checkUsage(() =>
        yargs(['-h'])
          .option('f', {
            alias: 'file',
            describe: noColorAddedDescr,
            demand: true,
            type: 'string',
          })
          .help('h')
          .alias('h', 'help')
          .wrap(80)
          .parse()
      );

      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --version  Show version number                                   [boolean]',
          `  -f, --file     ${noColorAddedDescr}                   [string] [required]`,
          '  -h, --help     Show help                                             [boolean]',
        ]);
    });

    it('should align span columns when ansi colors are used in a description', () => {
      const yellowDescription = chalk.yellow('The file to add or remove');

      const r = checkUsage(() =>
        yargs(['-h'])
          .option('f', {
            alias: 'file',
            describe: yellowDescription,
            demand: true,
            type: 'string',
          })
          .help('h')
          .alias('h', 'help')
          .wrap(80)
          .parse()
      );

      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --version  Show version number                                   [boolean]',
          `  -f, --file     ${yellowDescription}                   [string] [required]`,
          '  -h, --help     Show help                                             [boolean]',
        ]);
    });
  });

  describe('commands', () => {
    it('should output a list of available commands', () => {
      const r = checkUsage(() =>
        yargs('')
          .command('upload', 'upload something')
          .command('download', 'download something from somewhere')
          .demand('y')
          .wrap(null)
          .parse()
      );

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'usage [command]',
          'Commands:',
          '  usage upload    upload something',
          '  usage download  download something from somewhere',
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -y  [required]',
          'Missing required argument: y',
        ]);
    });

    it('should not show hidden commands', () => {
      const r = checkUsage(() =>
        yargs('')
          .command('upload', 'upload something')
          .command('secret', false)
          .demand('y')
          .wrap(null)
          .parse()
      );

      r.errors
        .join('\n')
        .split(/\s+/)
        .should.deep.equal([
          'usage',
          '[command]',
          'Commands:',
          'usage',
          'upload',
          'upload',
          'something',
          'Options:',
          '--help',
          'Show',
          'help',
          '[boolean]',
          '--version',
          'Show',
          'version',
          'number',
          '[boolean]',
          '-y',
          '[required]',
          'Missing',
          'required',
          'argument:',
          'y',
        ]);
    });

    it('allows completion command to be hidden', () => {
      const r = checkUsage(() =>
        yargs('')
          .command('upload', 'upload something')
          .completion('completion', false)
          .demand('y')
          .wrap(null)
          .parse()
      );

      r.errors
        .join('\n')
        .split(/\s+/)
        .should.deep.equal([
          'usage',
          '[command]',
          'Commands:',
          'usage',
          'upload',
          'upload',
          'something',
          'Options:',
          '--help',
          'Show',
          'help',
          '[boolean]',
          '--version',
          'Show',
          'version',
          'number',
          '[boolean]',
          '-y',
          '[required]',
          'Missing',
          'required',
          'argument:',
          'y',
        ]);
    });

    it('preserves global wrap() for commands that do not override it', () => {
      const uploadCommand = 'upload <dest>';
      const uploadDesc = 'Upload cwd to remote destination';
      const uploadOpts = {
        force: {
          describe: 'Force overwrite of remote directory contents',
          type: 'boolean',
        },
      };
      const uploadHandler = argv => {};

      const generalHelp = checkUsage(() =>
        yargs('--help')
          .command(uploadCommand, uploadDesc, uploadOpts, uploadHandler)
          .wrap(null)
          .parse()
      );
      const commandHelp = checkUsage(() =>
        yargs('upload --help')
          .command(uploadCommand, uploadDesc, uploadOpts, uploadHandler)
          .wrap(null)
          .parse()
      );

      generalHelp.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [command]',
          '',
          'Commands:',
          '  usage upload <dest>  Upload cwd to remote destination',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
      commandHelp.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage upload <dest>',
          '',
          'Upload cwd to remote destination',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
          '  --force    Force overwrite of remote directory contents  [boolean]',
        ]);
    });

    it('allows a command to override global wrap()', () => {
      const uploadCommand = 'upload <dest>';
      const uploadDesc = 'Upload cwd';
      const uploadBuilder = yargs =>
        yargs
          .option('force', {
            describe: 'Force overwrite of remote directory contents',
            type: 'boolean',
          })
          .wrap(46);
      const uploadHandler = argv => {};

      const generalHelp = checkUsage(() =>
        yargs('--help')
          .command(uploadCommand, uploadDesc, uploadBuilder, uploadHandler)
          .wrap(null)
          .parse()
      );
      const commandHelp = checkUsage(() =>
        yargs('upload --help')
          .command(uploadCommand, uploadDesc, uploadBuilder, uploadHandler)
          .wrap(null)
          .parse()
      );

      generalHelp.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [command]',
          '',
          'Commands:',
          '  usage upload <dest>  Upload cwd',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
      commandHelp.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage upload <dest>',
          '',
          'Upload cwd',
          '',
          'Options:',
          '  --help     Show help               [boolean]',
          '  --version  Show version number     [boolean]',
          '  --force    Force overwrite of remote',
          '             directory contents      [boolean]',
        ]);
    });

    it('resets groups for a command handler, respecting order', () => {
      const r = checkUsage(() =>
        yargs(['upload', '-h'])
          .command('upload', 'upload something', yargs =>
            yargs
              .option('q', {
                type: 'boolean',
                group: 'Flags:',
              })
              .help('h')
              .group('h', 'Global Flags:')
              .wrap(null)
          )
          .help('h')
          .group('h', 'Global Flags:')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage upload',
          '',
          'upload something',
          '',
          'Flags:',
          '  -q  [boolean]',
          '',
          'Global Flags:',
          '  -h  Show help  [boolean]',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
        ]);
    });

    it('allows global option to be disabled', () => {
      const r = checkUsage(() =>
        yargs(['upload', '-h'])
          .command('upload', 'upload something', yargs =>
            yargs
              .option('q', {
                type: 'boolean',
                group: 'Flags:',
              })
              .wrap(null)
          )
          .option('i', {
            type: 'boolean',
            global: true,
            group: 'Awesome Flags:',
          })
          .option('j', {
            type: 'boolean',
            global: false, // not global so not preserved, even though the group is
            group: 'Awesome Flags:',
          })
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage upload',
          '',
          'upload something',
          '',
          'Flags:',
          '  -q  [boolean]',
          '',
          'Awesome Flags:',
          '  -i  [boolean]',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
        ]);
    });

    it('can add to preserved groups', () => {
      const r = checkUsage(() =>
        yargs(['upload', '-h'])
          .command('upload', 'upload something', yargs =>
            yargs
              .option('q', {
                type: 'boolean',
                group: 'Awesome Flags:',
              })
              .wrap(null)
          )
          .option('i', {
            type: 'boolean',
            global: true,
            group: 'Awesome Flags:',
          })
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage upload',
          '',
          'upload something',
          '',
          'Awesome Flags:',
          '  -i  [boolean]',
          '  -q  [boolean]',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
        ]);
    });

    it('can bump up preserved groups', () => {
      const r = checkUsage(() =>
        yargs(['upload', '-h'])
          .command('upload', 'upload something', yargs =>
            yargs
              .group([], 'Awesome Flags:')
              .option('q', {
                type: 'boolean',
                group: 'Flags:',
              })
              .wrap(null)
          )
          .option('i', {
            type: 'boolean',
            global: true,
            group: 'Awesome Flags:',
          })
          .option('j', {
            type: 'boolean',
            global: false, // not global so not preserved, even though the group is
            group: 'Awesome Flags:',
          })
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage upload',
          '',
          'upload something',
          '',
          'Awesome Flags:',
          '  -i  [boolean]',
          '',
          'Flags:',
          '  -q  [boolean]',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
        ]);
    });

    it('should display global non empty groups for commands', () => {
      const r = checkUsage(() =>
        yargs(['upload', '-h'])
          .command('upload', 'upload something', yargs =>
            yargs
              .option('q', {
                type: 'boolean',
              })
              .wrap(null)
          )
          .option('i', {
            type: 'boolean',
            global: true,
          })
          .option('j', {
            type: 'boolean',
            global: false, // not global so not preserved, even though the group is
          })
          .group(['i', 'j'], 'Awesome Flags:')
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage upload',
          '',
          'upload something',
          '',
          'Awesome Flags:',
          '  -i  [boolean]',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
          '  -q  [boolean]',
        ]);
    });

    it('should display global non empty groups for subcommands', () => {
      const r = checkUsage(() =>
        yargs(['do', 'upload', '-h'])
          .command('do', 'do something', yargs =>
            yargs
              .command('upload', 'upload something', yargs =>
                yargs
                  .option('q', {
                    type: 'boolean',
                  })
                  .wrap(null)
              )
              .wrap(null)
          )
          .option('i', {
            type: 'boolean',
            global: true,
          })
          .option('j', {
            type: 'boolean',
            global: false, // not global so not preserved, even though the group is
          })
          .group(['i', 'j'], 'Awesome Flags:')
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage do upload',
          '',
          'upload something',
          '',
          'Awesome Flags:',
          '  -i  [boolean]',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
          '  -q  [boolean]',
        ]);
    });

    it('should list a module command only once', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .command('upload', 'upload something', {
            builder(yargs) {
              return yargs;
            },
            handler(argv) {},
          })
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [command]',
          '',
          'Commands:',
          '  usage upload  upload something',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('allows a builder function to override default usage() string', () => {
      const r = checkUsage(() =>
        yargs('upload --help')
          .command('upload', 'upload something', {
            builder(yargs) {
              return yargs
                .usage('Usage: program upload <something> [opts]')
                .demand(1);
            },
            handler(argv) {},
          })
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Usage: program upload <something> [opts]',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('allows a builder function to disable default usage() with null', () => {
      const r = checkUsage(() =>
        yargs('upload --help')
          .command(
            'upload',
            'upload something',
            yargs => yargs.usage(null),
            argv => {}
          )
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('displays given command chain with positional args in default usage for subcommand with builder object', () => {
      const r = checkUsage(() =>
        yargs('one two --help')
          .command(
            'one <sub>',
            'level one, requires subcommand',
            yargs => yargs.command('two [next]', 'level two', {}, argv => {}),
            argv => {}
          )
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage one two [next]',
          '',
          'level two',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('displays given command chain with positional args in default usage for subcommand with builder function', () => {
      const r = checkUsage(() =>
        yargs('one two --help')
          .command(
            'one <sub>',
            'level one, requires subcommand',
            yargs =>
              yargs.command(
                'two [next]',
                'level two',
                yargs => yargs,
                argv => {}
              ),
            argv => {}
          )
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage one two [next]',
          '',
          'level two',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('displays aliases for commands that have them (no wrap)', () => {
      const r = checkUsage(() =>
        yargs('help')
          .command(['copy <src> [dest]', 'cp', 'dupe'], 'Copy something')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [command]',
          '',
          'Commands:',
          '  usage copy <src> [dest]  Copy something  [aliases: cp, dupe]',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('displays aliases for commands that have them (with wrap)', () => {
      const r = checkUsage(() =>
        yargs('help')
          .command(['copy <src> [dest]', 'cp', 'dupe'], 'Copy something')
          .wrap(80)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [command]',
          '',
          'Commands:',
          '  usage copy <src> [dest]  Copy something                    [aliases: cp, dupe]',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('allows a builder to add more than one usage with multiple usage calls', () => {
      const r = checkUsage(() =>
        yargs('upload --help')
          .command(
            'upload',
            'upload something',
            yargs =>
              yargs
                .usage('$0 upload [something]')
                .usage('$0 upload [something else]'),
            argv => {}
          )
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage upload [something]',
          'usage upload [something else]',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('allows a builder to disable usage with null after mutiple usage calls', () => {
      const r = checkUsage(() =>
        yargs('upload --help')
          .command(
            'upload',
            'upload something',
            yargs =>
              yargs
                .usage('$0 upload [something]')
                .usage('$0 upload [something else]')
                .usage(null),
            argv => {}
          )
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('does not display $0 twice when default commands are enabled', () => {
      const r = checkUsage(() =>
        yargs('-h')
          .usage('$0', 'do something', yargs => {
            yargs.alias('h', 'help');
          })
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage',
          '',
          'do something',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h, --help     Show help  [boolean]',
        ]);
    });
  });

  describe('epilogue', () => {
    it('should display an epilog message at the end of the usage instructions', () => {
      const r = checkUsage(() =>
        yargs('')
          .epilog('for more info view the manual at http://example.com')
          .demand('y')
          .wrap(null)
          .parse()
      );

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -y  [required]',
          'for more info view the manual at http://example.com',
          'Missing required argument: y',
        ]);
    });

    it('supports multiple epilogs', () => {
      const r = checkUsage(() =>
        yargs('')
          .epilog('for more info view the manual at http://example.com')
          .epilog(
            'you can also find us on slack at http://devtoolscommunity.herokuapp.com'
          )
          .epilog(
            'keep up to date by reading our blog at http://yargs.js.org/blog.html'
          )
          .demand('y')
          .wrap(null)
          .parse()
      );

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -y  [required]',
          'for more info view the manual at http://example.com',
          'you can also find us on slack at http://devtoolscommunity.herokuapp.com',
          'keep up to date by reading our blog at http://yargs.js.org/blog.html',
          'Missing required argument: y',
        ]);
    });

    it('replaces $0 in epilog string', () => {
      const r = checkUsage(() =>
        yargs('')
          .epilog("Try '$0 --long-help' for more information")
          .demand('y')
          .wrap(null)
          .parse()
      );

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -y  [required]',
          "Try 'usage --long-help' for more information",
          'Missing required argument: y',
        ]);
    });
  });

  describe('default', () => {
    it('should indicate that the default is a generated-value, if function is provided', () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .help('h')
          .default('f', () => 99)
          .wrap(null)
          .parse()
      );

      r.logs[0].should.include('default: (generated-value)');
    });

    it('if a named function is provided, should use name rather than (generated-value)', () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .help('h')
          .default('f', function randomNumber() { // eslint-disable-line
            return Math.random() * 256;
          })
          .wrap(null)
          .parse()
      );
      r.logs[0].should.include('default: (random-number)');
    });

    it('default-description take precedence if one is provided', () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .help('h')
          .default(
            'f',
            () => {
              return Math.random() * 256;
            },
            'foo-description'
          )
          .wrap(null)
          .parse()
      );

      r.logs[0].should.include('default: foo-description');
    });

    it('serializes object and array defaults', () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .help('h')
          .default('a', [])
          .default('a2', [3])
          .default('o', {a: '33'})
          .wrap(null)
          .parse()
      );

      r.logs[0].should.include('default: []');
      r.logs[0].should.include('default: {"a":"33"}');
      r.logs[0].should.include('default: [3]');
    });
  });

  describe('defaultDescription', () => {
    describe('using option() without default()', () => {
      it('should output given desc with default value', () => {
        const r = checkUsage(() =>
          yargs(['-h'])
            .help('h')
            .option('port', {
              describe: 'The port value for URL',
              defaultDescription: '80 for HTTP and 443 for HTTPS',
              default: 80,
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });

      it('should output given desc without default value', () => {
        const r = checkUsage(() =>
          yargs(['-h'])
            .help('h')
            .option('port', {
              describe: 'The port value for URL',
              defaultDescription: '80 for HTTP and 443 for HTTPS',
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });

      it('should prefer given desc over function desc', () => {
        const r = checkUsage(() =>
          yargs(['-h'])
            .help('h')
            .option('port', {
              describe: 'The port value for URL',
              defaultDescription: '80 for HTTP and 443 for HTTPS',
              default: function determinePort() {
                return 80;
              },
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });
    });

    describe('using option() with default()', () => {
      it('should prefer default() desc when given last', () => {
        const r = checkUsage(() =>
          yargs(['-h'])
            .help('h')
            .option('port', {
              describe: 'The port value for URL',
              defaultDescription: 'depends on protocol',
            })
            .default('port', null, '80 for HTTP and 443 for HTTPS')
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });

      it('should prefer option() desc when given last', () => {
        const r = checkUsage(() =>
          yargs(['-h'])
            .help('h')
            .default('port', null, '80 for HTTP and 443 for HTTPS')
            .option('port', {
              describe: 'The port value for URL',
              defaultDescription: 'depends on protocol',
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: depends on protocol');
      });

      it('should prefer option() desc over default() function', () => {
        const r = checkUsage(() =>
          yargs(['-h'])
            .help('h')
            .option('port', {
              describe: 'The port value for URL',
              defaultDescription: '80 for HTTP and 443 for HTTPS',
            })
            .default('port', () => {
              return 80;
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });
    });

    describe('using positional() without default()', () => {
      it('should output given desc with default value', () => {
        const r = checkUsage(() =>
          yargs(['url', '-h'])
            .help('h')
            .command('url', 'Print a URL', yargs => {
              yargs.positional('port', {
                describe: 'The port value for URL',
                defaultDescription: '80 for HTTP and 443 for HTTPS',
                default: 80,
              });
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });

      it('should output given desc without default value', () => {
        const r = checkUsage(() =>
          yargs(['url', '-h'])
            .help('h')
            .command('url', 'Print a URL', yargs => {
              yargs.positional('port', {
                describe: 'The port value for URL',
                defaultDescription: '80 for HTTP and 443 for HTTPS',
              });
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });

      it('should prefer given desc over function desc', () => {
        const r = checkUsage(() =>
          yargs(['url', '-h'])
            .help('h')
            .command('url', 'Print a URL', yargs => {
              yargs.positional('port', {
                describe: 'The port value for URL',
                defaultDescription: '80 for HTTP and 443 for HTTPS',
                default: function determinePort() {
                  return 80;
                },
              });
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });
    });

    describe('using positional() with default()', () => {
      it('should prefer default() desc when given last', () => {
        const r = checkUsage(() =>
          yargs(['url', '-h'])
            .help('h')
            .command('url', 'Print a URL', yargs => {
              yargs
                .positional('port', {
                  describe: 'The port value for URL',
                  defaultDescription: 'depends on protocol',
                })
                .default('port', null, '80 for HTTP and 443 for HTTPS');
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });

      it('should prefer positional() desc when given last', () => {
        const r = checkUsage(() =>
          yargs(['url', '-h'])
            .help('h')
            .command('url', 'Print a URL', yargs => {
              yargs
                .default('port', null, '80 for HTTP and 443 for HTTPS')
                .positional('port', {
                  describe: 'The port value for URL',
                  defaultDescription: 'depends on protocol',
                });
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: depends on protocol');
      });

      it('should prefer positional() desc over default() function', () => {
        const r = checkUsage(() =>
          yargs(['url', '-h'])
            .help('h')
            .command('url', 'Print a URL', yargs => {
              yargs
                .positional('port', {
                  describe: 'The port value for URL',
                  defaultDescription: '80 for HTTP and 443 for HTTPS',
                })
                .default('port', () => {
                  return 80;
                });
            })
            .wrap(null)
            .parse()
        );

        r.logs[0].should.include('default: 80 for HTTP and 443 for HTTPS');
      });
    });
  });

  describe('normalizeAliases', () => {
    // see #128
    it("should display 'description' string in help message if set for alias", () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .describe('foo', 'foo option')
          .alias('f', 'foo')
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
          '  -f, --foo      foo option',
        ]);
    });

    it("should display 'required' string in help message if set for alias", () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .demand('foo')
          .alias('f', 'foo')
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
          '  -f, --foo  [required]',
        ]);
    });

    it("should display 'type' string in help message if set for alias", () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .string('foo')
          .describe('foo', 'bar')
          .alias('f', 'foo')
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
          '  -f, --foo      bar  [string]',
        ]);
    });

    it("should display 'type' number in help message if set for alias", () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .string('foo')
          .describe('foo', 'bar')
          .alias('f', 'foo')
          .number(['foo'])
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
          '  -f, --foo      bar  [number]',
        ]);
    });
  });

  describe('showHelp', () => {
    // see #143.
    it('should show help regardless of whether argv has been called', () => {
      const r = checkUsage(() => {
        const y = yargs(['--foo'])
          .options('foo', {
            alias: 'f',
            describe: 'foo option',
          })
          .wrap(null);

        y.showHelp();
      });

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -f, --foo      foo option',
        ]);
    });

    it('should print the help using console.error when no arguments were specified', () => {
      const r = checkUsage(() => {
        const y = yargs(['--foo'])
          .options('foo', {
            alias: 'f',
            describe: 'foo option',
          })
          .wrap(null);

        y.showHelp();
      });

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -f, --foo      foo option',
        ]);
    });

    it('should call the correct console.log method when specified', () => {
      const r = checkUsage(() => {
        const y = yargs(['--foo'])
          .options('foo', {
            alias: 'f',
            describe: 'foo option',
          })
          .wrap(null);

        y.showHelp('log');
      });

      r.errors.length.should.eql(0);
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '      --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '  -f, --foo      foo option',
        ]);
    });

    it('should call the callback to print when specified', done => {
      const y = yargs(['--foo'])
        .options('foo', {
          alias: 'f',
          describe: 'foo option',
        })
        .wrap(null);

      y.showHelp(printCallback);
      function printCallback(msg) {
        msg
          .split(/\n+/)
          .should.deep.equal([
            'Options:',
            '      --help     Show help  [boolean]',
            '      --version  Show version number  [boolean]',
            '  -f, --foo      foo option',
          ]);
        return done();
      }
    });
    it('should not run handler or middleware', done => {
      let commandRun = false;
      let middlewareRun = false;
      const y = yargs(['foo'])
        .command(
          'foo',
          'foo command',
          () => {},
          () => {
            commandRun = true;
          }
        )
        .middleware(() => {
          middlewareRun = true;
        });
      y.showHelp(printCallback);
      function printCallback(msg) {
        commandRun.should.equal(false);
        middlewareRun.should.equal(false);
        msg.should.match(/foo command/);
        return done();
      }
    });
    // See: https://github.com/yargs/yargs/issues/1791
    it('should not run default command', done => {
      let executed = false;
      yargs.command(
        '$0',
        'a default command',
        yargs => yargs,
        () => {
          executed = true;
        }
      );
      yargs.showHelp(output => {
        executed.should.equal(false);
        output.should.match(/a default command/);
        return done();
      });
    });
  });

  describe('showVersion', () => {
    // see #143.
    it('should show version regardless of whether argv has been called', () => {
      const r = checkUsage(() => {
        const y = yargs().version('1.0.0').wrap(null);

        y.showVersion();
      });

      r.errors.join('\n').split(/\n+/).should.deep.equal(['1.0.0']);
    });

    it('should call the correct console.log method when specified', () => {
      const r = checkUsage(() => {
        const y = yargs().version('1.0.0').wrap(null);

        y.showVersion('log');
      });

      r.errors.length.should.eql(0);
      r.logs.join('\n').split(/\n+/).should.deep.equal(['1.0.0']);
    });

    it('should call the callback to print when specified', done => {
      const y = yargs().version('1.0.0').wrap(null);

      y.showVersion(printCallback);

      function printCallback(msg) {
        msg.split(/\n+/).should.deep.equal(['1.0.0']);
        return done();
      }
    });
  });

  describe('$0', () => {
    function mockProcessArgv(argv, cb) {
      const argvOld = process.argv;
      process.argv = argv;
      // cb must be sync for now
      try {
        cb();
        process.argv = argvOld;
      } catch (err) {
        process.argv = argvOld;
        throw err;
      }
    }

    it('is detected correctly for a basic script', () => {
      mockProcessArgv(['script.js'], () => {
        yargs([]).$0.should.equal('script.js');
      });
    });

    it('is detected correctly when argv contains "node"', () => {
      mockProcessArgv(['node', 'script.js'], () => {
        yargs([]).$0.should.equal('script.js');
      });
    });

    it('is detected correctly when dirname contains "node"', () => {
      mockProcessArgv(['/code/node/script.js'], () => {
        yargs([]).$0.should.equal('/code/node/script.js');
      });
    });

    it('is detected correctly when dirname and argv contain "node"', () => {
      mockProcessArgv(['node', '/code/node/script.js'], () => {
        yargs([]).$0.should.equal('/code/node/script.js');
      });
    });

    it('is detected correctly when argv contains "iojs"', () => {
      mockProcessArgv(['iojs', 'script.js'], () => {
        yargs([]).$0.should.equal('script.js');
      });
    });

    it('is detected correctly when dirname contains "iojs"', () => {
      mockProcessArgv(['/code/iojs/script.js'], () => {
        yargs([]).$0.should.equal('/code/iojs/script.js');
      });
    });

    it('is detected correctly when dirname and argv contain "iojs"', () => {
      mockProcessArgv(['iojs', '/code/iojs/script.js'], () => {
        yargs([]).$0.should.equal('/code/iojs/script.js');
      });
    });

    it('is detected correctly when argv contains "node.exe"', () => {
      mockProcessArgv(['node.exe', 'script.js'], () => {
        yargs([]).$0.should.equal('script.js');
      });
    });

    it('is detected correctly when argv contains "iojs.exe"', () => {
      mockProcessArgv(['iojs.exe', 'script.js'], () => {
        yargs([]).$0.should.equal('script.js');
      });
    });

    if (process.platform !== 'win32') {
      it('is resolved to the relative path if it is shorter', () => {
        mockProcessArgv(['node', '/code/node/script.js'], () => {
          yargs([], '/code/python/').$0.should.equal('../node/script.js');
        });
      });

      it('is not resolved to the relative path if it is larger', () => {
        mockProcessArgv(['node', '/script.js'], () => {
          yargs([], '/very/long/current/directory/').$0.should.equal(
            '/script.js'
          );
        });
      });
    }

    if (process.platform === 'win32') {
      it('is resolved to the relative path if it is shorter, using Windows paths', () => {
        mockProcessArgv(['node.exe', 'C:\\code\\node\\script.js'], () => {
          yargs([], 'C:\\code\\python\\').$0.should.equal(
            '..\\node\\script.js'
          );
        });
      });

      it('is not resolved to the relative path if it is larger, using Windows paths', () => {
        mockProcessArgv(['node', 'C:\\script.js'], () => {
          yargs([], 'C:\\very\\long\\current\\directory\\').$0.should.equal(
            'C:\\script.js'
          );
        });
      });
    }
  });

  describe('choices', () => {
    it('should output choices when defined for non-hidden options', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('answer', {
            describe: 'does this look good?',
            choices: ['yes', 'no', 'maybe'],
          })
          .option('confidence', {
            describe: 'percentage of confidence',
            choices: [0, 25, 50, 75, 100],
          })
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help        Show help  [boolean]',
          '  --version     Show version number  [boolean]',
          '  --answer      does this look good?  [choices: "yes", "no", "maybe"]',
          '  --confidence  percentage of confidence  [choices: 0, 25, 50, 75, 100]',
        ]);
    });

    it('should not output choices when defined for hidden options', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('answer', {
            type: 'string',
            choices: ['yes', 'no', 'maybe'],
            hidden: true,
          })
          .option('confidence', {
            choices: [0, 25, 50, 75, 100],
            hidden: true,
          })
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });
  });

  describe('count', () => {
    it('should indicate when an option is a count', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('verbose', {
            describe: 'verbose level',
            count: true,
          })
          .help('help')
          .wrap(null)
          .parse()
      );

      r.logs.join(' ').should.match(/\[count]/);
    });
  });

  describe('array', () => {
    it('should indicate when an option is an array', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('arr', {
            describe: 'array option',
            array: true,
          })
          .help('help')
          .wrap(null)
          .parse()
      );

      r.logs.join(' ').should.match(/\[array]/);
    });
  });

  describe('group', () => {
    it('allows an an option to be placed in an alternative group', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .option('batman', {
            type: 'string',
            describe: "not the world's happiest guy",
            default: 'Bruce Wayne',
          })
          .group('batman', 'Heroes:')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Heroes:',
          '  --batman  not the world\'s happiest guy  [string] [default: "Bruce Wayne"]',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it("does not print the 'Options:' group if no keys are in it", () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .string('batman')
          .describe('batman', "not the world's happiest guy")
          .default('batman', 'Bruce Wayne')
          .group('batman', 'Heroes:')
          .group('h', 'Heroes:')
          .help('h')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Heroes:',
          '      --batman  not the world\'s happiest guy  [string] [default: "Bruce Wayne"]',
          '  -h            Show help  [boolean]',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
        ]);
    });

    it('displays alias keys appropriately within a grouping', () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .alias('h', 'help')
          .group('help', 'Magic Variable:')
          .group('version', 'Magic Variable:')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Magic Variable:',
          '  -h, --help     Show help  [boolean]',
          '      --version  Show version number  [boolean]',
        ]);
    });

    it('allows a group to be provided as the only information about an option', () => {
      const r = checkUsage(() =>
        yargs(['--help']).group('batman', 'Heroes:').wrap(null).parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Heroes:',
          '  --batman',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });

    it('allows multiple options to be grouped at the same time', () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .help('h')
          .group('h', 'Options:')
          .group(['batman', 'robin'], 'Heroes:')
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  -h             Show help  [boolean]',
          '      --version  Show version number  [boolean]',
          '',
          'Heroes:',
          '      --batman',
          '      --robin',
        ]);
    });

    it('allows group to be provided in the options object', () => {
      const r = checkUsage(() =>
        yargs(['-h'])
          .help('h')
          .option('batman', {
            group: 'Heroes:',
            string: true,
          })
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Heroes:',
          '      --batman  [string]',
          '',
          'Options:',
          '      --version  Show version number  [boolean]',
          '  -h             Show help  [boolean]',
        ]);
    });

    it('only displays a duplicated option once per group', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .group(['batman', 'batman'], 'Heroes:')
          .group('robin', 'Heroes:')
          .option('robin', {
            group: 'Heroes:',
          })
          .wrap(null)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Heroes:',
          '  --batman',
          '  --robin',
          '',
          'Options:',
          '  --help     Show help  [boolean]',
          '  --version  Show version number  [boolean]',
        ]);
    });
  });

  describe('cjk', () => {
    it('should calculate width of cjk text correctly', () => {
      const r = checkUsage(() => {
        const y = yargs()
          .example(
            '안녕하세요 선생님 안녕 친구야',
            '인사하는 어린이 착한 어린이'
          )
          .wrap(80);

        y.showHelp();
      });

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
          'Examples:',
          '  안녕하세요 선생님 안녕 친구야  인사하는 어린이 착한 어린이',
        ]);
    });
  });

  describe('default command', () => {
    it('should display top-level help with no command given', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .command(
            ['list [pattern]', 'ls', '*'],
            'List key-value pairs for pattern',
            {},
            noop
          )
          .command('get <key>', 'Get value for key', {}, noop)
          .command('set <key> [value]', 'Set value for key', {}, noop)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [pattern]',
          '',
          'List key-value pairs for pattern',
          '',
          'Commands:',
          '  usage list [pattern]     List key-value pairs for pattern',
          '                                                         [default] [aliases: ls]',
          '  usage get <key>          Get value for key',
          '  usage set <key> [value]  Set value for key',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('should display top-level help with sorting with no command given if sorting enabled', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .command(
            ['list [pattern]', 'ls', '*'],
            'List key-value pairs for pattern',
            {},
            noop
          )
          .command('get <key>', 'Get value for key', {}, noop)
          .command('set <key> [value]', 'Set value for key', {}, noop)
          .parserConfiguration({'sort-commands': true})
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [pattern]',
          '',
          'List key-value pairs for pattern',
          '',
          'Commands:',
          '  usage get <key>          Get value for key',
          '  usage list [pattern]     List key-value pairs for pattern',
          '                                                         [default] [aliases: ls]',
          '  usage set <key> [value]  Set value for key',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('should display default command as ./$0 if it has no aliases', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .command('* [pattern]', 'List key-value pairs for pattern', {}, noop)
          .command('get <key>', 'Get value for key', {}, noop)
          .command('set <key> [value]', 'Set value for key', {}, noop)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [pattern]',
          '',
          'List key-value pairs for pattern',
          '',
          'Commands:',
          '  usage [pattern]          List key-value pairs for pattern            [default]',
          '  usage get <key>          Get value for key',
          '  usage set <key> [value]  Set value for key',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('should display positionals that have been configured', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .command(
            '* [pattern]',
            'List key-value pairs for pattern',
            yargs => {
              yargs.positional('pattern', {
                type: 'string',
                default: '.*',
              });
            },
            noop
          )
          .command('get <key>', 'Get value for key', {}, noop)
          .command('set <key> [value]', 'Set value for key', {}, noop)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [pattern]',
          '',
          'List key-value pairs for pattern',
          '',
          'Commands:',
          '  usage [pattern]          List key-value pairs for pattern            [default]',
          '  usage get <key>          Get value for key',
          '  usage set <key> [value]  Set value for key',
          '',
          'Positionals:',
          '  pattern                                               [string] [default: ".*"]',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('should display options that have been configured', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .command(
            '* [pattern]',
            'List key-value pairs for pattern',
            {uuid: {required: true}},
            noop
          )
          .command('get <key>', 'Get value for key', {}, noop)
          .command('set <key> [value]', 'Set value for key', {}, noop)
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage [pattern]',
          '',
          'List key-value pairs for pattern',
          '',
          'Commands:',
          '  usage [pattern]          List key-value pairs for pattern            [default]',
          '  usage get <key>          Get value for key',
          '  usage set <key> [value]  Set value for key',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
          '  --uuid                                                              [required]',
        ]);
    });
  });

  describe('positional', () => {
    it('should display help section for positionals', () => {
      const r = checkUsage(() =>
        yargs('--help list')
          .command(
            'list [pattern]',
            'List key-value pairs for pattern',
            yargs => {
              yargs.positional('pattern', {
                describe: 'the pattern to list keys for',
              });
            }
          )
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage list [pattern]',
          '',
          'List key-value pairs for pattern',
          '',
          'Positionals:',
          '  pattern  the pattern to list keys for',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('shows that variadic positional arguments are arrays', () => {
      const r = checkUsage(() =>
        yargs('--help list')
          .command(
            'list [pattern...]',
            'List key-value pairs for pattern',
            yargs => {
              yargs.positional('pattern', {
                describe: 'the pattern to list keys for',
              });
            }
          )
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage list [pattern...]',
          '',
          'List key-value pairs for pattern',
          '',
          'Positionals:',
          '  pattern  the pattern to list keys for                    [array] [default: []]',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('indicates that <foo> positional arguments are required', () => {
      const r = checkUsage(() =>
        yargs('--help list')
          .command(
            'list <pattern>',
            'List key-value pairs for pattern',
            yargs => {
              yargs.positional('pattern', {
                describe: 'the pattern to list keys for',
              });
            }
          )
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage list <pattern>',
          '',
          'List key-value pairs for pattern',
          '',
          'Positionals:',
          '  pattern  the pattern to list keys for                               [required]',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('displays aliases appropriately', () => {
      const r = checkUsage(() =>
        yargs('--help list')
          .command(
            'list [pattern|thingy]',
            'List key-value pairs for pattern',
            yargs => {
              yargs.positional('pattern', {
                describe: 'the pattern to list keys for',
              });
            }
          )
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage list [pattern|thingy]',
          '',
          'List key-value pairs for pattern',
          '',
          'Positionals:',
          '  pattern, thingy  the pattern to list keys for',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('displays type information', () => {
      const r = checkUsage(() =>
        yargs('--help list')
          .command(
            'list [pattern]',
            'List key-value pairs for pattern',
            yargs => {
              yargs.positional('pattern', {
                describe: 'the pattern to list keys for',
                type: 'string',
              });
            }
          )
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage list [pattern]',
          '',
          'List key-value pairs for pattern',
          '',
          'Positionals:',
          '  pattern  the pattern to list keys for                                 [string]',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });

    it('displays choices array', () => {
      const r = checkUsage(() =>
        yargs('--help list')
          .command(
            'list [pattern]',
            'List key-value pairs for pattern',
            yargs => {
              yargs.positional('pattern', {
                describe: 'the pattern to list keys for',
                choices: ['foo', 'bar'],
              });
            }
          )
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'usage list [pattern]',
          '',
          'List key-value pairs for pattern',
          '',
          'Positionals:',
          '  pattern  the pattern to list keys for                  [choices: "foo", "bar"]',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
        ]);
    });
  });

  describe('hidden options', () => {
    it('--help should display all options except for hidden ones', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .options({
            foo: {
              describe: 'FOO',
            },
            bar: {},
            baz: {
              describe: 'BAZ',
              hidden: true,
            },
          })
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
          '  --foo      FOO',
          '  --bar',
        ]);
    });
    it('--help should display all options except for hidden ones even with a default', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .options({
            foo: {
              describe: 'FOO',
              hidden: true,
            },
            bar: {},
            baz: {
              type: 'number',
              describe: 'BAZ',
              default: 1,
              hidden: true,
            },
          })
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
          '  --bar',
        ]);
    });
    it('--help should display all options except for hidden ones even in a group', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .options({
            foo: {
              describe: 'FOO',
              hidden: true,
            },
            bar: {},
            baz: {
              describe: 'BAZ',
              group: 'Hidden:',
              hidden: true,
            },
          })
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
          '  --bar',
        ]);
    });
    it('--help should display all groups except for ones with only hidden options', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .options({
            foo: {
              describe: 'FOO',
              group: 'Hidden:',
              hidden: true,
            },
            bar: {},
            baz: {
              describe: 'BAZ',
              group: 'Hidden:',
              hidden: true,
            },
            qux: {
              group: 'Shown:',
            },
          })
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Shown:',
          '  --qux',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
          '  --bar',
        ]);
    });
    it('--help should display all options (including hidden ones) with --show-hidden', () => {
      const r = checkUsage(() =>
        yargs('--help --show-hidden --mama ama')
          .options({
            foo: {
              describe: 'FOO',
            },
            bar: {},
            baz: {
              describe: 'BAZ',
              hidden: true,
            },
          })
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
          '  --foo      FOO',
          '  --bar',
          '  --baz      BAZ',
        ]);
    });
    it('--help should display all groups (including ones with only hidden options) with --show-hidden', () => {
      const r = checkUsage(
        () =>
          yargs('--help --show-hidden').options({
            foo: {
              describe: 'FOO',
              group: 'Hidden:',
              hidden: true,
            },
            bar: {},
            baz: {
              describe: 'BAZ',
              group: 'Hidden:',
              hidden: true,
            },
            qux: {
              group: 'Shown:',
            },
          }).argv
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Hidden:',
          '  --foo  FOO',
          '  --baz  BAZ',
          '',
          'Shown:',
          '  --qux',
          '',
          'Options:',
          '  --help     Show help                                                 [boolean]',
          '  --version  Show version number                                       [boolean]',
          '  --bar',
        ]);
    });
    it('--help should display --custom-show-hidden', () => {
      const r = checkUsage(() =>
        yargs('--help')
          .options({
            foo: {
              describe: 'FOO',
            },
            bar: {},
            baz: {
              describe: 'BAZ',
              hidden: true,
            },
          })
          .showHidden('custom-show-hidden')
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help                Show help                                      [boolean]',
          '  --version             Show version number                            [boolean]',
          '  --foo                 FOO',
          '  --bar',
          '  --custom-show-hidden  Show hidden options                            [boolean]',
        ]);
    });
    it('--help should display all options with --custom-show-hidden', () => {
      const r = checkUsage(() =>
        yargs('--help --custom-show-hidden')
          .options({
            foo: {
              describe: 'FOO',
            },
            bar: {},
            baz: {
              describe: 'BAZ',
              hidden: true,
            },
          })
          .showHidden('custom-show-hidden')
          .parse()
      );

      r.logs[0]
        .split('\n')
        .should.deep.equal([
          'Options:',
          '  --help                Show help                                      [boolean]',
          '  --version             Show version number                            [boolean]',
          '  --foo                 FOO',
          '  --bar',
          '  --baz                 BAZ',
          '  --custom-show-hidden  Show hidden options                            [boolean]',
        ]);
    });
  });

  describe('help message caching', () => {
    it('should display proper usage when an async handler fails', done => {
      const y = yargs()
        .scriptName('mocha')
        .command('cmd', 'test command', {}, () => {
          return new Promise((resolve, reject) => setTimeout(reject, 10));
        })
        .exitProcess(false);

      checkUsage(
        () => {
          y.parse('cmd');
          setTimeout(() => process.exit(1), 100); // eslint-disable-line
        },
        undefined,
        (err, r) => {
          should.not.exist(err);
          should.exist(r.errors[0]);
          r.errors[0]
            .split('\n')
            .should.deep.equal([
              'mocha cmd',
              '',
              'test command',
              '',
              'Options:',
              '  --help     Show help                                                 [boolean]',
              '  --version  Show version number                                       [boolean]',
            ]);
          done();
        }
      );
    });

    it('should not display a cached help message for the next parsing', done => {
      const y = yargs()
        .scriptName('mocha')
        .command('cmd', 'test command', {}, () => {
          return new Promise((resolve, _reject) => setTimeout(resolve, 10));
        })
        .demandCommand(1, 'You need at least one command before moving on')
        .exitProcess(false);

      checkUsage(
        () => {
          y.parse('cmd');
          setTimeout(() => {
            y.parse('');
            setTimeout(() => process.exit(1), 100); // eslint-disable-line
          }, 100);
        },
        undefined,
        (err, r) => {
          should.exist(err);
          err.message.should.equal(
            'You need at least one command before moving on'
          );
          should.exist(r.errors[0]);
          r.errors[0]
            .split('\n')
            .should.deep.equal([
              'mocha <command>',
              '',
              'Commands:',
              '  mocha cmd  test command',
              '',
              'Options:',
              '  --help     Show help                                                 [boolean]',
              '  --version  Show version number                                       [boolean]',
            ]);
          done();
        }
      );
    });
  });

  it('should allow setting the same description for several keys', () => {
    const r = checkUsage(() =>
      yargs('--help').describe(['big', 'small'], 'Packet size').parse()
    );

    r.logs[0]
      .split('\n')
      .should.deep.equal([
        'Options:',
        '  --help     Show help                                                 [boolean]',
        '  --version  Show version number                                       [boolean]',
        '  --big      Packet size',
        '  --small    Packet size',
      ]);
  });

  // Refs: https://github.com/yargs/yargs/pull/1826
  describe('usage for default command', () => {
    describe('default only', () => {
      const expected = [
        'usage',
        '',
        'Default command description',
        '',
        'Options:',
        '  --help     Show help                                                 [boolean]',
        '  --version  Show version number                                       [boolean]',
      ];

      it('should contain the expected output for --help', () => {
        const r = checkUsage(() =>
          yargs('--help')
            .scriptName('usage')
            .command('*', 'Default command description')
            .parse()
        );
        r.logs[0].split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for showhelp', () => {
        const r = checkUsage(() => {
          const y = yargs()
            .scriptName('usage')
            .command('*', 'Default command description');
          y.showHelp('log');
        });
        r.logs[0].split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for getHelp', async () => {
        const y = yargs()
          .scriptName('usage')
          .command('*', 'Default command description');
        const help = await y.getHelp();
        help.split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for getHelp when called from within handler', async () => {
        let help = '';
        const y = yargs()
          .scriptName('usage')
          .command('*', 'Default command description', {}, async () => {
            help = await y.getHelp();
          });
        await y.parse();
        help.split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for showHelp when called from within handler', () => {
        const r = checkUsage(() =>
          yargs()
            .scriptName('usage')
            .command('*', 'Default command description', {}, () =>
              yargs.showHelp('log')
            )
            .parse('')
        );
        r.logs[0].split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for showHelp, when exception occurs', () => {
        const r = checkUsage(() =>
          yargs()
            .scriptName('usage')
            .command('*', 'Default command description', {}, () =>
              yargs.showHelp('log')
            )
            .check(() => {
              return false;
            })
            .parse('')
        );
        r.errors[0].split('\n').should.deep.equal(expected);
      });
    });

    describe('multiple', () => {
      const expected = [
        'Hello, world!',
        '',
        'Commands:',
        '  usage      Default command description                               [default]',
        '  usage foo  Foo command description',
        '',
        'Options:',
        '  --help     Show help                                                 [boolean]',
        '  --version  Show version number                                       [boolean]',
      ];
      it('should contain the expected output for --help', () => {
        const r = checkUsage(() =>
          yargs('--help')
            .scriptName('usage')
            .usage('Hello, world!')
            .commands([
              {command: '*', desc: 'Default command description'},
              {command: 'foo', desc: 'Foo command description'},
            ])
            .parse()
        );
        r.logs[0].split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for showHelp', () => {
        const r = checkUsage(() => {
          yargs()
            .scriptName('usage')
            .usage('Hello, world!')
            .commands([
              {command: '*', desc: 'Default command description'},
              {command: 'foo', desc: 'Foo command description'},
            ])
            .parse();
          yargs.showHelp('log');
        });
        r.logs[0].split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for showHelp when called from within handler', () => {
        const r = checkUsage(
          () =>
            yargs()
              .scriptName('usage')
              .usage('Hello, world!')
              .commands([
                {
                  command: '*',
                  desc: 'Default command description',
                  handler: _ => yargs.showHelp('log'),
                },
                {command: 'foo', desc: 'Foo command description'},
              ]).argv
        );
        r.logs[0].split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for getHelp', async () => {
        const y = yargs()
          .scriptName('usage')
          .usage('Hello, world!')
          .commands([
            {
              command: '*',
              desc: 'Default command description',
              handler: () => {},
            },
            {command: 'foo', desc: 'Foo command description'},
          ]);
        const help = await y.getHelp();
        help.split('\n').should.deep.equal(expected);
      });

      it('should contain the expected output for getHelp when called from within handler', async () => {
        let help = '';
        const y = yargs()
          .scriptName('usage')
          .usage('Hello, world!')
          .commands([
            {
              command: '*',
              desc: 'Default command description',
              handler: async () => {
                help = await y.getHelp();
              },
            },
            {command: 'foo', desc: 'Foo command description'},
          ]);
        await y.argv;
        help.split('\n').should.deep.equal(expected);
      });
    });
    // Refs: https://github.com/yargs/yargs/issues/1912
    describe('positional', () => {
      const expected = [
        'Hello, world!',
        '',
        'Commands:',
        '  usage [foo]     Default command description                          [default]',
        '  usage foo       Foo command description',
        '',
        'Positionals:',
        '  foo  foo parameter',
        '',
        'Options:',
        '  --help     Show help                                                 [boolean]',
        '  --version  Show version number                                       [boolean]',
      ];
      it('should contain the expected output for --help', () => {
        const r = checkUsage(() =>
          yargs('--help')
            .scriptName('usage')
            .usage('Hello, world!')
            .command('* [foo]', 'Default command description', yargs => {
              yargs.positional('foo', {
                describe: 'foo parameter',
              });
            })
            .commands([{command: 'foo', desc: 'Foo command description'}])
            .parse()
        );
        r.logs[0].split('\n').should.deep.equal(expected);
      });
      it('should contain the expected output for showHelp', () => {
        const r = checkUsage(() => {
          const y = yargs()
            .scriptName('usage')
            .usage('Hello, world!')
            .command('* [foo]', 'Default command description', yargs => {
              yargs.positional('foo', {
                describe: 'foo parameter',
              });
            })
            .commands([{command: 'foo', desc: 'Foo command description'}]);
          y.parse();
          y.showHelp('log');
        });
        r.logs[0].split('\n').should.deep.equal(expected);
      });
    });
  });

  describe('async builder', async () => {
    it('shows appropriate usage instructions for nested command', async () => {
      // With --help flag:
      {
        const r = await checkUsage(() => {
          return yargs(['cmd', '--help'])
            .command('cmd <foo>', 'a test command', async yargs => {
              await wait();
              yargs.positional('foo', {
                type: 'string',
                default: 'hello',
              });
            })
            .parse();
        });
        const logs = r.logs.join('\n');
        logs.should.match(/default: "hello"/);
        logs.should.match(/a test command/);
      }
      // Using showHelp():
      {
        const r = await checkUsage(() => {
          yargs(['cmd'])
            .command('cmd <foo>', 'a test command', async yargs => {
              await wait();
              yargs.positional('foo', {
                type: 'string',
                default: 'hello',
              });
            })
            .showHelp('log');
          return wait(20);
        });
        const logs = r.logs.join('\n');
        logs.should.match(/default: "hello"/);
        logs.should.match(/a test command/);
      }
    });
    // Refs: https://github.com/yargs/yargs/issues/1912
    describe('positional', () => {
      const expected = [
        'Hello, world!',
        '',
        'Commands:',
        '  usage [foo]     Default command description                          [default]',
        '  usage foo       Foo command description',
        '',
        'Positionals:',
        '  foo  foo parameter',
        '',
        'Options:',
        '  --help     Show help                                                 [boolean]',
        '  --version  Show version number                                       [boolean]',
      ];
      it('should contain the expected output for --help', async () => {
        const r = await checkUsage(() => {
          yargs('--help')
            .scriptName('usage')
            .usage('Hello, world!')
            .command('* [foo]', 'Default command description', async yargs => {
              await wait();
              yargs.positional('foo', {
                describe: 'foo parameter',
              });
            })
            .commands([{command: 'foo', desc: 'Foo command description'}])
            .parse();
          return wait(20);
        });
        r.logs[0].split('\n').should.deep.equal(expected);
      });
      it('should contain the expected output for getHelp', async () => {
        const y = yargs()
          .scriptName('usage')
          .usage('Hello, world!')
          .command('* [foo]', 'Default command description', async yargs => {
            // await wait();
            yargs.positional('foo', {
              describe: 'foo parameter',
            });
          })
          .commands([{command: 'foo', desc: 'Foo command description'}]);
        await y.parse('');
        await wait();
        const help = await y.getHelp();
        help.split('\n').should.deep.equal(expected);
      });
    });
  });

  // Refs: https://github.com/yargs/yargs/issues/1820
  it('allows setting help and version with aliases and custom description', () => {
    const r = checkUsage(() =>
      yargs('--help')
        .describe('help', 'Custom help description')
        .describe('version', 'Custom version description')
        .alias('help', 'h')
        .alias('v', 'version')
        .parse()
    );
    r.logs[0]
      .split('\n')
      .should.deep.equal([
        'Options:',
        '  -h, --help     Custom help description                               [boolean]',
        '  -v, --version  Custom version description                            [boolean]',
      ]);
  });
});
