import {
  Dictionary,
  assertNotStrictEqual,
  RequireDirectoryOptions,
  PlatformShim,
} from './typings/common-types.js';
import {isPromise} from './utils/is-promise.js';
import {
  applyMiddleware,
  commandMiddlewareFactory,
  GlobalMiddleware,
  Middleware,
} from './middleware.js';
import {parseCommand, Positional} from './parse-command.js';
import {UsageInstance} from './usage.js';
import {ValidationInstance} from './validation.js';
import {
  YargsInstance,
  isYargsInstance,
  Options,
  OptionDefinition,
  Context,
  Configuration,
  Arguments,
  DetailedArguments,
} from './yargs-factory.js';
import {maybeAsyncResult} from './utils/maybe-async-result.js';
import whichModule from './utils/which-module.js';

const DEFAULT_MARKER = /(^\*)|(^\$0)/;
export type DefinitionOrCommandName = string | CommandHandlerDefinition;

export class CommandInstance {
  shim: PlatformShim;
  requireCache: Set<string> = new Set();
  handlers: Dictionary<CommandHandler> = {};
  aliasMap: Dictionary<string> = {};
  defaultCommand?: CommandHandler;
  usage: UsageInstance;
  globalMiddleware: GlobalMiddleware;
  validation: ValidationInstance;
  // Used to cache state from prior invocations of commands.
  // This allows the parser to push and pop state when running
  // a nested command:
  frozens: FrozenCommandInstance[] = [];
  constructor(
    usage: UsageInstance,
    validation: ValidationInstance,
    globalMiddleware: GlobalMiddleware,
    shim: PlatformShim
  ) {
    this.shim = shim;
    this.usage = usage;
    this.globalMiddleware = globalMiddleware;
    this.validation = validation;
  }
  addDirectory(
    dir: string,
    req: Function,
    callerFile: string,
    opts?: RequireDirectoryOptions
  ): void {
    opts = opts || {};

    // disable recursion to support nested directories of subcommands
    if (typeof opts.recurse !== 'boolean') opts.recurse = false;
    // exclude 'json', 'coffee' from require-directory defaults
    if (!Array.isArray(opts.extensions)) opts.extensions = ['js'];
    // allow consumer to define their own visitor function
    const parentVisit =
      typeof opts.visit === 'function' ? opts.visit : (o: any) => o;
    // call addHandler via visitor function
    opts.visit = (obj, joined, filename) => {
      const visited = parentVisit(obj, joined, filename);
      // allow consumer to skip modules with their own visitor
      if (visited) {
        // check for cyclic reference:
        if (this.requireCache.has(joined)) return visited;
        else this.requireCache.add(joined);
        this.addHandler(visited);
      }
      return visited;
    };
    this.shim.requireDirectory({require: req, filename: callerFile}, dir, opts);
  }
  addHandler(
    cmd: string | CommandHandlerDefinition | DefinitionOrCommandName[],
    description?: CommandHandler['description'],
    builder?: CommandBuilderDefinition | CommandBuilder,
    handler?: CommandHandlerCallback,
    commandMiddleware?: Middleware[],
    deprecated?: boolean
  ): void {
    let aliases: string[] = [];
    const middlewares = commandMiddlewareFactory(commandMiddleware);
    handler = handler || (() => {});

    // If an array is provided that is all CommandHandlerDefinitions, add
    // each handler individually:
    if (Array.isArray(cmd)) {
      if (isCommandAndAliases(cmd)) {
        [cmd, ...aliases] = cmd;
      } else {
        for (const command of cmd) {
          this.addHandler(command);
        }
      }
    } else if (isCommandHandlerDefinition(cmd)) {
      let command =
        Array.isArray(cmd.command) || typeof cmd.command === 'string'
          ? cmd.command
          : this.moduleName(cmd);
      if (cmd.aliases)
        command = ([] as string[]).concat(command).concat(cmd.aliases);
      this.addHandler(
        command,
        this.extractDesc(cmd),
        cmd.builder,
        cmd.handler,
        cmd.middlewares,
        cmd.deprecated
      );
      return;
    } else if (isCommandBuilderDefinition(builder)) {
      // Allow a module to be provided as builder, rather than function:
      this.addHandler(
        [cmd].concat(aliases),
        description,
        builder.builder,
        builder.handler,
        builder.middlewares,
        builder.deprecated
      );
      return;
    }

    // The 'cmd' provided was a string, we apply the command DSL:
    // https://github.com/yargs/yargs/blob/master/docs/advanced.md#advanced-topics
    if (typeof cmd === 'string') {
      // parse positionals out of cmd string
      const parsedCommand = parseCommand(cmd);

      // remove positional args from aliases only
      aliases = aliases.map(alias => parseCommand(alias).cmd);

      // check for default and filter out '*'
      let isDefault = false;
      const parsedAliases = [parsedCommand.cmd].concat(aliases).filter(c => {
        if (DEFAULT_MARKER.test(c)) {
          isDefault = true;
          return false;
        }
        return true;
      });

      // standardize on $0 for default command.
      if (parsedAliases.length === 0 && isDefault) parsedAliases.push('$0');

      // shift cmd and aliases after filtering out '*'
      if (isDefault) {
        parsedCommand.cmd = parsedAliases[0];
        aliases = parsedAliases.slice(1);
        cmd = cmd.replace(DEFAULT_MARKER, parsedCommand.cmd);
      }

      // populate aliasMap
      aliases.forEach(alias => {
        this.aliasMap[alias] = parsedCommand.cmd;
      });

      if (description !== false) {
        this.usage.command(cmd, description, isDefault, aliases, deprecated);
      }

      this.handlers[parsedCommand.cmd] = {
        original: cmd,
        description,
        handler,
        builder: (builder as CommandBuilder) || {},
        middlewares,
        deprecated,
        demanded: parsedCommand.demanded,
        optional: parsedCommand.optional,
      };

      if (isDefault) this.defaultCommand = this.handlers[parsedCommand.cmd];
    }
  }
  getCommandHandlers(): Dictionary<CommandHandler> {
    return this.handlers;
  }
  getCommands(): string[] {
    return Object.keys(this.handlers).concat(Object.keys(this.aliasMap));
  }
  hasDefaultCommand(): boolean {
    return !!this.defaultCommand;
  }
  runCommand(
    command: string | null,
    yargs: YargsInstance,
    parsed: DetailedArguments,
    commandIndex: number,
    helpOnly: boolean,
    helpOrVersionSet: boolean
  ): Arguments | Promise<Arguments> {
    const commandHandler =
      this.handlers[command!] ||
      this.handlers[this.aliasMap[command!]] ||
      this.defaultCommand;
    const currentContext = yargs.getInternalMethods().getContext();
    const parentCommands = currentContext.commands.slice();
    const isDefaultCommand = !command;
    if (command) {
      currentContext.commands.push(command);
      currentContext.fullCommands.push(commandHandler.original);
    }
    const builderResult = this.applyBuilderUpdateUsageAndParse(
      isDefaultCommand,
      commandHandler,
      yargs,
      parsed.aliases,
      parentCommands,
      commandIndex,
      helpOnly,
      helpOrVersionSet
    );
    return isPromise(builderResult)
      ? builderResult.then(result =>
          this.applyMiddlewareAndGetResult(
            isDefaultCommand,
            commandHandler,
            result.innerArgv,
            currentContext,
            helpOnly,
            result.aliases,
            yargs
          )
        )
      : this.applyMiddlewareAndGetResult(
          isDefaultCommand,
          commandHandler,
          builderResult.innerArgv,
          currentContext,
          helpOnly,
          builderResult.aliases,
          yargs
        );
  }
  private applyBuilderUpdateUsageAndParse(
    isDefaultCommand: boolean,
    commandHandler: CommandHandler,
    yargs: YargsInstance,
    aliases: Dictionary<string[]>,
    parentCommands: string[],
    commandIndex: number,
    helpOnly: boolean,
    helpOrVersionSet: boolean
  ):
    | {aliases: Dictionary<string[]>; innerArgv: Arguments}
    | Promise<{aliases: Dictionary<string[]>; innerArgv: Arguments}> {
    const builder = commandHandler.builder;
    let innerYargs: YargsInstance = yargs;
    if (isCommandBuilderCallback(builder)) {
      // A function can be provided, which builds
      // up a yargs chain and possibly returns it.
      const builderOutput = builder(
        yargs.getInternalMethods().reset(aliases),
        helpOrVersionSet
      );
      // Support the use-case of async builders:
      if (isPromise(builderOutput)) {
        return builderOutput.then(output => {
          innerYargs = isYargsInstance(output) ? output : yargs;
          return this.parseAndUpdateUsage(
            isDefaultCommand,
            commandHandler,
            innerYargs,
            parentCommands,
            commandIndex,
            helpOnly
          );
        });
      }
    } else if (isCommandBuilderOptionDefinitions(builder)) {
      // as a short hand, an object can instead be provided, specifying
      // the options that a command takes.
      innerYargs = yargs.getInternalMethods().reset(aliases);
      Object.keys(commandHandler.builder).forEach(key => {
        innerYargs.option(key, builder[key]);
      });
    }
    return this.parseAndUpdateUsage(
      isDefaultCommand,
      commandHandler,
      innerYargs,
      parentCommands,
      commandIndex,
      helpOnly
    );
  }
  private parseAndUpdateUsage(
    isDefaultCommand: boolean,
    commandHandler: CommandHandler,
    innerYargs: YargsInstance,
    parentCommands: string[],
    commandIndex: number,
    helpOnly: boolean
  ):
    | {aliases: Dictionary<string[]>; innerArgv: Arguments}
    | Promise<{aliases: Dictionary<string[]>; innerArgv: Arguments}> {
    // A null command indicates we are running the default command,
    // if this is the case, we should show the root usage instructions
    // rather than the usage instructions for the nested default command:
    if (isDefaultCommand)
      innerYargs.getInternalMethods().getUsageInstance().unfreeze();
    if (this.shouldUpdateUsage(innerYargs)) {
      innerYargs
        .getInternalMethods()
        .getUsageInstance()
        .usage(
          this.usageFromParentCommandsCommandHandler(
            parentCommands,
            commandHandler
          ),
          commandHandler.description
        );
    }
    const innerArgv = innerYargs
      .getInternalMethods()
      .runYargsParserAndExecuteCommands(
        null,
        undefined,
        true,
        commandIndex,
        helpOnly
      );

    return isPromise(innerArgv)
      ? innerArgv.then(argv => ({
          aliases: (innerYargs.parsed as DetailedArguments).aliases,
          innerArgv: argv,
        }))
      : {
          aliases: (innerYargs.parsed as DetailedArguments).aliases,
          innerArgv: innerArgv,
        };
  }
  private shouldUpdateUsage(yargs: YargsInstance) {
    return (
      !yargs.getInternalMethods().getUsageInstance().getUsageDisabled() &&
      yargs.getInternalMethods().getUsageInstance().getUsage().length === 0
    );
  }
  private usageFromParentCommandsCommandHandler(
    parentCommands: string[],
    commandHandler: CommandHandler
  ) {
    const c = DEFAULT_MARKER.test(commandHandler.original)
      ? commandHandler.original.replace(DEFAULT_MARKER, '').trim()
      : commandHandler.original;
    const pc = parentCommands.filter(c => {
      return !DEFAULT_MARKER.test(c);
    });
    pc.push(c);
    return `$0 ${pc.join(' ')}`;
  }
  private applyMiddlewareAndGetResult(
    isDefaultCommand: boolean,
    commandHandler: CommandHandler,
    innerArgv: Arguments | Promise<Arguments>,
    currentContext: Context,
    helpOnly: boolean,
    aliases: Dictionary<string[]>,
    yargs: YargsInstance
  ): Arguments | Promise<Arguments> {
    let positionalMap: Dictionary<string[]> = {};
    // If showHelp() or getHelp() is being run, we should not
    // execute middleware or handlers (these may perform expensive operations
    // like creating a DB connection).
    if (helpOnly) return innerArgv;
    if (!yargs.getInternalMethods().getHasOutput()) {
      positionalMap = this.populatePositionals(
        commandHandler,
        innerArgv as Arguments,
        currentContext,
        yargs
      );
    }
    const middlewares = this.globalMiddleware
      .getMiddleware()
      .slice(0)
      .concat(commandHandler.middlewares);
    innerArgv = applyMiddleware(innerArgv, yargs, middlewares, true);

    // we apply validation post-hoc, so that custom
    // checks get passed populated positional arguments.
    if (!yargs.getInternalMethods().getHasOutput()) {
      const validation = yargs
        .getInternalMethods()
        .runValidation(
          aliases,
          positionalMap,
          (yargs.parsed as DetailedArguments).error,
          isDefaultCommand
        );
      innerArgv = maybeAsyncResult<Arguments>(innerArgv, result => {
        validation(result);
        return result;
      });
    }

    if (commandHandler.handler && !yargs.getInternalMethods().getHasOutput()) {
      yargs.getInternalMethods().setHasOutput();
      // to simplify the parsing of positionals in commands,
      // we temporarily populate '--' rather than _, with arguments
      const populateDoubleDash =
        !!yargs.getOptions().configuration['populate--'];
      yargs
        .getInternalMethods()
        .postProcess(innerArgv, populateDoubleDash, false, false);

      innerArgv = applyMiddleware(innerArgv, yargs, middlewares, false);
      innerArgv = maybeAsyncResult<Arguments>(innerArgv, result => {
        const handlerResult = commandHandler.handler(result as Arguments);
        return isPromise(handlerResult)
          ? handlerResult.then(() => result)
          : result;
      });

      if (!isDefaultCommand) {
        yargs.getInternalMethods().getUsageInstance().cacheHelpMessage();
      }

      if (
        isPromise(innerArgv) &&
        !yargs.getInternalMethods().hasParseCallback()
      ) {
        innerArgv.catch(error => {
          try {
            yargs.getInternalMethods().getUsageInstance().fail(null, error);
          } catch (_err) {
            // If .fail(false) is not set, and no parse cb() has been
            // registered, run usage's default fail method.
          }
        });
      }
    }

    if (!isDefaultCommand) {
      currentContext.commands.pop();
      currentContext.fullCommands.pop();
    }

    return innerArgv;
  }
  // transcribe all positional arguments "command <foo> <bar> [apple]"
  // onto argv.
  private populatePositionals(
    commandHandler: CommandHandler,
    argv: Arguments,
    context: Context,
    yargs: YargsInstance
  ) {
    argv._ = argv._.slice(context.commands.length); // nuke the current commands
    const demanded = commandHandler.demanded.slice(0);
    const optional = commandHandler.optional.slice(0);
    const positionalMap: Dictionary<string[]> = {};

    this.validation.positionalCount(demanded.length, argv._.length);

    while (demanded.length) {
      const demand = demanded.shift()!;
      this.populatePositional(demand, argv, positionalMap);
    }

    while (optional.length) {
      const maybe = optional.shift()!;
      this.populatePositional(maybe, argv, positionalMap);
    }

    argv._ = context.commands.concat(argv._.map(a => '' + a));

    this.postProcessPositionals(
      argv,
      positionalMap,
      this.cmdToParseOptions(commandHandler.original),
      yargs
    );

    return positionalMap;
  }

  private populatePositional(
    positional: Positional,
    argv: Arguments,
    positionalMap: Dictionary<string[]>
  ) {
    const cmd = positional.cmd[0];
    if (positional.variadic) {
      positionalMap[cmd] = argv._.splice(0).map(String);
    } else {
      if (argv._.length) positionalMap[cmd] = [String(argv._.shift())];
    }
  }

  // Based on parsing variadic markers '...', demand syntax '<foo>', etc.,
  // populate parser hints:
  public cmdToParseOptions(cmdString: string): Positionals {
    const parseOptions: Positionals = {
      array: [],
      default: {},
      alias: {},
      demand: {},
    };

    const parsed = parseCommand(cmdString);
    parsed.demanded.forEach(d => {
      const [cmd, ...aliases] = d.cmd;
      if (d.variadic) {
        parseOptions.array.push(cmd);
        parseOptions.default[cmd] = [];
      }
      parseOptions.alias[cmd] = aliases;
      parseOptions.demand[cmd] = true;
    });

    parsed.optional.forEach(o => {
      const [cmd, ...aliases] = o.cmd;
      if (o.variadic) {
        parseOptions.array.push(cmd);
        parseOptions.default[cmd] = [];
      }
      parseOptions.alias[cmd] = aliases;
    });

    return parseOptions;
  }

  // we run yargs-parser against the positional arguments
  // applying the same parsing logic used for flags.
  private postProcessPositionals(
    argv: Arguments,
    positionalMap: Dictionary<string[]>,
    parseOptions: Positionals,
    yargs: YargsInstance
  ) {
    // combine the parsing hints we've inferred from the command
    // string with explicitly configured parsing hints.
    const options = Object.assign({}, yargs.getOptions());
    options.default = Object.assign(parseOptions.default, options.default);
    for (const key of Object.keys(parseOptions.alias)) {
      options.alias[key] = (options.alias[key] || []).concat(
        parseOptions.alias[key]
      );
    }
    options.array = options.array.concat(parseOptions.array);
    options.config = {}; //  don't load config when processing positionals.

    const unparsed: string[] = [];
    Object.keys(positionalMap).forEach(key => {
      positionalMap[key].map(value => {
        if (options.configuration['unknown-options-as-args'])
          options.key[key] = true;
        unparsed.push(`--${key}`);
        unparsed.push(value);
      });
    });

    // short-circuit parse.
    if (!unparsed.length) return;

    const config: Configuration = Object.assign({}, options.configuration, {
      'populate--': false,
    });

    const parsed = this.shim.Parser.detailed(
      unparsed,
      Object.assign({}, options, {
        configuration: config,
      })
    );

    if (parsed.error) {
      yargs
        .getInternalMethods()
        .getUsageInstance()
        .fail(parsed.error.message, parsed.error);
    } else {
      // only copy over positional keys (don't overwrite
      // flag arguments that were already parsed).
      const positionalKeys = Object.keys(positionalMap);
      Object.keys(positionalMap).forEach(key => {
        positionalKeys.push(...parsed.aliases[key]);
      });

      Object.keys(parsed.argv).forEach(key => {
        if (positionalKeys.includes(key)) {
          // any new aliases need to be placed in positionalMap, which
          // is used for validation.
          if (!positionalMap[key]) positionalMap[key] = parsed.argv[key];
          argv[key] = parsed.argv[key];
        }
      });
    }
  }
  runDefaultBuilderOn(yargs: YargsInstance): unknown | Promise<unknown> {
    if (!this.defaultCommand) return;
    if (this.shouldUpdateUsage(yargs)) {
      // build the root-level command string from the default string.
      const commandString = DEFAULT_MARKER.test(this.defaultCommand.original)
        ? this.defaultCommand.original
        : this.defaultCommand.original.replace(/^[^[\]<>]*/, '$0 ');
      yargs
        .getInternalMethods()
        .getUsageInstance()
        .usage(commandString, this.defaultCommand.description);
    }
    const builder = this.defaultCommand.builder;
    if (isCommandBuilderCallback(builder)) {
      return builder(yargs, true);
    } else if (!isCommandBuilderDefinition(builder)) {
      Object.keys(builder).forEach(key => {
        yargs.option(key, builder[key]);
      });
    }
    return undefined;
  }
  // lookup module object from require()d command and derive name
  // if module was not require()d and no name given, throw error
  private moduleName(obj: CommandHandlerDefinition) {
    const mod = whichModule(obj);
    if (!mod)
      throw new Error(
        `No command name given for module: ${this.shim.inspect(obj)}`
      );
    return this.commandFromFilename(mod.filename);
  }

  private commandFromFilename(filename: string) {
    return this.shim.path.basename(filename, this.shim.path.extname(filename));
  }

  private extractDesc({describe, description, desc}: CommandHandlerDefinition) {
    for (const test of [describe, description, desc]) {
      if (typeof test === 'string' || test === false) return test;
      assertNotStrictEqual(test, true as const, this.shim);
    }
    return false;
  }
  // Push/pop the current command configuration:
  freeze() {
    this.frozens.push({
      handlers: this.handlers,
      aliasMap: this.aliasMap,
      defaultCommand: this.defaultCommand,
    });
  }
  unfreeze() {
    const frozen = this.frozens.pop();
    assertNotStrictEqual(frozen, undefined, this.shim);
    ({
      handlers: this.handlers,
      aliasMap: this.aliasMap,
      defaultCommand: this.defaultCommand,
    } = frozen);
  }
  // Revert to initial state:
  reset(): CommandInstance {
    this.handlers = {};
    this.aliasMap = {};
    this.defaultCommand = undefined;
    this.requireCache = new Set();
    return this;
  }
}

// Adds support to yargs for lazy loading a hierarchy of commands:
export function command(
  usage: UsageInstance,
  validation: ValidationInstance,
  globalMiddleware: GlobalMiddleware,
  shim: PlatformShim
) {
  return new CommandInstance(usage, validation, globalMiddleware, shim);
}

export interface CommandHandlerDefinition
  extends Partial<
    Pick<
      CommandHandler,
      'deprecated' | 'description' | 'handler' | 'middlewares'
    >
  > {
  aliases?: string[];
  builder?: CommandBuilder | CommandBuilderDefinition;
  command?: string | string[];
  desc?: CommandHandler['description'];
  describe?: CommandHandler['description'];
}

export interface CommandBuilderDefinition {
  builder?: CommandBuilder;
  deprecated?: boolean;
  handler: CommandHandlerCallback;
  middlewares?: Middleware[];
}

export function isCommandBuilderDefinition(
  builder?: CommandBuilder | CommandBuilderDefinition
): builder is CommandBuilderDefinition {
  return (
    typeof builder === 'object' &&
    !!(builder as CommandBuilderDefinition).builder &&
    typeof (builder as CommandBuilderDefinition).handler === 'function'
  );
}

export interface CommandHandlerCallback {
  (argv: Arguments): any;
}

export interface CommandHandler {
  builder: CommandBuilder;
  demanded: Positional[];
  deprecated?: boolean;
  description?: string | false;
  handler: CommandHandlerCallback;
  middlewares: Middleware[];
  optional: Positional[];
  original: string;
}

// To be completed later with other CommandBuilder flavours
export type CommandBuilder =
  | CommandBuilderCallback
  | Dictionary<OptionDefinition>;

interface CommandBuilderCallback {
  (y: YargsInstance, helpOrVersionSet: boolean): YargsInstance | void;
}

function isCommandAndAliases(
  cmd: DefinitionOrCommandName[]
): cmd is [CommandHandlerDefinition, ...string[]] {
  return cmd.every(c => typeof c === 'string');
}

export function isCommandBuilderCallback(
  builder: CommandBuilder
): builder is CommandBuilderCallback {
  return typeof builder === 'function';
}

function isCommandBuilderOptionDefinitions(
  builder: CommandBuilder
): builder is Dictionary<OptionDefinition> {
  return typeof builder === 'object';
}

export function isCommandHandlerDefinition(
  cmd: DefinitionOrCommandName | [DefinitionOrCommandName, ...string[]]
): cmd is CommandHandlerDefinition {
  return typeof cmd === 'object' && !Array.isArray(cmd);
}

interface Positionals extends Pick<Options, 'alias' | 'array' | 'default'> {
  demand: Dictionary<boolean>;
}

type FrozenCommandInstance = {
  handlers: Dictionary<CommandHandler>;
  aliasMap: Dictionary<string>;
  defaultCommand: CommandHandler | undefined;
};
