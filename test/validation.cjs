'use strict';
/* global describe, it, beforeEach */
/* eslint-disable no-unused-vars */

const checkUsage = require('./helpers/utils.cjs').checkOutput;
const expect = require('chai').expect;
const english = require('../locales/en.json');
let yargs = require('../index.cjs');

require('chai').should();

describe('validation tests', () => {
  beforeEach(() => {
    yargs.getInternalMethods().reset();
  });

  describe('implies', () => {
    const implicationsFailedPattern = new RegExp(
      english['Implications failed:']
    );

    it("fails if '_' populated, and implied argument not set", done => {
      yargs(['cat'])
        .implies({
          1: 'foo', // 1 arg in _ means --foo is required
        })
        .fail(msg => {
          msg.should.match(implicationsFailedPattern);
          return done();
        })
        .parse();
    });

    it("fails if key implies values in '_', but '_' is not populated", done => {
      yargs(['--foo'])
        .boolean('foo')
        .implies({
          foo: 1, // --foo means 1 arg in _ is required
        })
        .fail(msg => {
          msg.should.match(implicationsFailedPattern);
          return done();
        })
        .parse();
    });

    it('fails if either implied argument is not set and displays only failed', done => {
      yargs(['-f', '-b'])
        .implies('f', ['b', 'c'])
        .fail(msg1 => {
          yargs(['-f', '-c'])
            .implies('f', ['b', 'c'])
            .fail(msg2 => {
              msg1.should.match(/f -> c/);
              msg1.should.not.match(/f -> b/);
              msg2.should.match(/f -> b/);
              msg2.should.not.match(/f -> c/);
              return done();
            })
            .parse();
        })
        .parse();
    });

    it("fails if --no-foo's implied argument is not set", done => {
      yargs([])
        .implies({
          '--no-bar': 'foo', // when --bar is not given, --foo is required
        })
        .fail(msg => {
          msg.should.match(implicationsFailedPattern);
          return done();
        })
        .parse();
    });

    it('fails if a key is set, along with a key that it implies should not be set', done => {
      yargs(['--bar', '--foo'])
        .implies({
          bar: '--no-foo', // --bar means --foo cannot be given
        })
        .fail(msg => {
          msg.should.match(implicationsFailedPattern);
          return done();
        })
        .parse();
    });

    it('fails if implied key (with "no" in the name) is not set', () => {
      let failCalled = false;
      yargs('--bar')
        .implies({
          bar: 'noFoo', // --bar means --noFoo (or --no-foo with boolean-negation disabled) is required
          // note that this has nothing to do with --foo
        })
        .fail(msg => {
          failCalled = true;
          msg.should.match(implicationsFailedPattern);
        })
        .parse();
      failCalled.should.equal(true);
    });

    it("doesn't fail if implied key exists with value 0", () => {
      yargs('--foo --bar 0')
        .implies('foo', 'bar')
        .fail(() => {
          expect.fail();
        })
        .parse();
    });

    it("doesn't fail if implied key exists with value false", () => {
      yargs('--foo --bar false')
        .implies('foo', 'bar')
        .fail(() => {
          expect.fail();
        })
        .parse();
    });

    it('doesn\'t fail if implied key (with "no" in the name) is set', () => {
      const argv = yargs('--bar --noFoo')
        .implies({
          bar: 'noFoo', // --bar means --noFoo (or --no-foo with boolean-negation disabled) is required
          // note that this has nothing to do with --foo
        })
        .fail(() => {
          expect.fail();
        })
        .parse();
      expect(argv.bar).to.equal(true);
      expect(argv.noFoo).to.equal(true);
      expect(argv.foo).to.equal(undefined);
    });

    it('fails if implied key (with "no" in the name) is given when it should not', () => {
      let failCalled = false;
      yargs('--bar --noFoo')
        .implies({
          bar: '--no-noFoo', // --bar means --noFoo (or --no-foo with boolean-negation disabled) cannot be given
          // note that this has nothing to do with --foo
        })
        .fail(msg => {
          failCalled = true;
          msg.should.match(implicationsFailedPattern);
        })
        .parse();
      failCalled.should.equal(true);
    });

    it('doesn\'t fail if implied key (with "no" in the name) that should not be given is not set', () => {
      const argv = yargs('--bar')
        .implies({
          bar: '--no-noFoo', // --bar means --noFoo (or --no-foo with boolean-negation disabled) cannot be given
          // note that this has nothing to do with --foo
        })
        .fail(() => {
          expect.fail();
        })
        .parse();
      expect(argv.bar).to.equal(true);
      expect(argv.noFoo).to.equal(undefined);
      expect(argv.foo).to.equal(undefined);
    });

    it('allows key to be specified with option shorthand', done => {
      yargs('--bar')
        .option('bar', {
          implies: 'foo',
        })
        .fail(msg => {
          msg.should.match(implicationsFailedPattern);
          return done();
        })
        .parse();
    });
  });

  describe('conflicts', () => {
    it('fails if both arguments are supplied', done => {
      yargs(['-f', '-b'])
        .conflicts('f', 'b')
        .fail(msg => {
          msg.should.equal('Arguments f and b are mutually exclusive');
          return done();
        })
        .parse();
    });

    it('fails if argument is supplied along with either conflicting argument', done => {
      yargs(['-f', '-b'])
        .conflicts('f', ['b', 'c'])
        .fail(msg1 => {
          yargs(['-f', '-c'])
            .conflicts('f', ['b', 'c'])
            .fail(msg2 => {
              msg1.should.equal('Arguments f and b are mutually exclusive');
              msg2.should.equal('Arguments f and c are mutually exclusive');
              return done();
            })
            .parse();
        })
        .parse();
    });

    it('should not fail if no conflicting arguments are provided', () => {
      yargs(['-b', '-c'])
        .conflicts('f', ['b', 'c'])
        .fail(msg => {
          expect.fail();
        })
        .parse();
    });

    it('should not fail if argument with conflict is provided, but not the argument it conflicts with', () => {
      yargs(['command', '-f', '-c'])
        .command('command')
        .option('f', {
          describe: 'a foo',
        })
        .option('b', {
          describe: 'a bar',
        })
        .conflicts('f', 'b')
        .fail(msg => {
          expect.fail();
        })
        .parse();
    });

    it('should not fail if conflicting argument is provided, without argument with conflict', () => {
      yargs(['command', '-b', '-c'])
        .command('command')
        .option('f', {
          describe: 'a foo',
        })
        .option('b', {
          describe: 'a bar',
        })
        .conflicts('f', 'b')
        .fail(msg => {
          expect.fail();
        })
        .parse();
    });

    it('allows an object to be provided defining conflicting option pairs', done => {
      yargs(['-t', '-s'])
        .conflicts({
          c: 'a',
          s: 't',
        })
        .fail(msg => {
          msg.should.equal('Arguments s and t are mutually exclusive');
          return done();
        })
        .parse();
    });

    it('takes into account aliases when applying conflicts logic', done => {
      yargs(['-t', '-c'])
        .conflicts({
          c: 'a',
          s: 't',
        })
        .alias('c', 's')
        .fail(msg => {
          msg.should.equal('Arguments s and t are mutually exclusive');
          return done();
        })
        .parse();
    });

    it('allows key to be specified with option shorthand', done => {
      yargs(['-f', '-b'])
        .option('f', {
          conflicts: 'b',
        })
        .fail(msg => {
          msg.should.equal('Arguments f and b are mutually exclusive');
          return done();
        })
        .parse();
    });

    it('should fail if alias of conflicting argument is provided', done => {
      yargs(['-f', '--batman=99'])
        .conflicts('f', 'b')
        .alias('b', 'batman')
        .fail(msg => {
          msg.should.equal('Arguments f and b are mutually exclusive');
          return done();
        })
        .parse();
    });

    it('should fail if alias of argument with conflict is provided', done => {
      yargs(['--foo', '-b'])
        .conflicts('f', 'b')
        .alias('foo', 'f')
        .fail(msg => {
          msg.should.equal('Arguments f and b are mutually exclusive');
          return done();
        })
        .parse();
    });

    function loadLocale(locale) {
      delete require.cache[require.resolve('../')];
      yargs = require('../');
      process.env.LC_ALL = locale;
    }

    it('should use appropriate translation', done => {
      loadLocale('pirate');
      try {
        yargs(['-f', '-b'])
          .conflicts('f', 'b')
          .fail(msg => {
            msg.should.equal(
              'Yon scurvy dogs f and b be as bad as rum and a prudish wench'
            );
            return done();
          })
          .parse();
      } finally {
        loadLocale('en_US.UTF-8');
      }
    });
  });

  describe('demand', () => {
    it('fails with standard error message if msg is not defined', done => {
      yargs([])
        .demand(1)
        .fail(msg => {
          msg.should.equal(
            'Not enough non-option arguments: got 0, need at least 1'
          );
          return done();
        })
        .parse();
      expect.fail('no parsing failure');
    });

    // addresses: https://github.com/yargs/yargs/issues/1861
    it('fails in strict mode when no commands defined but command is passed', done => {
      yargs
        .strict()
        .fail(msg => {
          msg.should.equal('Unknown argument: foo');
          done();
        })
        .parse('foo');
      expect.fail('no parsing failure');
    });

    it('fails because of undefined command and not because of argument after --', done => {
      yargs
        .strict()
        .fail(msg => {
          msg.should.equal('Unknown argument: foo');
          done();
        })
        .parse('foo -- hello');
      expect.fail('no parsing failure');
    });

    it('fails in strict mode with invalid command', done => {
      yargs(['koala'])
        .command('wombat', 'wombat burrows')
        .command('kangaroo', 'kangaroo handlers')
        .demand(1)
        .strict()
        .fail(msg => {
          msg.should.equal('Unknown argument: koala');
          return done();
        })
        .parse();
      expect.fail('no parsing failure');
    });

    it('fails in strict mode with extra positionals', done => {
      yargs(['kangaroo', 'jumping', 'fast'])
        .command('kangaroo <status>', 'kangaroo handlers')
        .strict()
        .fail(msg => {
          msg.should.equal('Unknown argument: fast');
          return done();
        })
        .parse();
      expect.fail('no parsing failure');
    });

    it('fails in strict mode with extra positionals for default command', done => {
      yargs(['jumping', 'fast'])
        .command('$0 <status>', 'kangaroo handlers')
        .strict()
        .fail(msg => {
          msg.should.equal('Unknown argument: fast');
          return done();
        })
        .parse();
      expect.fail('no parsing failure');
    });

    it('does not fail in strict mode when no commands configured', () => {
      const argv = yargs('koala')
        .demand(1)
        .strict()
        .fail(msg => {
          expect.fail();
        })
        .parse();
      argv._[0].should.equal('koala');
    });

    // addresses: https://github.com/yargs/yargs/issues/791
    it('should recognize context variables in strict mode', done => {
      yargs()
        .command('foo <y>')
        .strict()
        .parse('foo 99', {x: 33}, (err, argv, output) => {
          expect(err).to.equal(null);
          expect(output).to.equal('');
          argv.y.should.equal(99);
          argv.x.should.equal(33);
          argv._.should.include('foo');
          return done();
        });
    });

    // addresses: https://github.com/yargs/yargs/issues/791
    it('should recognize context variables in strict mode, when running sub-commands', done => {
      yargs()
        .command('request', 'request command', yargs => {
          yargs.command('get', 'sub-command').option('y', {
            describe: 'y inner option',
          });
        })
        .strict()
        .parse('request get --y=22', {x: 33}, (err, argv, output) => {
          expect(err).to.equal(null);
          expect(output).to.equal('');
          argv.y.should.equal(22);
          argv.x.should.equal(33);
          argv._.should.include('request');
          argv._.should.include('get');
          return done();
        });
    });

    it('fails when a required argument is missing', done => {
      yargs('-w 10 marsupial')
        .demand(1, ['w', 'b'])
        .fail(msg => {
          msg.should.equal('Missing required argument: b');
          return done();
        })
        .parse();
    });

    it('fails when required arguments are present, but a command is missing', done => {
      yargs('-w 10 -m wombat')
        .demand(1, ['w', 'm'])
        .fail(msg => {
          msg.should.equal(
            'Not enough non-option arguments: got 0, need at least 1'
          );
          return done();
        })
        .parse();
    });

    it('fails without a message if msg is null', done => {
      yargs([])
        .demand(1, null)
        .fail(msg => {
          expect(msg).to.equal(null);
          return done();
        })
        .parse();
    });

    // address regression in: https://github.com/yargs/yargs/pull/740
    it('custom failure message should be printed for both min and max constraints', done => {
      yargs(['foo'])
        .demand(0, 0, 'hey! give me a custom exit message')
        .fail(msg => {
          expect(msg).to.equal('hey! give me a custom exit message');
          return done();
        })
        .parse();
    });

    it('interprets min relative to command', () => {
      let failureMsg;
      yargs('lint')
        .command('lint', 'Lint a file', yargs => {
          yargs.demand(1).fail(msg => {
            failureMsg = msg;
          });
        })
        .parse();
      expect(failureMsg).to.equal(
        'Not enough non-option arguments: got 0, need at least 1'
      );
    });

    it('interprets max relative to command', () => {
      let failureMsg;
      yargs('lint one.js two.js')
        .command('lint', 'Lint a file', yargs => {
          yargs.demand(0, 1).fail(msg => {
            failureMsg = msg;
          });
        })
        .parse();
      expect(failureMsg).to.equal(
        'Too many non-option arguments: got 2, maximum of 1'
      );
    });
  });

  describe('requiresArg', () => {
    it('fails when a required argument value of type number is missing', done => {
      yargs()
        .option('w', {type: 'number', requiresArg: true})
        .parse('-w', (err, argv, output) => {
          expect(err).to.not.equal(undefined);
          expect(err).to.have.property(
            'message',
            'Not enough arguments following: w'
          );
          return done();
        });
    });

    it('fails when a required argument value of type string is missing', done => {
      yargs()
        .option('w', {type: 'string', requiresArg: true})
        .parse('-w', (err, argv, output) => {
          expect(err).to.not.equal(undefined);
          expect(err).to.have.property(
            'message',
            'Not enough arguments following: w'
          );
          return done();
        });
    });

    it('fails when a required argument value of type boolean is missing', done => {
      yargs()
        .option('w', {type: 'boolean', requiresArg: true})
        .parse('-w', (err, argv, output) => {
          expect(err).to.not.equal(undefined);
          expect(err).to.have.property(
            'message',
            'Not enough arguments following: w'
          );
          return done();
        });
    });

    it('fails when a required argument value of type array is missing', done => {
      yargs()
        .option('w', {type: 'array', requiresArg: true})
        .parse('-w', (err, argv, output) => {
          expect(err).to.not.equal(undefined);
          expect(err).to.have.property(
            'message',
            'Not enough arguments following: w'
          );
          return done();
        });
    });

    // see: https://github.com/yargs/yargs/issues/1041
    it('does not fail if argument with required value is not provided', done => {
      yargs()
        .option('w', {type: 'number', requiresArg: true})
        .command('woo')
        .parse('', (err, argv, output) => {
          expect(err).to.equal(null);
          return done();
        });
    });

    it('does not fail if argument with required value is not provided to subcommand', done => {
      yargs()
        .option('w', {type: 'number', requiresArg: true})
        .command('woo')
        .parse('woo', (err, argv, output) => {
          expect(err).to.equal(null);
          return done();
        });
    });
  });

  describe('choices', () => {
    it('fails with one invalid value', done => {
      yargs(['--state', 'denial'])
        .choices('state', ['happy', 'sad', 'hungry'])
        .fail(msg => {
          msg
            .split('\n')
            .should.deep.equal([
              'Invalid values:',
              '  Argument: state, Given: "denial", Choices: "happy", "sad", "hungry"',
            ]);
          return done();
        })
        .parse();
    });

    it('fails with one valid and one invalid value', done => {
      yargs(['--characters', 'susie', '--characters', 'linus'])
        .choices('characters', ['calvin', 'hobbes', 'susie', 'moe'])
        .fail(msg => {
          msg
            .split('\n')
            .should.deep.equal([
              'Invalid values:',
              '  Argument: characters, Given: "linus", Choices: "calvin", "hobbes", "susie", "moe"',
            ]);
          return done();
        })
        .parse();
    });

    it('fails with multiple invalid values for same argument', done => {
      yargs(['--category', 'comedy', '--category', 'drama'])
        .choices('category', ['animal', 'vegetable', 'mineral'])
        .fail(msg => {
          msg
            .split('\n')
            .should.deep.equal([
              'Invalid values:',
              '  Argument: category, Given: "comedy", "drama", Choices: "animal", "vegetable", "mineral"',
            ]);
          return done();
        })
        .parse();
    });

    it('fails with case-insensitive value', done => {
      yargs(['--env', 'DEV'])
        .choices('env', ['dev', 'prd'])
        .fail(msg => {
          msg
            .split('\n')
            .should.deep.equal([
              'Invalid values:',
              '  Argument: env, Given: "DEV", Choices: "dev", "prd"',
            ]);
          return done();
        })
        .parse();
    });

    it('fails with multiple invalid arguments', done => {
      yargs(['--system', 'osx', '--arch', '64'])
        .choices('system', ['linux', 'mac', 'windows'])
        .choices('arch', ['x86', 'x64', 'arm'])
        .fail(msg => {
          msg
            .split('\n')
            .should.deep.equal([
              'Invalid values:',
              '  Argument: system, Given: "osx", Choices: "linux", "mac", "windows"',
              '  Argument: arch, Given: 64, Choices: "x86", "x64", "arm"',
            ]);
          return done();
        })
        .parse();
    });

    // addresses: https://github.com/yargs/yargs/issues/849
    it('succeeds when demandOption is true and valid choice is provided', done => {
      yargs('one -a 10 marsupial')
        .command(
          'one',
          'level one',
          yargs => {
            yargs.options({
              a: {
                demandOption: true,
                choices: [10, 20],
              },
            });
          },
          argv => {
            argv._[0].should.equal('one');
            argv.a.should.equal(10);
            return done();
          }
        )
        .fail(msg => {
          expect.fail();
        })
        .parse();
    });

    // addresses: https://github.com/yargs/yargs/issues/849
    it('fails when demandOption is true and choice is not provided', done => {
      yargs('one -a 10 marsupial')
        .command(
          'one',
          'level one',
          yargs => {
            yargs
              .options({
                c: {
                  choices: ['1', '2'],
                },
              })
              .demandOption('c');
          },
          argv => {
            expect.fail();
          }
        )
        .fail(msg => {
          msg.should.equal('Missing required argument: c');
          return done();
        })
        .parse();
    });

    // addresses: https://github.com/yargs/yargs/issues/849
    it('succeeds when demandOption is false and no choice is provided', () => {
      yargs('one')
        .command(
          'one',
          'level one',
          yargs => {
            yargs.options({
              a: {
                demandOption: false,
                choices: [10, 20],
              },
            });
          },
          argv => {
            argv._[0].should.equal('one');
          }
        )
        .fail(msg => {
          expect.fail();
        })
        .parse();
    });

    // addresses: https://github.com/yargs/yargs/issues/849
    it('succeeds when demandOption is not provided and no choice is provided', () => {
      yargs('one')
        .command(
          'one',
          'level one',
          yargs => {
            yargs.options({
              a: {
                choices: [10, 20],
              },
            });
          },
          argv => {
            argv._[0].should.equal('one');
          }
        )
        .fail(msg => {
          expect.fail();
        })
        .parse();
    });
  });

  describe('config', () => {
    it('should raise an appropriate error if JSON file is not found', done => {
      yargs(['--settings', 'fake.json', '--foo', 'bar'])
        .alias('z', 'zoom')
        .config('settings')
        .fail(msg => {
          msg.should.eql('Invalid JSON config file: fake.json');
          return done();
        })
        .parse();
    });

    // see: https://github.com/yargs/yargs/issues/172
    it('should not raise an exception if config file is set as default argument value', () => {
      let fail = false;
      yargs([])
        .option('config', {
          default: 'foo.json',
        })
        .config('config')
        .fail(() => {
          fail = true;
        })
        .parse();

      fail.should.equal(false);
    });

    it('should be displayed in the help message', () => {
      const r = checkUsage(() =>
        yargs(['--help'])
          .config('settings')
          .help('help')
          .version(false)
          .wrap(null)
          .parse()
      );
      r.should.have.property('logs').with.length(1);
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  --settings  Path to JSON config file',
          '  --help      Show help  [boolean]',
        ]);
    });

    it('should be displayed in the help message with its default name', () => {
      const checkUsage = require('./helpers/utils.cjs').checkOutput;
      const r = checkUsage(() =>
        yargs(['--help'])
          .config()
          .help('help')
          .version(false)
          .wrap(null)
          .parse()
      );
      r.should.have.property('logs').with.length(1);
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  --config  Path to JSON config file',
          '  --help    Show help  [boolean]',
        ]);
    });

    it('should allow help message to be overridden', () => {
      const checkUsage = require('./helpers/utils.cjs').checkOutput;
      const r = checkUsage(() =>
        yargs(['--help'])
          .config('settings', 'pork chop sandwiches')
          .help('help')
          .version(false)
          .wrap(null)
          .parse()
      );
      r.should.have.property('logs').with.length(1);
      r.logs
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  --settings  pork chop sandwiches',
          '  --help      Show help  [boolean]',
        ]);
    });

    it('outputs an error returned by the parsing function', () => {
      const checkUsage = require('./helpers/utils.cjs').checkOutput;
      const r = checkUsage(() =>
        yargs(['--settings=./package.json'])
          .config('settings', 'path to config file', configPath =>
            Error('someone set us up the bomb')
          )
          .help('help')
          .wrap(null)
          .parse()
      );

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  --version   Show version number  [boolean]',
          '  --settings  path to config file',
          '  --help      Show help  [boolean]',
          'someone set us up the bomb',
        ]);
    });

    it('outputs an error if thrown by the parsing function', () => {
      const checkUsage = require('./helpers/utils.cjs').checkOutput;
      const r = checkUsage(() =>
        yargs(['--settings=./package.json'])
          .config('settings', 'path to config file', configPath => {
            throw Error('someone set us up the bomb');
          })
          .wrap(null)
          .parse()
      );

      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Options:',
          '  --help      Show help  [boolean]',
          '  --version   Show version number  [boolean]',
          '  --settings  path to config file',
          'someone set us up the bomb',
        ]);
    });
  });

  describe('defaults', () => {
    // See https://github.com/chevex/yargs/issues/31
    it('should not fail when demanded options with defaults are missing', () => {
      yargs()
        .fail(msg => {
          throw new Error(msg);
        })
        .option('some-option', {
          describe: 'some option',
          demand: true,
          default: 88,
        })
        .strict()
        .parse([]);
    });
  });

  describe('strict mode', () => {
    it('does not fail when command with subcommands called', () => {
      yargs('one')
        .command(
          'one',
          'level one',
          yargs =>
            yargs
              .command('twoA', 'level two A')
              .command('twoB', 'level two B')
              .strict()
              .fail(msg => {
                expect.fail();
              }),
          argv => {
            argv._[0].should.equal('one');
          }
        )
        .parse();
    });

    it('does not fail for hidden options', () => {
      const args = yargs('--foo')
        .strict()
        .option('foo', {boolean: true, describe: false})
        .fail(msg => {
          expect.fail();
        })
        .parse();
      args.foo.should.equal(true);
    });

    it('does not fail for hidden options but does for unknown arguments', () => {
      const args = yargs('--foo hey')
        .strict()
        .option('foo', {boolean: true, describe: false})
        .fail(msg => {
          msg.should.equal('Unknown argument: hey');
        })
        .parse();
    });

    it('does not fail if an alias is provided, rather than option itself', () => {
      const args = yargs('--cat')
        .strict()
        .option('foo', {boolean: true, describe: false})
        .alias('foo', 'bar')
        .alias('bar', 'cat')
        .fail(msg => {
          expect.fail();
        })
        .parse();
      args.cat.should.equal(true);
      args.foo.should.equal(true);
      args.bar.should.equal(true);
    });

    it('does not fail when unrecognized option is passed after --', () => {
      const args = yargs('ahoy ben -- --arrr')
        .strict()
        .command('ahoy <matey>', 'piratical courtesy')
        .option('arrr', {boolean: true, describe: false})
        .fail(msg => {
          expect.fail(msg);
        })
        .parse();
      args.matey.should.equal('ben');
      args._.should.deep.equal(['ahoy', '--arrr']);
    });
  });

  describe('demandOption', () => {
    it('allows an array of options to be demanded', done => {
      yargs('-a 10 marsupial')
        .demandOption(['a', 'b'])
        .fail(msg => {
          msg.should.equal('Missing required argument: b');
          return done();
        })
        .parse();
    });

    it('allows demandOption in option shorthand', done => {
      yargs('-a 10 marsupial')
        .option('c', {
          demandOption: true,
        })
        .fail(msg => {
          msg.should.equal('Missing required argument: c');
          return done();
        })
        .parse();
    });
  });

  describe('demandCommand', () => {
    it('should return a custom failure message when too many non-hyphenated arguments are found after a demand count', () => {
      const r = checkUsage(() =>
        yargs(['src', 'dest'])
          .usage(
            'Usage: $0 [x] [y] [z] {OPTIONS} <src> <dest> [extra_files...]'
          )
          .demandCommand(
            0,
            1,
            'src and dest files are both required',
            'too many arguments are provided'
          )
          .wrap(null)
          .help(false)
          .version(false)
          .parse()
      );
      r.should.have.property('result');
      r.should.have.property('logs').with.length(0);
      r.should.have.property('exit').and.to.equal(true);
      r.result.should.have.property('_').and.deep.equal(['src', 'dest']);
      r.errors
        .join('\n')
        .split(/\n+/)
        .should.deep.equal([
          'Usage: usage [x] [y] [z] {OPTIONS} <src> <dest> [extra_files...]',
          'too many arguments are provided',
        ]);
    });

    // see: https://github.com/yargs/yargs/pull/438
    it('allows a custom min message to be provided', done => {
      yargs('-a 10 marsupial')
        .demandCommand(2, 'totes got $0 totes expected $1')
        .fail(msg => {
          msg.should.equal('totes got 1 totes expected 2');
          return done();
        })
        .parse();
    });

    // see: https://github.com/yargs/yargs/pull/438
    it('allows a custom min and max message to be provided', done => {
      yargs('-a 10 marsupial mammal bro')
        .demandCommand(
          1,
          2,
          'totes too few, got $0 totes expected $1',
          'totes too many, got $0 totes expected $1'
        )
        .fail(msg => {
          msg.should.equal('totes too many, got 3 totes expected 2');
          return done();
        })
        .parse();
    });

    it('defaults to demanding 1 command', done => {
      yargs('-a 10')
        .demandCommand()
        .fail(msg => {
          msg.should.equal(
            'Not enough non-option arguments: got 0, need at least 1'
          );
          return done();
        })
        .parse();
    });

    // See: https://github.com/yargs/yargs/issues/1732
    it('treats positionals in "--" towards count requirement', () => {
      yargs('--cool man -- batman robin')
        .demandCommand(2)
        .fail(msg => {
          throw Error(msg);
        })
        .parse();
    });
  });

  describe('strictCommands', () => {
    it('succeeds in parse if command is known', () => {
      const parsed = yargs('foo -a 10')
        .strictCommands()
        .command('foo', 'foo command')
        .parse();
      parsed.a.should.equal(10);
      parsed._.should.eql(['foo']);
    });

    it('succeeds in parse if top level and inner command are known', () => {
      const parsed = yargs('foo bar --cool beans')
        .strictCommands()
        .command('foo', 'foo command', yargs => {
          yargs.command('bar');
        })
        .parse();
      parsed.cool.should.equal('beans');
      parsed._.should.eql(['foo', 'bar']);
    });

    it('fails with error if command is unknown', done => {
      yargs('blerg -a 10')
        .strictCommands()
        .command('foo', 'foo command')
        .fail(msg => {
          msg.should.equal('Unknown command: blerg');
          return done();
        })
        .parse();
    });

    it('fails with error if inner command is unknown', done => {
      yargs('foo blarg --cool beans')
        .strictCommands()
        .command('foo', 'foo command', yargs => {
          yargs.command('bar');
        })
        .fail(msg => {
          msg.should.equal('Unknown command: blarg');
          return done();
        })
        .parse();
    });

    it('does not apply implicit strictCommands to inner commands', () => {
      const parse = yargs('foo blarg --cool beans')
        .demandCommand()
        .command('foo', 'foo command', yargs => {
          yargs.command('bar');
        })
        .parse();
      parse.cool.should.equal('beans');
      parse._.should.eql(['foo', 'blarg']);
    });

    it('allows strictCommands to be applied to inner commands', done => {
      yargs('foo blarg')
        .command('foo', 'foo command', yargs => {
          yargs.command('bar').strictCommands();
        })
        .fail(msg => {
          msg.should.equal('Unknown command: blarg');
          return done();
        })
        .parse();
    });
  });

  describe('strictOptions', () => {
    it('succeeds if option is known and command is unknown', done => {
      yargs()
        .command('foo', 'foo command')
        .option('a', {
          describe: 'a is for option',
        })
        .strictOptions()
        .parse('bar -a 10', (err, argv) => {
          expect(err).to.equal(null);
          argv.a.should.equal(10);
          return done();
        });
    });

    it('fails if option is unknown', done => {
      yargs()
        .strictOptions()
        .parse('bar -a 10', (err, argv) => {
          expect(err).to.match(/Unknown argument: a/);
          argv.a.should.equal(10);
          return done();
        });
    });

    it('applies strict options when commands are invoked', () => {
      yargs()
        .strictOptions()
        .parse('foo --cool --awesome', err => {
          expect(err).to.match(/Unknown arguments: cool, awesome/);
        });
    });

    it('allows strict options to be turned off', () => {
      const y = yargs()
        .strictOptions()
        .command('foo', 'foo command', yargs => {
          yargs.strictOptions(false);
        });
      y.parse('foo --cool --awesome', err => {
        expect(err).to.equal(null);
      });
      y.parse('--cool --awesome', err => {
        expect(err).to.match(/Unknown arguments: cool, awesome/);
      });
    });
  });
});
