/* eslint-disable @typescript-eslint/no-unused-vars */
// Platform agnostic entrypoint for yargs, i.e., this factory is used to
// create an instance of yargs for CJS, ESM, Deno.
//
// Works by accepting a shim which shims methods that contain platform
// specific logic.
import {
  command as Command,
  CommandInstance,
  CommandHandler,
  CommandBuilderDefinition,
  CommandBuilder,
  CommandHandlerCallback,
  CommandHandlerDefinition,
  DefinitionOrCommandName,
} from './command.js';
import type {
  Dictionary,
  KeyOf,
  DictionaryKeyof,
  ValueOf,
  RequireDirectoryOptions,
  PlatformShim,
  RequireType,
} from './typings/common-types.js';
import {
  assertNotStrictEqual,
  assertSingleKey,
  objectKeys,
} from './typings/common-types.js';
import {
  ArgsOutput,
  DetailedArguments as ParserDetailedArguments,
  Configuration as ParserConfiguration,
  Options as ParserOptions,
  ConfigCallback,
  CoerceCallback,
} from './typings/yargs-parser-types.js';
import {YError} from './yerror.js';
import {UsageInstance, FailureFunction, usage as Usage} from './usage.js';
import {argsert} from './argsert.js';
import {
  completion as Completion,
  CompletionInstance,
  CompletionFunction,
} from './completion.js';
import {
  validation as Validation,
  ValidationInstance,
  KeyOrPos,
} from './validation.js';
import {objFilter} from './utils/obj-filter.js';
import {applyExtends} from './utils/apply-extends.js';
import {
  applyMiddleware,
  GlobalMiddleware,
  MiddlewareCallback,
  Middleware,
} from './middleware.js';
import {isPromise} from './utils/is-promise.js';
import {maybeAsyncResult} from './utils/maybe-async-result.js';
import setBlocking from './utils/set-blocking.js';

export function YargsFactory(_shim: PlatformShim) {
  return (
    processArgs: string | string[] = [],
    cwd = _shim.process.cwd(),
    parentRequire?: RequireType
  ): YargsInstance => {
    const yargs = new YargsInstance(processArgs, cwd, parentRequire, _shim);
    // Legacy yargs.argv interface, it's recommended that you use .parse().
    Object.defineProperty(yargs, 'argv', {
      get: () => {
        return yargs.parse();
      },
      enumerable: true,
    });
    // an app should almost always have --version and --help,
    // if you *really* want to disable this use .help(false)/.version(false).
    yargs.help();
    yargs.version();
    return yargs;
  };
}

// Used to expose private methods to other module-level classes,
// such as the command parser and usage printer.
const kCopyDoubleDash = Symbol('copyDoubleDash');
const kCreateLogger = Symbol('copyDoubleDash');
const kDeleteFromParserHintObject = Symbol('deleteFromParserHintObject');
const kFreeze = Symbol('freeze');
const kGetDollarZero = Symbol('getDollarZero');
const kGetParserConfiguration = Symbol('getParserConfiguration');
const kGuessLocale = Symbol('guessLocale');
const kGuessVersion = Symbol('guessVersion');
const kParsePositionalNumbers = Symbol('parsePositionalNumbers');
const kPkgUp = Symbol('pkgUp');
const kPopulateParserHintArray = Symbol('populateParserHintArray');
const kPopulateParserHintSingleValueDictionary = Symbol(
  'populateParserHintSingleValueDictionary'
);
const kPopulateParserHintArrayDictionary = Symbol(
  'populateParserHintArrayDictionary'
);
const kPopulateParserHintDictionary = Symbol('populateParserHintDictionary');
const kSanitizeKey = Symbol('sanitizeKey');
const kSetKey = Symbol('setKey');
const kUnfreeze = Symbol('unfreeze');
const kValidateAsync = Symbol('validateAsync');
const kGetCommandInstance = Symbol('getCommandInstance');
const kGetContext = Symbol('getContext');
const kGetHasOutput = Symbol('getHasOutput');
const kGetLoggerInstance = Symbol('getLoggerInstance');
const kGetParseContext = Symbol('getParseContext');
const kGetUsageInstance = Symbol('getUsageInstance');
const kGetValidationInstance = Symbol('getValidationInstance');
const kHasParseCallback = Symbol('hasParseCallback');
const kPostProcess = Symbol('postProcess');
const kRebase = Symbol('rebase');
const kReset = Symbol('reset');
const kRunYargsParserAndExecuteCommands = Symbol(
  'runYargsParserAndExecuteCommands'
);
const kRunValidation = Symbol('runValidation');
const kSetHasOutput = Symbol('setHasOutput');
export interface YargsInternalMethods {
  getCommandInstance(): CommandInstance;
  getContext(): Context;
  getHasOutput(): boolean;
  getLoggerInstance(): LoggerInstance;
  getParseContext(): Object;
  getParserConfiguration(): Configuration;
  getUsageInstance(): UsageInstance;
  getValidationInstance(): ValidationInstance;
  hasParseCallback(): boolean;
  postProcess<T extends Arguments | Promise<Arguments>>(
    argv: Arguments | Promise<Arguments>,
    populateDoubleDash: boolean,
    calledFromCommand: boolean,
    runGlobalMiddleware: boolean
  ): any;
  reset(aliases?: Aliases): YargsInstance;
  runValidation(
    aliases: Dictionary<string[]>,
    positionalMap: Dictionary<string[]>,
    parseErrors: Error | null,
    isDefaultCommand?: boolean
  ): (argv: Arguments) => void;
  runYargsParserAndExecuteCommands(
    args: string | string[] | null,
    shortCircuit?: boolean | null,
    calledFromCommand?: boolean,
    commandIndex?: number,
    helpOnly?: boolean
  ): Arguments | Promise<Arguments>;
  setHasOutput(): void;
}

export class YargsInstance {
  $0: string;
  argv?: Arguments;
  customScriptName = false;
  parsed: DetailedArguments | false = false;

  #command: CommandInstance;
  #cwd: string;
  // use context object to keep track of resets, subcommand execution, etc.,
  // submodules should modify and check the state of context as necessary:
  #context: Context = {commands: [], fullCommands: []};
  #completion: CompletionInstance | null = null;
  #completionCommand: string | null = null;
  #defaultShowHiddenOpt = 'show-hidden';
  #exitError: YError | string | undefined | null = null;
  #detectLocale = true;
  #exitProcess = true;
  #frozens: FrozenYargsInstance[] = [];
  #globalMiddleware: GlobalMiddleware;
  #groups: Dictionary<string[]> = {};
  #hasOutput = false;
  #helpOpt: string | null = null;
  #logger: LoggerInstance;
  #output = '';
  #options: Options;
  #parentRequire?: RequireType;
  #parserConfig: Configuration = {};
  #parseFn: ParseCallback | null = null;
  #parseContext: object | null = null;
  #pkgs: Dictionary<{[key: string]: string | {[key: string]: string}}> = {};
  #preservedGroups: Dictionary<string[]> = {};
  #processArgs: string | string[];
  #recommendCommands = false;
  #shim: PlatformShim;
  #strict = false;
  #strictCommands = false;
  #strictOptions = false;
  #usage: UsageInstance;
  #versionOpt: string | null = null;
  #validation: ValidationInstance;

  constructor(
    processArgs: string | string[] = [],
    cwd: string,
    parentRequire: RequireType | undefined,
    shim: PlatformShim
  ) {
    this.#shim = shim;
    this.#processArgs = processArgs;
    this.#cwd = cwd;
    this.#parentRequire = parentRequire;
    this.#globalMiddleware = new GlobalMiddleware(this);
    this.$0 = this[kGetDollarZero]();
    // #command, #validation, and #usage are initialized on first reset:
    this[kReset]();
    this.#command = this!.#command;
    this.#usage = this!.#usage;
    this.#validation = this!.#validation;
    this.#options = this!.#options;
    this.#options.showHiddenOpt = this.#defaultShowHiddenOpt;
    this.#logger = this[kCreateLogger]();
  }
  addHelpOpt(opt?: string | false, msg?: string): YargsInstance {
    const defaultHelpOpt = 'help';
    argsert('[string|boolean] [string]', [opt, msg], arguments.length);

    // nuke the key previously configured
    // to return help.
    if (this.#helpOpt) {
      this[kDeleteFromParserHintObject](this.#helpOpt);
      this.#helpOpt = null;
    }

    if (opt === false && msg === undefined) return this;

    // use arguments, fallback to defaults for opt and msg
    this.#helpOpt = typeof opt === 'string' ? opt : defaultHelpOpt;
    this.boolean(this.#helpOpt);
    this.describe(
      this.#helpOpt,
      msg || this.#usage.deferY18nLookup('Show help')
    );
    return this;
  }
  help(opt?: string, msg?: string): YargsInstance {
    return this.addHelpOpt(opt, msg);
  }

  addShowHiddenOpt(opt?: string | false, msg?: string): YargsInstance {
    argsert('[string|boolean] [string]', [opt, msg], arguments.length);
    if (opt === false && msg === undefined) return this;
    const showHiddenOpt =
      typeof opt === 'string' ? opt : this.#defaultShowHiddenOpt;
    this.boolean(showHiddenOpt);
    this.describe(
      showHiddenOpt,
      msg || this.#usage.deferY18nLookup('Show hidden options')
    );
    this.#options.showHiddenOpt = showHiddenOpt;
    return this;
  }
  showHidden(opt?: string | false, msg?: string): YargsInstance {
    return this.addShowHiddenOpt(opt, msg);
  }

  alias(
    key: string | string[] | Dictionary<string | string[]>,
    value?: string | string[]
  ): YargsInstance {
    argsert(
      '<object|string|array> [string|array]',
      [key, value],
      arguments.length
    );
    this[kPopulateParserHintArrayDictionary](
      this.alias.bind(this),
      'alias',
      key,
      value
    );
    return this;
  }
  array(keys: string | string[]): YargsInstance {
    argsert('<array|string>', [keys], arguments.length);
    this[kPopulateParserHintArray]('array', keys);
    return this;
  }
  boolean(keys: string | string[]): YargsInstance {
    argsert('<array|string>', [keys], arguments.length);
    this[kPopulateParserHintArray]('boolean', keys);
    return this;
  }
  check(f: (argv: Arguments) => any, global?: boolean): YargsInstance {
    argsert('<function> [boolean]', [f, global], arguments.length);
    this.middleware(
      (
        argv: Arguments,
        _yargs: YargsInstance
      ): Partial<Arguments> | Promise<Partial<Arguments>> => {
        return maybeAsyncResult<
          Partial<Arguments> | Promise<Partial<Arguments>> | any
        >(
          () => {
            return f(argv);
          },
          (result: any): Partial<Arguments> | Promise<Partial<Arguments>> => {
            if (!result) {
              this.#usage.fail(
                this.#shim.y18n.__('Argument check failed: %s', f.toString())
              );
            } else if (typeof result === 'string' || result instanceof Error) {
              this.#usage.fail(result.toString(), result);
            }
            return argv;
          },
          (err: Error): Partial<Arguments> | Promise<Partial<Arguments>> => {
            this.#usage.fail(err.message ? err.message : err.toString(), err);
            return argv;
          }
        );
      },
      false,
      global
    );
    return this;
  }
  choices(
    key: string | string[] | Dictionary<string | string[]>,
    value?: string | string[]
  ): YargsInstance {
    argsert(
      '<object|string|array> [string|array]',
      [key, value],
      arguments.length
    );
    this[kPopulateParserHintArrayDictionary](
      this.choices.bind(this),
      'choices',
      key,
      value
    );
    return this;
  }
  coerce(
    keys: string | string[] | Dictionary<CoerceCallback>,
    value?: CoerceCallback
  ): YargsInstance {
    argsert(
      '<object|string|array> [function]',
      [keys, value],
      arguments.length
    );
    if (Array.isArray(keys)) {
      if (!value) {
        throw new YError('coerce callback must be provided');
      }
      for (const key of keys) {
        this.coerce(key, value);
      }
      return this;
    } else if (typeof keys === 'object') {
      for (const key of Object.keys(keys)) {
        this.coerce(key, keys[key]);
      }
      return this;
    }
    if (!value) {
      throw new YError('coerce callback must be provided');
    }
    // This noop tells yargs-parser about the existence of the option
    // represented by "keys", so that it can apply camel case expansion
    // if needed:
    this.#options.key[keys] = true;
    this.#globalMiddleware.addCoerceMiddleware(
      (
        argv: Arguments,
        yargs: YargsInstance
      ): Partial<Arguments> | Promise<Partial<Arguments>> => {
        let aliases: Dictionary<string[]>;
        return maybeAsyncResult<
          Partial<Arguments> | Promise<Partial<Arguments>> | any
        >(
          () => {
            aliases = yargs.getAliases();
            return value(argv[keys]);
          },
          (result: any): Partial<Arguments> => {
            argv[keys] = result;
            if (aliases[keys]) {
              for (const alias of aliases[keys]) {
                argv[alias] = result;
              }
            }
            return argv;
          },
          (err: Error): Partial<Arguments> | Promise<Partial<Arguments>> => {
            throw new YError(err.message);
          }
        );
      },
      keys
    );
    return this;
  }
  conflicts(
    key1: string | Dictionary<string | string[]>,
    key2?: string | string[]
  ): YargsInstance {
    argsert('<string|object> [string|array]', [key1, key2], arguments.length);
    this.#validation.conflicts(key1, key2);
    return this;
  }
  config(
    key: string | string[] | Dictionary = 'config',
    msg?: string | ConfigCallback,
    parseFn?: ConfigCallback
  ): YargsInstance {
    argsert(
      '[object|string] [string|function] [function]',
      [key, msg, parseFn],
      arguments.length
    );
    // allow a config object to be provided directly.
    if (typeof key === 'object' && !Array.isArray(key)) {
      key = applyExtends(
        key,
        this.#cwd,
        this[kGetParserConfiguration]()['deep-merge-config'] || false,
        this.#shim
      );
      this.#options.configObjects = (this.#options.configObjects || []).concat(
        key
      );
      return this;
    }

    // allow for a custom parsing function.
    if (typeof msg === 'function') {
      parseFn = msg;
      msg = undefined;
    }

    this.describe(
      key,
      msg || this.#usage.deferY18nLookup('Path to JSON config file')
    );
    (Array.isArray(key) ? key : [key]).forEach(k => {
      this.#options.config[k] = parseFn || true;
    });

    return this;
  }
  completion(
    cmd?: string,
    desc?: string | false | CompletionFunction,
    fn?: CompletionFunction
  ): YargsInstance {
    argsert(
      '[string] [string|boolean|function] [function]',
      [cmd, desc, fn],
      arguments.length
    );

    // a function to execute when generating
    // completions can be provided as the second
    // or third argument to completion.
    if (typeof desc === 'function') {
      fn = desc;
      desc = undefined;
    }

    // register the completion command.
    this.#completionCommand = cmd || this.#completionCommand || 'completion';
    if (!desc && desc !== false) {
      desc = 'generate completion script';
    }
    this.command(this.#completionCommand, desc);

    // a function can be provided
    if (fn) this.#completion!.registerFunction(fn);

    return this;
  }
  command(
    cmd: string | CommandHandlerDefinition | DefinitionOrCommandName[],
    description?: CommandHandler['description'],
    builder?: CommandBuilderDefinition | CommandBuilder,
    handler?: CommandHandlerCallback,
    middlewares?: Middleware[],
    deprecated?: boolean
  ): YargsInstance {
    argsert(
      '<string|array|object> [string|boolean] [function|object] [function] [array] [boolean|string]',
      [cmd, description, builder, handler, middlewares, deprecated],
      arguments.length
    );
    this.#command.addHandler(
      cmd,
      description,
      builder,
      handler,
      middlewares,
      deprecated
    );
    return this;
  }
  commands(
    cmd: string | CommandHandlerDefinition | DefinitionOrCommandName[],
    description?: CommandHandler['description'],
    builder?: CommandBuilderDefinition | CommandBuilder,
    handler?: CommandHandlerCallback,
    middlewares?: Middleware[],
    deprecated?: boolean
  ): YargsInstance {
    return this.command(
      cmd,
      description,
      builder,
      handler,
      middlewares,
      deprecated
    );
  }
  commandDir(dir: string, opts?: RequireDirectoryOptions): YargsInstance {
    argsert('<string> [object]', [dir, opts], arguments.length);
    const req = this.#parentRequire || this.#shim.require;
    this.#command.addDirectory(dir, req, this.#shim.getCallerFile(), opts);
    return this;
  }
  count(keys: string | string[]): YargsInstance {
    argsert('<array|string>', [keys], arguments.length);
    this[kPopulateParserHintArray]('count', keys);
    return this;
  }
  default(
    key: string | string[] | Dictionary<any>,
    value?: any,
    defaultDescription?: string
  ): YargsInstance {
    argsert(
      '<object|string|array> [*] [string]',
      [key, value, defaultDescription],
      arguments.length
    );
    if (defaultDescription) {
      assertSingleKey(key, this.#shim);
      this.#options.defaultDescription[key] = defaultDescription;
    }
    if (typeof value === 'function') {
      assertSingleKey(key, this.#shim);
      if (!this.#options.defaultDescription[key])
        this.#options.defaultDescription[key] =
          this.#usage.functionDescription(value);
      value = value.call();
    }
    this[kPopulateParserHintSingleValueDictionary]<'default'>(
      this.default.bind(this),
      'default',
      key,
      value
    );
    return this;
  }
  defaults(
    key: string | string[] | Dictionary<any>,
    value?: any,
    defaultDescription?: string
  ): YargsInstance {
    return this.default(key, value, defaultDescription);
  }
  demandCommand(
    min = 1,
    max?: number | string,
    minMsg?: string | null,
    maxMsg?: string | null
  ): YargsInstance {
    argsert(
      '[number] [number|string] [string|null|undefined] [string|null|undefined]',
      [min, max, minMsg, maxMsg],
      arguments.length
    );

    if (typeof max !== 'number') {
      minMsg = max;
      max = Infinity;
    }

    this.global('_', false);

    this.#options.demandedCommands._ = {
      min,
      max,
      minMsg,
      maxMsg,
    };

    return this;
  }
  demand(
    keys: string | string[] | Dictionary<string | undefined> | number,
    max?: number | string[] | string | true,
    msg?: string | true
  ): YargsInstance {
    // you can optionally provide a 'max' key,
    // which will raise an exception if too many '_'
    // options are provided.
    if (Array.isArray(max)) {
      max.forEach(key => {
        assertNotStrictEqual(msg, true as const, this.#shim);
        this.demandOption(key, msg);
      });
      max = Infinity;
    } else if (typeof max !== 'number') {
      msg = max;
      max = Infinity;
    }

    if (typeof keys === 'number') {
      assertNotStrictEqual(msg, true as const, this.#shim);
      this.demandCommand(keys, max, msg, msg);
    } else if (Array.isArray(keys)) {
      keys.forEach(key => {
        assertNotStrictEqual(msg, true as const, this.#shim);
        this.demandOption(key, msg);
      });
    } else {
      if (typeof msg === 'string') {
        this.demandOption(keys, msg);
      } else if (msg === true || typeof msg === 'undefined') {
        this.demandOption(keys);
      }
    }

    return this;
  }
  demandOption(
    keys: string | string[] | Dictionary<string | undefined>,
    msg?: string
  ): YargsInstance {
    argsert('<object|string|array> [string]', [keys, msg], arguments.length);
    this[kPopulateParserHintSingleValueDictionary](
      this.demandOption.bind(this),
      'demandedOptions',
      keys,
      msg
    );
    return this;
  }
  deprecateOption(option: string, message: string | boolean): YargsInstance {
    argsert('<string> [string|boolean]', [option, message], arguments.length);
    this.#options.deprecatedOptions[option] = message;
    return this;
  }
  describe(
    keys: string | string[] | Dictionary<string>,
    description?: string
  ): YargsInstance {
    argsert(
      '<object|string|array> [string]',
      [keys, description],
      arguments.length
    );
    this[kSetKey](keys, true);
    this.#usage.describe(keys, description);
    return this;
  }
  detectLocale(detect: boolean): YargsInstance {
    argsert('<boolean>', [detect], arguments.length);
    this.#detectLocale = detect;
    return this;
  }
  // as long as options.envPrefix is not undefined,
  // parser will apply env vars matching prefix to argv
  env(prefix?: string | false): YargsInstance {
    argsert('[string|boolean]', [prefix], arguments.length);
    if (prefix === false) delete this.#options.envPrefix;
    else this.#options.envPrefix = prefix || '';
    return this;
  }
  epilogue(msg: string): YargsInstance {
    argsert('<string>', [msg], arguments.length);
    this.#usage.epilog(msg);
    return this;
  }
  epilog(msg: string): YargsInstance {
    return this.epilogue(msg);
  }
  example(
    cmd: string | [string, string?][],
    description?: string
  ): YargsInstance {
    argsert('<string|array> [string]', [cmd, description], arguments.length);

    if (Array.isArray(cmd)) {
      cmd.forEach(exampleParams => this.example(...exampleParams));
    } else {
      this.#usage.example(cmd, description);
    }

    return this;
  }
  // maybe exit, always capture context about why we wanted to exit:
  exit(code: number, err?: YError | string): void {
    this.#hasOutput = true;
    this.#exitError = err;
    if (this.#exitProcess) this.#shim.process.exit(code);
  }
  exitProcess(enabled = true): YargsInstance {
    argsert('[boolean]', [enabled], arguments.length);
    this.#exitProcess = enabled;
    return this;
  }
  fail(f: FailureFunction | boolean): YargsInstance {
    argsert('<function|boolean>', [f], arguments.length);
    if (typeof f === 'boolean' && f !== false) {
      throw new YError(
        "Invalid first argument. Expected function or boolean 'false'"
      );
    }
    this.#usage.failFn(f);
    return this;
  }
  getAliases(): Dictionary<string[]> {
    return this.parsed ? this.parsed.aliases : {};
  }
  async getCompletion(
    args: string[],
    done?: (err: Error | null, completions: string[] | undefined) => void
  ): Promise<string[] | void> {
    argsert('<array> [function]', [args, done], arguments.length);
    if (!done) {
      return new Promise((resolve, reject) => {
        this.#completion!.getCompletion(args, (err, completions) => {
          if (err) reject(err);
          else resolve(completions);
        });
      });
    } else {
      return this.#completion!.getCompletion(args, done);
    }
  }
  getDemandedOptions() {
    argsert([], 0);
    return this.#options.demandedOptions;
  }
  getDemandedCommands() {
    argsert([], 0);
    return this.#options.demandedCommands;
  }
  getDeprecatedOptions() {
    argsert([], 0);
    return this.#options.deprecatedOptions;
  }
  getDetectLocale(): boolean {
    return this.#detectLocale;
  }
  getExitProcess(): boolean {
    return this.#exitProcess;
  }
  // combine explicit and preserved groups. explicit groups should be first
  getGroups(): Dictionary<string[]> {
    return Object.assign({}, this.#groups, this.#preservedGroups);
  }
  getHelp(): Promise<string> {
    this.#hasOutput = true;
    if (!this.#usage.hasCachedHelpMessage()) {
      if (!this.parsed) {
        // Run the parser as if --help was passed to it (this is what
        // the last parameter `true` indicates).
        const parse = this[kRunYargsParserAndExecuteCommands](
          this.#processArgs,
          undefined,
          undefined,
          0,
          true
        );
        if (isPromise(parse)) {
          return parse.then(() => {
            return this.#usage.help();
          });
        }
      }
      // Ensure top level options/positionals have been configured:
      const builderResponse = this.#command.runDefaultBuilderOn(this);
      if (isPromise(builderResponse)) {
        return builderResponse.then(() => {
          return this.#usage.help();
        });
      }
    }
    return Promise.resolve(this.#usage.help());
  }
  getOptions(): Options {
    return this.#options;
  }
  getStrict(): boolean {
    return this.#strict;
  }
  getStrictCommands(): boolean {
    return this.#strictCommands;
  }
  getStrictOptions(): boolean {
    return this.#strictOptions;
  }
  global(globals: string | string[], global?: boolean): YargsInstance {
    argsert('<string|array> [boolean]', [globals, global], arguments.length);
    globals = ([] as string[]).concat(globals);
    if (global !== false) {
      this.#options.local = this.#options.local.filter(
        l => globals.indexOf(l) === -1
      );
    } else {
      globals.forEach(g => {
        if (this.#options.local.indexOf(g) === -1) this.#options.local.push(g);
      });
    }
    return this;
  }
  group(opts: string | string[], groupName: string): YargsInstance {
    argsert('<string|array> <string>', [opts, groupName], arguments.length);
    const existing =
      this.#preservedGroups[groupName] || this.#groups[groupName];
    if (this.#preservedGroups[groupName]) {
      // we now only need to track this group name in groups.
      delete this.#preservedGroups[groupName];
    }
    const seen: Dictionary<boolean> = {};
    this.#groups[groupName] = (existing || []).concat(opts).filter(key => {
      if (seen[key]) return false;
      return (seen[key] = true);
    });
    return this;
  }
  hide(key: string): YargsInstance {
    argsert('<string>', [key], arguments.length);
    this.#options.hiddenOptions.push(key);
    return this;
  }
  implies(
    key: string | Dictionary<KeyOrPos | KeyOrPos[]>,
    value?: KeyOrPos | KeyOrPos[]
  ): YargsInstance {
    argsert(
      '<string|object> [number|string|array]',
      [key, value],
      arguments.length
    );
    this.#validation.implies(key, value);
    return this;
  }
  locale(locale?: string): YargsInstance | string {
    argsert('[string]', [locale], arguments.length);
    if (!locale) {
      this[kGuessLocale]();
      return this.#shim.y18n.getLocale();
    }
    this.#detectLocale = false;
    this.#shim.y18n.setLocale(locale);
    return this;
  }
  middleware(
    callback: MiddlewareCallback | MiddlewareCallback[],
    applyBeforeValidation?: boolean,
    global?: boolean
  ): YargsInstance {
    return this.#globalMiddleware.addMiddleware(
      callback,
      !!applyBeforeValidation,
      global
    );
  }
  nargs(
    key: string | string[] | Dictionary<number>,
    value?: number
  ): YargsInstance {
    argsert('<string|object|array> [number]', [key, value], arguments.length);
    this[kPopulateParserHintSingleValueDictionary](
      this.nargs.bind(this),
      'narg',
      key,
      value
    );
    return this;
  }
  normalize(keys: string | string[]): YargsInstance {
    argsert('<array|string>', [keys], arguments.length);
    this[kPopulateParserHintArray]('normalize', keys);
    return this;
  }
  number(keys: string | string[]): YargsInstance {
    argsert('<array|string>', [keys], arguments.length);
    this[kPopulateParserHintArray]('number', keys);
    return this;
  }
  option(
    key: string | Dictionary<OptionDefinition>,
    opt?: OptionDefinition
  ): YargsInstance {
    argsert('<string|object> [object]', [key, opt], arguments.length);
    if (typeof key === 'object') {
      Object.keys(key).forEach(k => {
        this.options(k, key[k]);
      });
    } else {
      if (typeof opt !== 'object') {
        opt = {};
      }

      // Prevent version name collision
      // Addresses: https://github.com/yargs/yargs/issues/1979
      if (this.#versionOpt && (key === 'version' || opt?.alias === 'version')) {
        throw new YError(
          [
            '"version" is a reserved word.',
            'Please do one of the following:',
            '- Disable version with `yargs.version(false)` if using "version" as an option',
            '- Use the built-in `yargs.version` method instead (if applicable)',
            '- Use a different option key',
            'https://yargs.js.org/docs/#api-reference-version',
          ].join('\n')
        );
      }

      this.#options.key[key] = true; // track manually set keys.

      if (opt.alias) this.alias(key, opt.alias);

      const deprecate = opt.deprecate || opt.deprecated;

      if (deprecate) {
        this.deprecateOption(key, deprecate);
      }

      const demand = opt.demand || opt.required || opt.require;

      // A required option can be specified via "demand: true".
      if (demand) {
        this.demand(key, demand);
      }

      if (opt.demandOption) {
        this.demandOption(
          key,
          typeof opt.demandOption === 'string' ? opt.demandOption : undefined
        );
      }

      if (opt.conflicts) {
        this.conflicts(key, opt.conflicts);
      }

      if ('default' in opt) {
        this.default(key, opt.default);
      }

      if (opt.implies !== undefined) {
        this.implies(key, opt.implies);
      }

      if (opt.nargs !== undefined) {
        this.nargs(key, opt.nargs);
      }

      if (opt.config) {
        this.config(key, opt.configParser);
      }

      if (opt.normalize) {
        this.normalize(key);
      }

      if (opt.choices) {
        this.choices(key, opt.choices);
      }

      if (opt.coerce) {
        this.coerce(key, opt.coerce);
      }

      if (opt.group) {
        this.group(key, opt.group);
      }

      if (opt.boolean || opt.type === 'boolean') {
        this.boolean(key);
        if (opt.alias) this.boolean(opt.alias);
      }

      if (opt.array || opt.type === 'array') {
        this.array(key);
        if (opt.alias) this.array(opt.alias);
      }

      if (opt.number || opt.type === 'number') {
        this.number(key);
        if (opt.alias) this.number(opt.alias);
      }

      if (opt.string || opt.type === 'string') {
        this.string(key);
        if (opt.alias) this.string(opt.alias);
      }

      if (opt.count || opt.type === 'count') {
        this.count(key);
      }

      if (typeof opt.global === 'boolean') {
        this.global(key, opt.global);
      }

      if (opt.defaultDescription) {
        this.#options.defaultDescription[key] = opt.defaultDescription;
      }

      if (opt.skipValidation) {
        this.skipValidation(key);
      }

      const desc = opt.describe || opt.description || opt.desc;
      this.describe(key, desc);
      if (opt.hidden) {
        this.hide(key);
      }

      if (opt.requiresArg) {
        this.requiresArg(key);
      }
    }

    return this;
  }
  options(
    key: string | Dictionary<OptionDefinition>,
    opt?: OptionDefinition
  ): YargsInstance {
    return this.option(key, opt);
  }
  parse(
    args?: string | string[],
    shortCircuit?: object | ParseCallback | boolean,
    _parseFn?: ParseCallback
  ): Arguments | Promise<Arguments> {
    argsert(
      '[string|array] [function|boolean|object] [function]',
      [args, shortCircuit, _parseFn],
      arguments.length
    );
    this[kFreeze](); // Push current state of parser onto stack.
    if (typeof args === 'undefined') {
      args = this.#processArgs;
    }

    // a context object can optionally be provided, this allows
    // additional information to be passed to a command handler.
    if (typeof shortCircuit === 'object') {
      this.#parseContext = shortCircuit;
      shortCircuit = _parseFn;
    }

    // by providing a function as a second argument to
    // parse you can capture output that would otherwise
    // default to printing to stdout/stderr.
    if (typeof shortCircuit === 'function') {
      this.#parseFn = shortCircuit as ParseCallback;
      shortCircuit = false;
    }
    // completion short-circuits the parsing process,
    // skipping validation, etc.
    if (!shortCircuit) this.#processArgs = args;

    if (this.#parseFn) this.#exitProcess = false;

    const parsed = this[kRunYargsParserAndExecuteCommands](
      args,
      !!shortCircuit
    );
    const tmpParsed = this.parsed;
    this.#completion!.setParsed(this.parsed as DetailedArguments);
    if (isPromise(parsed)) {
      return parsed
        .then(argv => {
          if (this.#parseFn) this.#parseFn(this.#exitError, argv, this.#output);
          return argv;
        })
        .catch(err => {
          if (this.#parseFn) {
            this.#parseFn!(
              err,
              (this.parsed as DetailedArguments).argv,
              this.#output
            );
          }
          throw err;
        })
        .finally(() => {
          this[kUnfreeze](); // Pop the stack.
          this.parsed = tmpParsed;
        });
    } else {
      if (this.#parseFn) this.#parseFn(this.#exitError, parsed, this.#output);
      this[kUnfreeze](); // Pop the stack.
      this.parsed = tmpParsed;
    }
    return parsed;
  }
  parseAsync(
    args?: string | string[],
    shortCircuit?: object | ParseCallback | boolean,
    _parseFn?: ParseCallback
  ): Promise<Arguments> {
    const maybePromise = this.parse(args, shortCircuit, _parseFn);
    return !isPromise(maybePromise)
      ? Promise.resolve(maybePromise)
      : maybePromise;
  }
  parseSync(
    args?: string | string[],
    shortCircuit?: object | ParseCallback | boolean,
    _parseFn?: ParseCallback
  ): Arguments {
    const maybePromise = this.parse(args, shortCircuit, _parseFn);
    if (isPromise(maybePromise)) {
      throw new YError(
        '.parseSync() must not be used with asynchronous builders, handlers, or middleware'
      );
    }
    return maybePromise;
  }
  parserConfiguration(config: Configuration) {
    argsert('<object>', [config], arguments.length);
    this.#parserConfig = config;
    return this;
  }
  pkgConf(key: string, rootPath?: string): YargsInstance {
    argsert('<string> [string]', [key, rootPath], arguments.length);
    let conf = null;
    // prefer cwd to require-main-filename in this method
    // since we're looking for e.g. "nyc" config in nyc consumer
    // rather than "yargs" config in nyc (where nyc is the main filename)
    const obj = this[kPkgUp](rootPath || this.#cwd);

    // If an object exists in the key, add it to options.configObjects
    if (obj[key] && typeof obj[key] === 'object') {
      conf = applyExtends(
        obj[key] as {[key: string]: string},
        rootPath || this.#cwd,
        this[kGetParserConfiguration]()['deep-merge-config'] || false,
        this.#shim
      );
      this.#options.configObjects = (this.#options.configObjects || []).concat(
        conf
      );
    }
    return this;
  }
  positional(key: string, opts: PositionalDefinition): YargsInstance {
    argsert('<string> <object>', [key, opts], arguments.length);
    // .positional() only supports a subset of the configuration
    // options available to .option():
    const supportedOpts: (keyof PositionalDefinition)[] = [
      'default',
      'defaultDescription',
      'implies',
      'normalize',
      'choices',
      'conflicts',
      'coerce',
      'type',
      'describe',
      'desc',
      'description',
      'alias',
    ];
    opts = objFilter(opts, (k, v) => {
      let accept = supportedOpts.indexOf(k) !== -1;
      // type can be one of string|number|boolean.
      if (k === 'type' && ['string', 'number', 'boolean'].indexOf(v) === -1)
        accept = false;
      return accept;
    });

    // copy over any settings that can be inferred from the command string.
    const fullCommand =
      this.#context.fullCommands[this.#context.fullCommands.length - 1];
    const parseOptions = fullCommand
      ? this.#command.cmdToParseOptions(fullCommand)
      : {
          array: [],
          alias: {},
          default: {},
          demand: {},
        };
    objectKeys(parseOptions).forEach(pk => {
      const parseOption = parseOptions[pk];
      if (Array.isArray(parseOption)) {
        if (parseOption.indexOf(key) !== -1) opts[pk] = true;
      } else {
        if (parseOption[key] && !(pk in opts)) opts[pk] = parseOption[key];
      }
    });
    this.group(key, this.#usage.getPositionalGroupName());
    return this.option(key, opts);
  }
  recommendCommands(recommend = true): YargsInstance {
    argsert('[boolean]', [recommend], arguments.length);
    this.#recommendCommands = recommend;
    return this;
  }
  required(
    keys: string | string[] | Dictionary<string | undefined> | number,
    max?: number | string[] | string | true,
    msg?: string | true
  ): YargsInstance {
    return this.demand(keys, max, msg);
  }
  require(
    keys: string | string[] | Dictionary<string | undefined> | number,
    max?: number | string[] | string | true,
    msg?: string | true
  ): YargsInstance {
    return this.demand(keys, max, msg);
  }
  requiresArg(keys: string | string[] | Dictionary): YargsInstance {
    // the 2nd paramter [number] in the argsert the assertion is mandatory
    // as populateParserHintSingleValueDictionary recursively calls requiresArg
    // with Nan as a 2nd parameter, although we ignore it
    argsert('<array|string|object> [number]', [keys], arguments.length);
    // If someone configures nargs at the same time as requiresArg,
    // nargs should take precedence,
    // see: https://github.com/yargs/yargs/pull/1572
    // TODO: make this work with aliases, using a check similar to
    // checkAllAliases() in yargs-parser.
    if (typeof keys === 'string' && this.#options.narg[keys]) {
      return this;
    } else {
      this[kPopulateParserHintSingleValueDictionary](
        this.requiresArg.bind(this),
        'narg',
        keys,
        NaN
      );
    }
    return this;
  }
  showCompletionScript($0?: string, cmd?: string): YargsInstance {
    argsert('[string] [string]', [$0, cmd], arguments.length);
    $0 = $0 || this.$0;
    this.#logger.log(
      this.#completion!.generateCompletionScript(
        $0,
        cmd || this.#completionCommand || 'completion'
      )
    );
    return this;
  }
  showHelp(
    level: 'error' | 'log' | ((message: string) => void)
  ): YargsInstance {
    argsert('[string|function]', [level], arguments.length);
    this.#hasOutput = true;
    if (!this.#usage.hasCachedHelpMessage()) {
      if (!this.parsed) {
        // Run the parser as if --help was passed to it (this is what
        // the last parameter `true` indicates).
        const parse = this[kRunYargsParserAndExecuteCommands](
          this.#processArgs,
          undefined,
          undefined,
          0,
          true
        );
        if (isPromise(parse)) {
          parse.then(() => {
            this.#usage.showHelp(level);
          });
          return this;
        }
      }
      // Ensure top level options/positionals have been configured:
      const builderResponse = this.#command.runDefaultBuilderOn(this);
      if (isPromise(builderResponse)) {
        builderResponse.then(() => {
          this.#usage.showHelp(level);
        });
        return this;
      }
    }
    this.#usage.showHelp(level);
    return this;
  }
  scriptName(scriptName: string): YargsInstance {
    this.customScriptName = true;
    this.$0 = scriptName;
    return this;
  }
  showHelpOnFail(enabled?: string | boolean, message?: string): YargsInstance {
    argsert('[boolean|string] [string]', [enabled, message], arguments.length);
    this.#usage.showHelpOnFail(enabled, message);
    return this;
  }
  showVersion(
    level: 'error' | 'log' | ((message: string) => void)
  ): YargsInstance {
    argsert('[string|function]', [level], arguments.length);
    this.#usage.showVersion(level);
    return this;
  }
  skipValidation(keys: string | string[]): YargsInstance {
    argsert('<array|string>', [keys], arguments.length);
    this[kPopulateParserHintArray]('skipValidation', keys);
    return this;
  }
  strict(enabled?: boolean): YargsInstance {
    argsert('[boolean]', [enabled], arguments.length);
    this.#strict = enabled !== false;
    return this;
  }
  strictCommands(enabled?: boolean): YargsInstance {
    argsert('[boolean]', [enabled], arguments.length);
    this.#strictCommands = enabled !== false;
    return this;
  }
  strictOptions(enabled?: boolean): YargsInstance {
    argsert('[boolean]', [enabled], arguments.length);
    this.#strictOptions = enabled !== false;
    return this;
  }
  string(key: string | string[]): YargsInstance {
    argsert('<array|string>', [key], arguments.length);
    this[kPopulateParserHintArray]('string', key);
    return this;
  }
  terminalWidth(): number | null {
    argsert([], 0);
    return this.#shim.process.stdColumns;
  }
  updateLocale(obj: Dictionary<string>): YargsInstance {
    return this.updateStrings(obj);
  }
  updateStrings(obj: Dictionary<string>): YargsInstance {
    argsert('<object>', [obj], arguments.length);
    this.#detectLocale = false;
    this.#shim.y18n.updateLocale(obj);
    return this;
  }
  usage(
    msg: string | null,
    description?: CommandHandler['description'],
    builder?: CommandBuilderDefinition | CommandBuilder,
    handler?: CommandHandlerCallback
  ): YargsInstance {
    argsert(
      '<string|null|undefined> [string|boolean] [function|object] [function]',
      [msg, description, builder, handler],
      arguments.length
    );

    if (description !== undefined) {
      assertNotStrictEqual(msg, null, this.#shim);
      // .usage() can be used as an alias for defining
      // a default command.
      if ((msg || '').match(/^\$0( |$)/)) {
        return this.command(msg, description, builder, handler);
      } else {
        throw new YError(
          '.usage() description must start with $0 if being used as alias for .command()'
        );
      }
    } else {
      this.#usage.usage(msg);
      return this;
    }
  }
  version(opt?: string | false, msg?: string, ver?: string): YargsInstance {
    const defaultVersionOpt = 'version';
    argsert(
      '[boolean|string] [string] [string]',
      [opt, msg, ver],
      arguments.length
    );

    // nuke the key previously configured
    // to return version #.
    if (this.#versionOpt) {
      this[kDeleteFromParserHintObject](this.#versionOpt);
      this.#usage.version(undefined);
      this.#versionOpt = null;
    }

    if (arguments.length === 0) {
      ver = this[kGuessVersion]();
      opt = defaultVersionOpt;
    } else if (arguments.length === 1) {
      if (opt === false) {
        // disable default 'version' key.
        return this;
      }
      ver = opt;
      opt = defaultVersionOpt;
    } else if (arguments.length === 2) {
      ver = msg;
      msg = undefined;
    }

    this.#versionOpt = typeof opt === 'string' ? opt : defaultVersionOpt;
    msg = msg || this.#usage.deferY18nLookup('Show version number');

    this.#usage.version(ver || undefined);
    this.boolean(this.#versionOpt);
    this.describe(this.#versionOpt, msg);
    return this;
  }
  wrap(cols: number | null | undefined): YargsInstance {
    argsert('<number|null|undefined>', [cols], arguments.length);
    this.#usage.wrap(cols);
    return this;
  }

  // to simplify the parsing of positionals in commands,
  // we temporarily populate '--' rather than _, with arguments
  // after the '--' directive. After the parse, we copy these back.
  [kCopyDoubleDash](argv: Arguments): any {
    if (!argv._ || !argv['--']) return argv;
    // eslint-disable-next-line prefer-spread
    argv._.push.apply(argv._, argv['--']);

    // We catch an error here, in case someone has called Object.seal()
    // on the parsed object, see: https://github.com/babel/babel/pull/10733
    try {
      delete argv['--'];
      // eslint-disable-next-line no-empty
    } catch (_err) {}

    return argv;
  }
  [kCreateLogger](): LoggerInstance {
    return {
      log: (...args: any[]) => {
        if (!this[kHasParseCallback]()) console.log(...args);
        this.#hasOutput = true;
        if (this.#output.length) this.#output += '\n';
        this.#output += args.join(' ');
      },
      error: (...args: any[]) => {
        if (!this[kHasParseCallback]()) console.error(...args);
        this.#hasOutput = true;
        if (this.#output.length) this.#output += '\n';
        this.#output += args.join(' ');
      },
    };
  }
  [kDeleteFromParserHintObject](optionKey: string) {
    // delete from all parsing hints:
    // boolean, array, key, alias, etc.
    objectKeys(this.#options).forEach((hintKey: keyof Options) => {
      // configObjects is not a parsing hint array
      if (((key): key is 'configObjects' => key === 'configObjects')(hintKey))
        return;
      const hint = this.#options[hintKey];
      if (Array.isArray(hint)) {
        if (hint.includes(optionKey)) hint.splice(hint.indexOf(optionKey), 1);
      } else if (typeof hint === 'object') {
        delete (hint as Dictionary)[optionKey];
      }
    });
    // now delete the description from usage.js.
    delete this.#usage.getDescriptions()[optionKey];
  }
  [kFreeze]() {
    this.#frozens.push({
      options: this.#options,
      configObjects: this.#options.configObjects.slice(0),
      exitProcess: this.#exitProcess,
      groups: this.#groups,
      strict: this.#strict,
      strictCommands: this.#strictCommands,
      strictOptions: this.#strictOptions,
      completionCommand: this.#completionCommand,
      output: this.#output,
      exitError: this.#exitError!,
      hasOutput: this.#hasOutput,
      parsed: this.parsed,
      parseFn: this.#parseFn!,
      parseContext: this.#parseContext,
    });
    this.#usage.freeze();
    this.#validation.freeze();
    this.#command.freeze();
    this.#globalMiddleware.freeze();
  }
  [kGetDollarZero](): string {
    let $0 = '';
    // ignore the node bin, specify this in your
    // bin file with #!/usr/bin/env node
    let default$0: string[];
    if (/\b(node|iojs|electron)(\.exe)?$/.test(this.#shim.process.argv()[0])) {
      default$0 = this.#shim.process.argv().slice(1, 2);
    } else {
      default$0 = this.#shim.process.argv().slice(0, 1);
    }

    $0 = default$0
      .map(x => {
        const b = this[kRebase](this.#cwd, x);
        return x.match(/^(\/|([a-zA-Z]:)?\\)/) && b.length < x.length ? b : x;
      })
      .join(' ')
      .trim();

    if (
      this.#shim.getEnv('_') &&
      this.#shim.getProcessArgvBin() === this.#shim.getEnv('_')
    ) {
      $0 = this.#shim
        .getEnv('_')!
        .replace(
          `${this.#shim.path.dirname(this.#shim.process.execPath())}/`,
          ''
        );
    }
    return $0;
  }
  [kGetParserConfiguration](): Configuration {
    return this.#parserConfig;
  }
  [kGuessLocale]() {
    if (!this.#detectLocale) return;
    const locale =
      this.#shim.getEnv('LC_ALL') ||
      this.#shim.getEnv('LC_MESSAGES') ||
      this.#shim.getEnv('LANG') ||
      this.#shim.getEnv('LANGUAGE') ||
      'en_US';
    this.locale(locale.replace(/[.:].*/, ''));
  }
  [kGuessVersion](): string {
    const obj = this[kPkgUp]();
    return (obj.version as string) || 'unknown';
  }
  // We wait to coerce numbers for positionals until after the initial parse.
  // This allows commands to configure number parsing on a positional by
  // positional basis:
  [kParsePositionalNumbers](argv: Arguments): any {
    const args: (string | number)[] = argv['--'] ? argv['--'] : argv._;

    for (let i = 0, arg; (arg = args[i]) !== undefined; i++) {
      if (
        this.#shim.Parser.looksLikeNumber(arg) &&
        Number.isSafeInteger(Math.floor(parseFloat(`${arg}`)))
      ) {
        args[i] = Number(arg);
      }
    }
    return argv;
  }
  [kPkgUp](rootPath?: string) {
    const npath = rootPath || '*';
    if (this.#pkgs[npath]) return this.#pkgs[npath];

    let obj = {};
    try {
      let startDir = rootPath || this.#shim.mainFilename;

      // When called in an environment that lacks require.main.filename, such as a jest test runner,
      // startDir is already process.cwd(), and should not be shortened.
      // Whether or not it is _actually_ a directory (e.g., extensionless bin) is irrelevant, find-up handles it.
      if (!rootPath && this.#shim.path.extname(startDir)) {
        startDir = this.#shim.path.dirname(startDir);
      }

      const pkgJsonPath = this.#shim.findUp(
        startDir,
        (dir: string[], names: string[]) => {
          if (names.includes('package.json')) {
            return 'package.json';
          } else {
            return undefined;
          }
        }
      );
      assertNotStrictEqual(pkgJsonPath, undefined, this.#shim);
      obj = JSON.parse(this.#shim.readFileSync(pkgJsonPath, 'utf8'));
      // eslint-disable-next-line no-empty
    } catch (_noop) {}

    this.#pkgs[npath] = obj || {};
    return this.#pkgs[npath];
  }
  [kPopulateParserHintArray]<T extends KeyOf<Options, string[]>>(
    type: T,
    keys: string | string[]
  ) {
    keys = ([] as string[]).concat(keys);
    keys.forEach(key => {
      key = this[kSanitizeKey](key);
      this.#options[type].push(key);
    });
  }
  [kPopulateParserHintSingleValueDictionary]<
    T extends
      | Exclude<DictionaryKeyof<Options>, DictionaryKeyof<Options, any[]>>
      | 'default',
    K extends keyof Options[T] & string = keyof Options[T] & string,
    V extends ValueOf<Options[T]> = ValueOf<Options[T]>
  >(
    builder: (key: K, value: V, ...otherArgs: any[]) => YargsInstance,
    type: T,
    key: K | K[] | {[key in K]: V},
    value?: V
  ) {
    this[kPopulateParserHintDictionary]<T, K, V>(
      builder,
      type,
      key,
      value,
      (type, key, value) => {
        this.#options[type][key] = value as ValueOf<Options[T]>;
      }
    );
  }
  [kPopulateParserHintArrayDictionary]<
    T extends DictionaryKeyof<Options, any[]>,
    K extends keyof Options[T] & string = keyof Options[T] & string,
    V extends ValueOf<ValueOf<Options[T]>> | ValueOf<ValueOf<Options[T]>>[] =
      | ValueOf<ValueOf<Options[T]>>
      | ValueOf<ValueOf<Options[T]>>[]
  >(
    builder: (key: K, value: V, ...otherArgs: any[]) => YargsInstance,
    type: T,
    key: K | K[] | {[key in K]: V},
    value?: V
  ) {
    this[kPopulateParserHintDictionary]<T, K, V>(
      builder,
      type,
      key,
      value,
      (type, key, value) => {
        this.#options[type][key] = (
          this.#options[type][key] || ([] as Options[T][keyof Options[T]])
        ).concat(value);
      }
    );
  }
  [kPopulateParserHintDictionary]<
    T extends keyof Options,
    K extends keyof Options[T],
    V
  >(
    builder: (key: K, value: V, ...otherArgs: any[]) => YargsInstance,
    type: T,
    key: K | K[] | {[key in K]: V},
    value: V | undefined,
    singleKeyHandler: (type: T, key: K, value?: V) => void
  ) {
    if (Array.isArray(key)) {
      // an array of keys with one value ['x', 'y', 'z'], function parse () {}
      key.forEach(k => {
        builder(k, value!);
      });
    } else if (
      ((key): key is {[key in K]: V} => typeof key === 'object')(key)
    ) {
      // an object of key value pairs: {'x': parse () {}, 'y': parse() {}}
      for (const k of objectKeys(key)) {
        builder(k, key[k]);
      }
    } else {
      singleKeyHandler(type, this[kSanitizeKey](key), value);
    }
  }
  [kSanitizeKey](key: any) {
    if (key === '__proto__') return '___proto___';
    return key;
  }
  [kSetKey](
    key: string | string[] | Dictionary<string | boolean>,
    set?: boolean | string
  ) {
    this[kPopulateParserHintSingleValueDictionary](
      this[kSetKey].bind(this),
      'key',
      key,
      set
    );
    return this;
  }
  [kUnfreeze]() {
    const frozen = this.#frozens.pop();
    assertNotStrictEqual(frozen, undefined, this.#shim);
    let configObjects: Dictionary[];
    ({
      options: this.#options,
      configObjects,
      exitProcess: this.#exitProcess,
      groups: this.#groups,
      output: this.#output,
      exitError: this.#exitError,
      hasOutput: this.#hasOutput,
      parsed: this.parsed,
      strict: this.#strict,
      strictCommands: this.#strictCommands,
      strictOptions: this.#strictOptions,
      completionCommand: this.#completionCommand,
      parseFn: this.#parseFn,
      parseContext: this.#parseContext,
    } = frozen);
    this.#options.configObjects = configObjects;
    this.#usage.unfreeze();
    this.#validation.unfreeze();
    this.#command.unfreeze();
    this.#globalMiddleware.unfreeze();
  }
  // If argv is a promise (which is possible if async middleware is used)
  // delay applying validation until the promise has resolved:
  [kValidateAsync](
    validation: (argv: Arguments) => void,
    argv: Arguments | Promise<Arguments>
  ): Arguments | Promise<Arguments> {
    return maybeAsyncResult<Arguments>(argv, result => {
      validation(result);
      return result;
    });
  }

  // Note: these method names could change at any time, and should not be
  // depended upon externally:
  getInternalMethods(): YargsInternalMethods {
    return {
      getCommandInstance: this[kGetCommandInstance].bind(this),
      getContext: this[kGetContext].bind(this),
      getHasOutput: this[kGetHasOutput].bind(this),
      getLoggerInstance: this[kGetLoggerInstance].bind(this),
      getParseContext: this[kGetParseContext].bind(this),
      getParserConfiguration: this[kGetParserConfiguration].bind(this),
      getUsageInstance: this[kGetUsageInstance].bind(this),
      getValidationInstance: this[kGetValidationInstance].bind(this),
      hasParseCallback: this[kHasParseCallback].bind(this),
      postProcess: this[kPostProcess].bind(this),
      reset: this[kReset].bind(this),
      runValidation: this[kRunValidation].bind(this),
      runYargsParserAndExecuteCommands:
        this[kRunYargsParserAndExecuteCommands].bind(this),
      setHasOutput: this[kSetHasOutput].bind(this),
    };
  }
  [kGetCommandInstance](): CommandInstance {
    return this.#command;
  }
  [kGetContext](): Context {
    return this.#context;
  }
  [kGetHasOutput](): boolean {
    return this.#hasOutput;
  }
  [kGetLoggerInstance](): LoggerInstance {
    return this.#logger;
  }
  [kGetParseContext](): Object {
    return this.#parseContext || {};
  }
  [kGetUsageInstance](): UsageInstance {
    return this.#usage;
  }
  [kGetValidationInstance](): ValidationInstance {
    return this.#validation;
  }
  [kHasParseCallback](): boolean {
    return !!this.#parseFn;
  }
  [kPostProcess]<T extends Arguments | Promise<Arguments>>(
    argv: Arguments | Promise<Arguments>,
    populateDoubleDash: boolean,
    calledFromCommand: boolean,
    runGlobalMiddleware: boolean
  ): any {
    if (calledFromCommand) return argv;
    if (isPromise(argv)) return argv;
    if (!populateDoubleDash) {
      argv = this[kCopyDoubleDash](argv);
    }
    const parsePositionalNumbers =
      this[kGetParserConfiguration]()['parse-positional-numbers'] ||
      this[kGetParserConfiguration]()['parse-positional-numbers'] === undefined;
    if (parsePositionalNumbers) {
      argv = this[kParsePositionalNumbers](argv as Arguments);
    }
    if (runGlobalMiddleware) {
      argv = applyMiddleware(
        argv,
        this,
        this.#globalMiddleware.getMiddleware(),
        false
      );
    }
    return argv;
  }
  // put yargs back into an initial state; this is used mainly for running
  // commands in a breadth first manner:
  [kReset](aliases: Aliases = {}): YargsInstance {
    this.#options = this.#options || ({} as Options);
    const tmpOptions = {} as Options;
    tmpOptions.local = this.#options.local || [];
    tmpOptions.configObjects = this.#options.configObjects || [];

    // if a key has been explicitly set as local,
    // we should reset it before passing options to command.
    const localLookup: Dictionary<boolean> = {};
    tmpOptions.local.forEach(l => {
      localLookup[l] = true;
      (aliases[l] || []).forEach(a => {
        localLookup[a] = true;
      });
    });

    // add all groups not set to local to preserved groups
    Object.assign(
      this.#preservedGroups,
      Object.keys(this.#groups).reduce((acc, groupName) => {
        const keys = this.#groups[groupName].filter(
          key => !(key in localLookup)
        );
        if (keys.length > 0) {
          acc[groupName] = keys;
        }
        return acc;
      }, {} as Dictionary<string[]>)
    );
    // groups can now be reset
    this.#groups = {};

    const arrayOptions: KeyOf<Options, string[]>[] = [
      'array',
      'boolean',
      'string',
      'skipValidation',
      'count',
      'normalize',
      'number',
      'hiddenOptions',
    ];

    const objectOptions: DictionaryKeyof<Options>[] = [
      'narg',
      'key',
      'alias',
      'default',
      'defaultDescription',
      'config',
      'choices',
      'demandedOptions',
      'demandedCommands',
      'deprecatedOptions',
    ];

    arrayOptions.forEach(k => {
      tmpOptions[k] = (this.#options[k] || []).filter(
        (k: string) => !localLookup[k]
      );
    });

    objectOptions.forEach(<K extends DictionaryKeyof<Options>>(k: K) => {
      tmpOptions[k] = objFilter(
        this.#options[k],
        k => !localLookup[k as string]
      );
    });

    tmpOptions.envPrefix = this.#options.envPrefix;
    this.#options = tmpOptions;

    // if this is the first time being executed, create
    // instances of all our helpers -- otherwise just reset.
    this.#usage = this.#usage
      ? this.#usage.reset(localLookup)
      : Usage(this, this.#shim);
    this.#validation = this.#validation
      ? this.#validation.reset(localLookup)
      : Validation(this, this.#usage, this.#shim);
    this.#command = this.#command
      ? this.#command.reset()
      : Command(
          this.#usage,
          this.#validation,
          this.#globalMiddleware,
          this.#shim
        );
    if (!this.#completion)
      this.#completion = Completion(
        this,
        this.#usage,
        this.#command,
        this.#shim
      );
    this.#globalMiddleware.reset();

    this.#completionCommand = null;
    this.#output = '';
    this.#exitError = null;
    this.#hasOutput = false;
    this.parsed = false;

    return this;
  }
  [kRebase](base: string, dir: string): string {
    return this.#shim.path.relative(base, dir);
  }
  [kRunYargsParserAndExecuteCommands](
    args: string | string[] | null,
    shortCircuit?: boolean | null,
    calledFromCommand?: boolean,
    commandIndex = 0,
    helpOnly = false
  ): Arguments | Promise<Arguments> {
    let skipValidation = !!calledFromCommand || helpOnly;
    args = args || this.#processArgs;

    this.#options.__ = this.#shim.y18n.__;
    this.#options.configuration = this[kGetParserConfiguration]();

    const populateDoubleDash = !!this.#options.configuration['populate--'];
    const config = Object.assign({}, this.#options.configuration, {
      'populate--': true,
    });
    const parsed = this.#shim.Parser.detailed(
      args,
      Object.assign({}, this.#options, {
        configuration: {'parse-positional-numbers': false, ...config},
      })
    ) as DetailedArguments;

    const argv: Arguments = Object.assign(
      parsed.argv,
      this.#parseContext
    ) as Arguments;
    let argvPromise: Arguments | Promise<Arguments> | undefined = undefined;
    const aliases = parsed.aliases;

    let helpOptSet = false;
    let versionOptSet = false;
    Object.keys(argv).forEach(key => {
      if (key === this.#helpOpt && argv[key]) {
        helpOptSet = true;
      } else if (key === this.#versionOpt && argv[key]) {
        versionOptSet = true;
      }
    });

    argv.$0 = this.$0;
    this.parsed = parsed;

    // A single yargs instance may be used multiple times, e.g.
    // const y = yargs(); y.parse('foo --bar'); yargs.parse('bar --foo').
    // When a prior parse has completed and a new parse is beginning, we
    // need to clear the cached help message from the previous parse:
    if (commandIndex === 0) {
      this.#usage.clearCachedHelpMessage();
    }

    try {
      this[kGuessLocale](); // guess locale lazily, so that it can be turned off in chain.

      // while building up the argv object, there
      // are two passes through the parser. If completion
      // is being performed short-circuit on the first pass.
      if (shortCircuit) {
        return this[kPostProcess](
          argv,
          populateDoubleDash,
          !!calledFromCommand,
          false // Don't run middleware when figuring out completion.
        );
      }

      // if there's a handler associated with a
      // command defer processing to it.
      if (this.#helpOpt) {
        // consider any multi-char helpOpt alias as a valid help command
        // unless all helpOpt aliases are single-char
        // note that parsed.aliases is a normalized bidirectional map :)
        const helpCmds = [this.#helpOpt]
          .concat(aliases[this.#helpOpt] || [])
          .filter(k => k.length > 1);
        // check if help should trigger and strip it from _.
        if (helpCmds.includes('' + argv._[argv._.length - 1])) {
          argv._.pop();
          helpOptSet = true;
        }
      }

      const handlerKeys = this.#command.getCommands();
      const requestCompletions = this.#completion!.completionKey in argv;
      const skipRecommendation = helpOptSet || requestCompletions || helpOnly;
      if (argv._.length) {
        if (handlerKeys.length) {
          let firstUnknownCommand;
          for (let i = commandIndex || 0, cmd; argv._[i] !== undefined; i++) {
            cmd = String(argv._[i]);
            if (handlerKeys.includes(cmd) && cmd !== this.#completionCommand) {
              // commands are executed using a recursive algorithm that executes
              // the deepest command first; we keep track of the position in the
              // argv._ array that is currently being executed.
              const innerArgv = this.#command.runCommand(
                cmd,
                this,
                parsed,
                i + 1,
                // Don't run a handler, just figure out the help string:
                helpOnly,
                // Passed to builder so that expensive commands can be deferred:
                helpOptSet || versionOptSet || helpOnly
              );
              return this[kPostProcess](
                innerArgv,
                populateDoubleDash,
                !!calledFromCommand,
                false
              );
            } else if (
              !firstUnknownCommand &&
              cmd !== this.#completionCommand
            ) {
              firstUnknownCommand = cmd;
              break;
            }
          }
          // recommend a command if recommendCommands() has
          // been enabled, and no commands were found to execute
          if (
            !this.#command.hasDefaultCommand() &&
            this.#recommendCommands &&
            firstUnknownCommand &&
            !skipRecommendation
          ) {
            this.#validation.recommendCommands(
              firstUnknownCommand,
              handlerKeys
            );
          }
        }

        // generate a completion script for adding to ~/.bashrc.
        if (
          this.#completionCommand &&
          argv._.includes(this.#completionCommand) &&
          !requestCompletions
        ) {
          if (this.#exitProcess) setBlocking(true);
          this.showCompletionScript();
          this.exit(0);
        }
      }

      if (this.#command.hasDefaultCommand() && !skipRecommendation) {
        const innerArgv = this.#command.runCommand(
          null,
          this,
          parsed,
          0,
          helpOnly,
          helpOptSet || versionOptSet || helpOnly
        );
        return this[kPostProcess](
          innerArgv,
          populateDoubleDash,
          !!calledFromCommand,
          false
        );
      }

      // we must run completions first, a user might
      // want to complete the --help or --version option.
      if (requestCompletions) {
        if (this.#exitProcess) setBlocking(true);

        // we allow for asynchronous completions,
        // e.g., loading in a list of commands from an API.
        args = ([] as string[]).concat(args);
        const completionArgs = args.slice(
          args.indexOf(`--${this.#completion!.completionKey}`) + 1
        );
        this.#completion!.getCompletion(completionArgs, (err, completions) => {
          if (err) throw new YError(err.message);
          (completions || []).forEach(completion => {
            this.#logger.log(completion);
          });
          this.exit(0);
        });
        return this[kPostProcess](
          argv,
          !populateDoubleDash,
          !!calledFromCommand,
          false // Don't run middleware when figuring out completion.
        );
      }

      // Handle 'help' and 'version' options
      // if we haven't already output help!
      if (!this.#hasOutput) {
        if (helpOptSet) {
          if (this.#exitProcess) setBlocking(true);
          skipValidation = true;
          this.showHelp('log');
          this.exit(0);
        } else if (versionOptSet) {
          if (this.#exitProcess) setBlocking(true);
          skipValidation = true;
          this.#usage.showVersion('log');
          this.exit(0);
        }
      }

      // Check if any of the options to skip validation were provided
      if (!skipValidation && this.#options.skipValidation.length > 0) {
        skipValidation = Object.keys(argv).some(
          key =>
            this.#options.skipValidation.indexOf(key) >= 0 && argv[key] === true
        );
      }

      // If the help or version options were used and exitProcess is false,
      // or if explicitly skipped, we won't run validations.
      if (!skipValidation) {
        if (parsed.error) throw new YError(parsed.error.message);

        // if we're executed via bash completion, don't
        // bother with validation.
        if (!requestCompletions) {
          const validation = this[kRunValidation](aliases, {}, parsed.error);
          if (!calledFromCommand) {
            argvPromise = applyMiddleware(
              argv,
              this,
              this.#globalMiddleware.getMiddleware(),
              true
            );
          }
          argvPromise = this[kValidateAsync](validation, argvPromise ?? argv);
          if (isPromise(argvPromise) && !calledFromCommand) {
            argvPromise = argvPromise.then(() => {
              return applyMiddleware(
                argv,
                this,
                this.#globalMiddleware.getMiddleware(),
                false
              );
            });
          }
        }
      }
    } catch (err) {
      if (err instanceof YError) this.#usage.fail(err.message, err);
      else throw err;
    }

    return this[kPostProcess](
      argvPromise ?? argv,
      populateDoubleDash,
      !!calledFromCommand,
      true
    );
  }
  [kRunValidation](
    aliases: Dictionary<string[]>,
    positionalMap: Dictionary<string[]>,
    parseErrors: Error | null,
    isDefaultCommand?: boolean
  ): (argv: Arguments) => void {
    const demandedOptions = {...this.getDemandedOptions()};
    return (argv: Arguments) => {
      if (parseErrors) throw new YError(parseErrors.message);
      this.#validation.nonOptionCount(argv);
      this.#validation.requiredArguments(argv, demandedOptions);
      let failedStrictCommands = false;
      if (this.#strictCommands) {
        failedStrictCommands = this.#validation.unknownCommands(argv);
      }
      if (this.#strict && !failedStrictCommands) {
        this.#validation.unknownArguments(
          argv,
          aliases,
          positionalMap,
          !!isDefaultCommand
        );
      } else if (this.#strictOptions) {
        this.#validation.unknownArguments(argv, aliases, {}, false, false);
      }
      this.#validation.limitedChoices(argv);
      this.#validation.implications(argv);
      this.#validation.conflicting(argv);
    };
  }
  [kSetHasOutput]() {
    this.#hasOutput = true;
  }
}

export function isYargsInstance(y: YargsInstance | void): y is YargsInstance {
  return !!y && typeof y.getInternalMethods === 'function';
}

/** Yargs' context. */
export interface Context {
  commands: string[];
  fullCommands: string[];
}

interface LoggerInstance {
  error: Function;
  log: Function;
}

export interface Options extends ParserOptions {
  __: (format: any, ...param: any[]) => string;
  alias: Dictionary<string[]>;
  array: string[];
  boolean: string[];
  choices: Dictionary<string[]>;
  config: Dictionary<ConfigCallback | boolean>;
  configObjects: Dictionary[];
  configuration: Configuration;
  count: string[];
  defaultDescription: Dictionary<string | undefined>;
  demandedCommands: Dictionary<{
    min: number;
    max: number;
    minMsg?: string | null;
    maxMsg?: string | null;
  }>;
  demandedOptions: Dictionary<string | undefined>;
  deprecatedOptions: Dictionary<string | boolean | undefined>;
  hiddenOptions: string[];
  /** Manually set keys */
  key: Dictionary<boolean | string>;
  local: string[];
  normalize: string[];
  number: string[];
  showHiddenOpt: string;
  skipValidation: string[];
  string: string[];
}

export interface Configuration extends Partial<ParserConfiguration> {
  /** Should a config object be deep-merged with the object config it extends? */
  'deep-merge-config'?: boolean;
  /** Should commands be sorted in help? */
  'sort-commands'?: boolean;
}

export interface OptionDefinition {
  alias?: string | string[];
  array?: boolean;
  boolean?: boolean;
  choices?: string | string[];
  coerce?: CoerceCallback;
  config?: boolean;
  configParser?: ConfigCallback;
  conflicts?: string | string[];
  count?: boolean;
  default?: any;
  defaultDescription?: string;
  deprecate?: string | boolean;
  deprecated?: OptionDefinition['deprecate'];
  desc?: string;
  describe?: OptionDefinition['desc'];
  description?: OptionDefinition['desc'];
  demand?: string | true;
  demandOption?: OptionDefinition['demand'];
  global?: boolean;
  group?: string;
  hidden?: boolean;
  implies?: string | number | KeyOrPos[];
  nargs?: number;
  normalize?: boolean;
  number?: boolean;
  require?: OptionDefinition['demand'];
  required?: OptionDefinition['demand'];
  requiresArg?: boolean;
  skipValidation?: boolean;
  string?: boolean;
  type?: 'array' | 'boolean' | 'count' | 'number' | 'string';
}

interface PositionalDefinition
  extends Pick<
    OptionDefinition,
    | 'alias'
    | 'array'
    | 'coerce'
    | 'choices'
    | 'conflicts'
    | 'default'
    | 'defaultDescription'
    | 'demand'
    | 'desc'
    | 'describe'
    | 'description'
    | 'implies'
    | 'normalize'
  > {
  type?: 'boolean' | 'number' | 'string';
}

interface FrozenYargsInstance {
  options: Options;
  configObjects: Dictionary[];
  exitProcess: boolean;
  groups: Dictionary<string[]>;
  strict: boolean;
  strictCommands: boolean;
  strictOptions: boolean;
  completionCommand: string | null;
  output: string;
  exitError: YError | string | undefined | null;
  hasOutput: boolean;
  parsed: DetailedArguments | false;
  parseFn: ParseCallback | null;
  parseContext: object | null;
}

interface ParseCallback {
  (
    err: YError | string | undefined | null,
    argv: Arguments,
    output: string
  ): void;
}

interface Aliases {
  [key: string]: Array<string>;
}

export interface Arguments {
  /** The script name or node command */
  $0: string;
  /** Non-option arguments */
  _: ArgsOutput;
  /** Arguments after the end-of-options flag `--` */
  '--'?: ArgsOutput;
  /** All remaining options */
  [argName: string]: any;
}

export interface DetailedArguments extends ParserDetailedArguments {
  argv: Arguments;
  aliases: Dictionary<string[]>;
}
