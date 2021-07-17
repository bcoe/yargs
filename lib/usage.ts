// this file handles outputting usage instructions,
// failures, etc. keeps logging in one place.
import {Dictionary, PlatformShim} from './typings/common-types.js';
import {objFilter} from './utils/obj-filter.js';
import {YargsInstance} from './yargs-factory.js';
import {YError} from './yerror.js';
import {DetailedArguments} from './typings/yargs-parser-types.js';
import setBlocking from './utils/set-blocking.js';

function isBoolean(fail: FailureFunction | boolean): fail is boolean {
  return typeof fail === 'boolean';
}

export function usage(yargs: YargsInstance, shim: PlatformShim) {
  const __ = shim.y18n.__;
  const self = {} as UsageInstance;

  // methods for ouputting/building failure message.
  const fails: (FailureFunction | boolean)[] = [];
  self.failFn = function failFn(f) {
    fails.push(f);
  };
  let failMessage: string | undefined | null = null;
  let showHelpOnFail = true;
  self.showHelpOnFail = function showHelpOnFailFn(
    arg1: boolean | string = true,
    arg2?: string
  ) {
    function parseFunctionArgs(): [boolean, string?] {
      return typeof arg1 === 'string' ? [true, arg1] : [arg1, arg2];
    }
    const [enabled, message] = parseFunctionArgs();
    failMessage = message;
    showHelpOnFail = enabled;
    return self;
  };

  let failureOutput = false;
  self.fail = function fail(msg, err) {
    const logger = yargs.getInternalMethods().getLoggerInstance();

    if (fails.length) {
      for (let i = fails.length - 1; i >= 0; --i) {
        const fail = fails[i];
        if (isBoolean(fail)) {
          if (err) throw err;
          else if (msg) throw Error(msg);
        } else {
          fail(msg, err, self);
        }
      }
    } else {
      if (yargs.getExitProcess()) setBlocking(true);

      // don't output failure message more than once
      if (!failureOutput) {
        failureOutput = true;
        if (showHelpOnFail) {
          yargs.showHelp('error');
          logger.error();
        }
        if (msg || err) logger.error(msg || err);
        if (failMessage) {
          if (msg || err) logger.error('');
          logger.error(failMessage);
        }
      }

      err = err || new YError(msg);
      if (yargs.getExitProcess()) {
        return yargs.exit(1);
      } else if (yargs.getInternalMethods().hasParseCallback()) {
        return yargs.exit(1, err);
      } else {
        throw err;
      }
    }
  };

  // methods for ouputting/building help (usage) message.
  let usages: [string, string][] = [];
  let usageDisabled = false;
  self.usage = (msg, description) => {
    if (msg === null) {
      usageDisabled = true;
      usages = [];
      return self;
    }
    usageDisabled = false;
    usages.push([msg, description || '']);
    return self;
  };
  self.getUsage = () => {
    return usages;
  };
  self.getUsageDisabled = () => {
    return usageDisabled;
  };

  self.getPositionalGroupName = () => {
    return __('Positionals:');
  };

  let examples: [string, string][] = [];
  self.example = (cmd, description) => {
    examples.push([cmd, description || '']);
  };

  let commands: [string, string, boolean, string[], boolean][] = [];
  self.command = function command(
    cmd,
    description,
    isDefault,
    aliases,
    deprecated = false
  ) {
    // the last default wins, so cancel out any previously set default
    if (isDefault) {
      commands = commands.map(cmdArray => {
        cmdArray[2] = false;
        return cmdArray;
      });
    }
    commands.push([cmd, description || '', isDefault, aliases, deprecated]);
  };
  self.getCommands = () => commands;

  let descriptions: Dictionary<string | undefined> = {};
  self.describe = function describe(
    keyOrKeys: string | string[] | Dictionary<string>,
    desc?: string
  ) {
    if (Array.isArray(keyOrKeys)) {
      keyOrKeys.forEach(k => {
        self.describe(k, desc);
      });
    } else if (typeof keyOrKeys === 'object') {
      Object.keys(keyOrKeys).forEach(k => {
        self.describe(k, keyOrKeys[k]);
      });
    } else {
      descriptions[keyOrKeys] = desc;
    }
  };
  self.getDescriptions = () => descriptions;

  let epilogs: string[] = [];
  self.epilog = msg => {
    epilogs.push(msg);
  };

  let wrapSet = false;
  let wrap: number | null | undefined;
  self.wrap = cols => {
    wrapSet = true;
    wrap = cols;
  };

  function getWrap() {
    if (!wrapSet) {
      wrap = windowWidth();
      wrapSet = true;
    }

    return wrap;
  }

  const deferY18nLookupPrefix = '__yargsString__:';
  self.deferY18nLookup = str => deferY18nLookupPrefix + str;

  self.help = function help() {
    if (cachedHelpMessage) return cachedHelpMessage;
    normalizeAliases();

    // handle old demanded API
    const base$0 = yargs.customScriptName
      ? yargs.$0
      : shim.path.basename(yargs.$0);
    const demandedOptions = yargs.getDemandedOptions();
    const demandedCommands = yargs.getDemandedCommands();
    const deprecatedOptions = yargs.getDeprecatedOptions();
    const groups = yargs.getGroups();
    const options = yargs.getOptions();

    let keys: string[] = [];
    keys = keys.concat(Object.keys(descriptions));
    keys = keys.concat(Object.keys(demandedOptions));
    keys = keys.concat(Object.keys(demandedCommands));
    keys = keys.concat(Object.keys(options.default));
    keys = keys.filter(filterHiddenOptions);
    keys = Object.keys(
      keys.reduce((acc, key) => {
        if (key !== '_') acc[key] = true;
        return acc;
      }, {} as Dictionary<boolean>)
    );

    const theWrap = getWrap();
    const ui = shim.cliui({
      width: theWrap,
      wrap: !!theWrap,
    });

    // the usage string.
    if (!usageDisabled) {
      if (usages.length) {
        // user-defined usage.
        usages.forEach(usage => {
          ui.div({text: `${usage[0].replace(/\$0/g, base$0)}`});
          if (usage[1]) {
            ui.div({text: `${usage[1]}`, padding: [1, 0, 0, 0]});
          }
        });
        ui.div();
      } else if (commands.length) {
        let u = null;
        // demonstrate how commands are used.
        if (demandedCommands._) {
          u = `${base$0} <${__('command')}>\n`;
        } else {
          u = `${base$0} [${__('command')}]\n`;
        }
        ui.div(`${u}`);
      }
    }

    // your application's commands, i.e., non-option
    // arguments populated in '_'.
    //
    // If there's only a single command, and it's the default command
    // (represented by commands[0][2]) don't show command stanza:
    //
    // TODO(@bcoe): why isnt commands[0][2] an object with a named property?
    if (commands.length > 1 || (commands.length === 1 && !commands[0][2])) {
      ui.div(__('Commands:'));

      const context = yargs.getInternalMethods().getContext();
      const parentCommands = context.commands.length
        ? `${context.commands.join(' ')} `
        : '';

      if (
        yargs.getInternalMethods().getParserConfiguration()['sort-commands'] ===
        true
      ) {
        commands = commands.sort((a, b) => a[0].localeCompare(b[0]));
      }

      commands.forEach(command => {
        const commandString = `${base$0} ${parentCommands}${command[0].replace(
          /^\$0 ?/,
          ''
        )}`; // drop $0 from default commands.
        ui.span(
          {
            text: commandString,
            padding: [0, 2, 0, 2],
            width:
              maxWidth(commands, theWrap, `${base$0}${parentCommands}`) + 4,
          },
          {text: command[1]}
        );
        const hints = [];
        if (command[2]) hints.push(`[${__('default')}]`);
        if (command[3] && command[3].length) {
          hints.push(`[${__('aliases:')} ${command[3].join(', ')}]`);
        }
        if (command[4]) {
          if (typeof command[4] === 'string') {
            hints.push(`[${__('deprecated: %s', command[4])}]`);
          } else {
            hints.push(`[${__('deprecated')}]`);
          }
        }
        if (hints.length) {
          ui.div({
            text: hints.join(' '),
            padding: [0, 0, 0, 2],
            align: 'right',
          });
        } else {
          ui.div();
        }
      });

      ui.div();
    }

    // perform some cleanup on the keys array, making it
    // only include top-level keys not their aliases.
    const aliasKeys = (Object.keys(options.alias) || []).concat(
      Object.keys((yargs.parsed as DetailedArguments).newAliases) || []
    );

    keys = keys.filter(
      key =>
        !(yargs.parsed as DetailedArguments).newAliases[key] &&
        aliasKeys.every(
          alias => (options.alias[alias] || []).indexOf(key) === -1
        )
    );

    // populate 'Options:' group with any keys that have not
    // explicitly had a group set.
    const defaultGroup = __('Options:');
    if (!groups[defaultGroup]) groups[defaultGroup] = [];
    addUngroupedKeys(keys, options.alias, groups, defaultGroup);

    const isLongSwitch = (sw: string | IndentedText) => /^--/.test(getText(sw));

    // prepare 'Options:' tables display
    const displayedGroups = Object.keys(groups)
      .filter(groupName => groups[groupName].length > 0)
      .map(groupName => {
        // if we've grouped the key 'f', but 'f' aliases 'foobar',
        // normalizedKeys should contain only 'foobar'.
        const normalizedKeys: string[] = groups[groupName]
          .filter(filterHiddenOptions)
          .map(key => {
            if (aliasKeys.includes(key)) return key;
            for (
              let i = 0, aliasKey;
              (aliasKey = aliasKeys[i]) !== undefined;
              i++
            ) {
              if ((options.alias[aliasKey] || []).includes(key))
                return aliasKey;
            }
            return key;
          });

        return {groupName, normalizedKeys};
      })
      .filter(({normalizedKeys}) => normalizedKeys.length > 0)
      .map(({groupName, normalizedKeys}) => {
        // actually generate the switches string --foo, -f, --bar.
        const switches: Dictionary<string | IndentedText> =
          normalizedKeys.reduce((acc, key) => {
            acc[key] = [key]
              .concat(options.alias[key] || [])
              .map(sw => {
                // for the special positional group don't
                // add '--' or '-' prefix.
                if (groupName === self.getPositionalGroupName()) return sw;
                else {
                  return (
                    // matches yargs-parser logic in which single-digits
                    // aliases declared with a boolean type are now valid
                    (/^[0-9]$/.test(sw)
                      ? options.boolean.includes(key)
                        ? '-'
                        : '--'
                      : sw.length > 1
                      ? '--'
                      : '-') + sw
                  );
                }
              })
              // place short switches first (see #1403)
              .sort((sw1, sw2) =>
                isLongSwitch(sw1) === isLongSwitch(sw2)
                  ? 0
                  : isLongSwitch(sw1)
                  ? 1
                  : -1
              )
              .join(', ');

            return acc;
          }, {} as Dictionary<string>);

        return {groupName, normalizedKeys, switches};
      });

    // if some options use short switches, indent long-switches only options (see #1403)
    const shortSwitchesUsed = displayedGroups
      .filter(({groupName}) => groupName !== self.getPositionalGroupName())
      .some(
        ({normalizedKeys, switches}) =>
          !normalizedKeys.every(key => isLongSwitch(switches[key]))
      );

    if (shortSwitchesUsed) {
      displayedGroups
        .filter(({groupName}) => groupName !== self.getPositionalGroupName())
        .forEach(({normalizedKeys, switches}) => {
          normalizedKeys.forEach(key => {
            if (isLongSwitch(switches[key])) {
              switches[key] = addIndentation(switches[key], '-x, '.length);
            }
          });
        });
    }

    // display 'Options:' table along with any custom tables:
    displayedGroups.forEach(({groupName, normalizedKeys, switches}) => {
      ui.div(groupName);

      normalizedKeys.forEach(key => {
        const kswitch = switches[key];
        let desc = descriptions[key] || '';
        let type = null;

        if (desc.includes(deferY18nLookupPrefix))
          desc = __(desc.substring(deferY18nLookupPrefix.length));

        if (options.boolean.includes(key)) type = `[${__('boolean')}]`;
        if (options.count.includes(key)) type = `[${__('count')}]`;
        if (options.string.includes(key)) type = `[${__('string')}]`;
        if (options.normalize.includes(key)) type = `[${__('string')}]`;
        if (options.array.includes(key)) type = `[${__('array')}]`;
        if (options.number.includes(key)) type = `[${__('number')}]`;

        const deprecatedExtra = (deprecated?: string | boolean) =>
          typeof deprecated === 'string'
            ? `[${__('deprecated: %s', deprecated)}]`
            : `[${__('deprecated')}]`;

        const extra = [
          key in deprecatedOptions
            ? deprecatedExtra(deprecatedOptions[key])
            : null,
          type,
          key in demandedOptions ? `[${__('required')}]` : null,
          options.choices && options.choices[key]
            ? `[${__('choices:')} ${self.stringifiedValues(
                options.choices[key]
              )}]`
            : null,
          defaultString(options.default[key], options.defaultDescription[key]),
        ]
          .filter(Boolean)
          .join(' ');

        ui.span(
          {
            text: getText(kswitch),
            padding: [0, 2, 0, 2 + getIndentation(kswitch)],
            width: maxWidth(switches, theWrap) + 4,
          },
          desc
        );

        if (extra) ui.div({text: extra, padding: [0, 0, 0, 2], align: 'right'});
        else ui.div();
      });

      ui.div();
    });

    // describe some common use-cases for your application.
    if (examples.length) {
      ui.div(__('Examples:'));

      examples.forEach(example => {
        example[0] = example[0].replace(/\$0/g, base$0);
      });

      examples.forEach(example => {
        if (example[1] === '') {
          ui.div({
            text: example[0],
            padding: [0, 2, 0, 2],
          });
        } else {
          ui.div(
            {
              text: example[0],
              padding: [0, 2, 0, 2],
              width: maxWidth(examples, theWrap) + 4,
            },
            {
              text: example[1],
            }
          );
        }
      });

      ui.div();
    }

    // the usage string.
    if (epilogs.length > 0) {
      const e = epilogs
        .map(epilog => epilog.replace(/\$0/g, base$0))
        .join('\n');
      ui.div(`${e}\n`);
    }

    // Remove the trailing white spaces
    return ui.toString().replace(/\s*$/, '');
  };

  // return the maximum width of a string
  // in the left-hand column of a table.
  function maxWidth(
    table:
      | [string | IndentedText, ...any[]][]
      | Dictionary<string | IndentedText>,
    theWrap?: number | null,
    modifier?: string
  ) {
    let width = 0;

    // table might be of the form [leftColumn],
    // or {key: leftColumn}
    if (!Array.isArray(table)) {
      table = Object.values(table).map<[string | IndentedText]>(v => [v]);
    }

    table.forEach(v => {
      // column might be of the form "text"
      // or { text: "text", indent: 4 }
      width = Math.max(
        shim.stringWidth(
          modifier ? `${modifier} ${getText(v[0])}` : getText(v[0])
        ) + getIndentation(v[0]),
        width
      );
    });

    // if we've enabled 'wrap' we should limit
    // the max-width of the left-column.
    if (theWrap)
      width = Math.min(width, parseInt((theWrap * 0.5).toString(), 10));

    return width;
  }

  // make sure any options set for aliases,
  // are copied to the keys being aliased.
  function normalizeAliases() {
    // handle old demanded API
    const demandedOptions = yargs.getDemandedOptions();
    const options = yargs.getOptions();

    (Object.keys(options.alias) || []).forEach(key => {
      options.alias[key].forEach(alias => {
        // copy descriptions.
        if (descriptions[alias]) self.describe(key, descriptions[alias]);
        // copy demanded.
        if (alias in demandedOptions)
          yargs.demandOption(key, demandedOptions[alias]);
        // type messages.
        if (options.boolean.includes(alias)) yargs.boolean(key);
        if (options.count.includes(alias)) yargs.count(key);
        if (options.string.includes(alias)) yargs.string(key);
        if (options.normalize.includes(alias)) yargs.normalize(key);
        if (options.array.includes(alias)) yargs.array(key);
        if (options.number.includes(alias)) yargs.number(key);
      });
    });
  }

  // if yargs is executing an async handler, we take a snapshot of the
  // help message to display on failure:
  let cachedHelpMessage: string | undefined;
  self.cacheHelpMessage = function () {
    cachedHelpMessage = this.help();
  };

  // however this snapshot must be cleared afterwards
  // not to be be used by next calls to parse
  self.clearCachedHelpMessage = function () {
    cachedHelpMessage = undefined;
  };

  self.hasCachedHelpMessage = function () {
    return !!cachedHelpMessage;
  };

  // given a set of keys, place any keys that are
  // ungrouped under the 'Options:' grouping.
  function addUngroupedKeys(
    keys: string[],
    aliases: Dictionary<string[]>,
    groups: Dictionary<string[]>,
    defaultGroup: string
  ) {
    let groupedKeys = [] as string[];
    let toCheck = null;
    Object.keys(groups).forEach(group => {
      groupedKeys = groupedKeys.concat(groups[group]);
    });

    keys.forEach(key => {
      toCheck = [key].concat(aliases[key]);
      if (!toCheck.some(k => groupedKeys.indexOf(k) !== -1)) {
        groups[defaultGroup].push(key);
      }
    });
    return groupedKeys;
  }

  function filterHiddenOptions(key: string) {
    return (
      yargs.getOptions().hiddenOptions.indexOf(key) < 0 ||
      (yargs.parsed as DetailedArguments).argv[yargs.getOptions().showHiddenOpt]
    );
  }

  self.showHelp = (level: 'error' | 'log' | ((message: string) => void)) => {
    const logger = yargs.getInternalMethods().getLoggerInstance();
    if (!level) level = 'error';
    const emit = typeof level === 'function' ? level : logger[level];
    emit(self.help());
  };

  self.functionDescription = fn => {
    const description = fn.name
      ? shim.Parser.decamelize(fn.name, '-')
      : __('generated-value');
    return ['(', description, ')'].join('');
  };

  self.stringifiedValues = function stringifiedValues(values, separator) {
    let string = '';
    const sep = separator || ', ';
    const array = ([] as any[]).concat(values);

    if (!values || !array.length) return string;

    array.forEach(value => {
      if (string.length) string += sep;
      string += JSON.stringify(value);
    });

    return string;
  };

  // format the default-value-string displayed in
  // the right-hand column.
  function defaultString(value: any, defaultDescription?: string) {
    let string = `[${__('default:')} `;

    if (value === undefined && !defaultDescription) return null;

    if (defaultDescription) {
      string += defaultDescription;
    } else {
      switch (typeof value) {
        case 'string':
          string += `"${value}"`;
          break;
        case 'object':
          string += JSON.stringify(value);
          break;
        default:
          string += value;
      }
    }

    return `${string}]`;
  }

  // guess the width of the console window, max-width 80.
  function windowWidth() {
    const maxWidth = 80;
    // CI is not a TTY
    /* c8 ignore next 2 */
    if (shim.process.stdColumns) {
      return Math.min(maxWidth, shim.process.stdColumns);
    } else {
      return maxWidth;
    }
  }

  // logic for displaying application version.
  let version: any = null;
  self.version = ver => {
    version = ver;
  };

  self.showVersion = level => {
    const logger = yargs.getInternalMethods().getLoggerInstance();
    if (!level) level = 'error';
    const emit = typeof level === 'function' ? level : logger[level];
    emit(version);
  };

  self.reset = function reset(localLookup) {
    // do not reset wrap here
    // do not reset fails here
    failMessage = null;
    failureOutput = false;
    usages = [];
    usageDisabled = false;
    epilogs = [];
    examples = [];
    commands = [];
    descriptions = objFilter(descriptions, k => !localLookup[k]);
    return self;
  };

  const frozens = [] as FrozenUsageInstance[];
  self.freeze = function freeze() {
    frozens.push({
      failMessage,
      failureOutput,
      usages,
      usageDisabled,
      epilogs,
      examples,
      commands,
      descriptions,
    });
  };
  self.unfreeze = function unfreeze() {
    const frozen = frozens.pop();
    // In the case of running a defaultCommand, we reset
    // usage early to ensure we receive the top level instructions.
    // unfreezing again should just be a noop:
    if (!frozen) return;
    ({
      failMessage,
      failureOutput,
      usages,
      usageDisabled,
      epilogs,
      examples,
      commands,
      descriptions,
    } = frozen);
  };

  return self;
}

/** Instance of the usage module. */
export interface UsageInstance {
  cacheHelpMessage(): void;
  clearCachedHelpMessage(): void;
  hasCachedHelpMessage(): boolean;
  command(
    cmd: string,
    description: string | undefined,
    isDefault: boolean,
    aliases: string[],
    deprecated?: boolean
  ): void;
  deferY18nLookup(str: string): string;
  describe(keys: string | string[] | Dictionary<string>, desc?: string): void;
  epilog(msg: string): void;
  example(cmd: string, description?: string): void;
  fail(msg?: string | null, err?: YError | string): void;
  failFn(f: FailureFunction | boolean): void;
  freeze(): void;
  functionDescription(fn: {name?: string}): string;
  getCommands(): [string, string, boolean, string[], boolean][];
  getDescriptions(): Dictionary<string | undefined>;
  getPositionalGroupName(): string;
  getUsage(): [string, string][];
  getUsageDisabled(): boolean;
  help(): string;
  reset(localLookup: Dictionary<boolean>): UsageInstance;
  showHelp(level?: 'error' | 'log' | ((message: string) => void)): void;
  showHelpOnFail(enabled?: boolean | string, message?: string): UsageInstance;
  showVersion(level?: 'error' | 'log' | ((message: string) => void)): void;
  stringifiedValues(values?: any[], separator?: string): string;
  unfreeze(): void;
  usage(msg: string | null, description?: string | false): UsageInstance;
  version(ver: any): void;
  wrap(cols: number | null | undefined): void;
}

export interface FailureFunction {
  (
    msg: string | undefined | null,
    err: YError | string | undefined,
    usage: UsageInstance
  ): void;
}

export interface FrozenUsageInstance {
  failMessage: string | undefined | null;
  failureOutput: boolean;
  usages: [string, string][];
  usageDisabled: boolean;
  epilogs: string[];
  examples: [string, string][];
  commands: [string, string, boolean, string[], boolean][];
  descriptions: Dictionary<string | undefined>;
}

interface IndentedText {
  text: string;
  indentation: number;
}

function isIndentedText(text: string | IndentedText): text is IndentedText {
  return typeof text === 'object';
}

function addIndentation(
  text: string | IndentedText,
  indent: number
): IndentedText {
  return isIndentedText(text)
    ? {text: text.text, indentation: text.indentation + indent}
    : {text, indentation: indent};
}

function getIndentation(text: string | IndentedText): number {
  return isIndentedText(text) ? text.indentation : 0;
}

function getText(text: string | IndentedText): string {
  return isIndentedText(text) ? text.text : text;
}
