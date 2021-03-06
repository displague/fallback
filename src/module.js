// Fetch an already existant module from our definitions. If the module in question doesn't exist then we'll generate
// it automatically unless the `generate` parameter is explicitly set to `false`. If a `module` is defined, then it's
// defaults will come out of whatever is contained in the `input` parameter.
/* eslint-disable */
var module = function(moduleName, input, generate) {
	/* eslint-enable */
	// Fetch our real module name, in the case that we're passed an alias.
	moduleName = module.named(moduleName);

	// If the module already exists, then return it.
	if (module.exists(moduleName)) {
		return module.definitions[moduleName];
	}

	// If we explicity stated not to generate our module, then stop here.
	if (generate === false) {
		return null;
	}

	// Generate and return our newly generated module.
	return module.define(moduleName, input);
};

// Store our aliases in a mapped `Object` that way it can be referenced easily.
module.alias = function(moduleName, aliases) {
	// Store the actual module name as an alias of itself.
	module.aliases[moduleName] = moduleName;

	// Normalize our incoming aliases.
	aliases = me.normalizeStringSeries(aliases);

	// If no alias were passed in, then halt our function.
	if (!aliases.length) {
		return;
	}

	// Fetch our module so we can add our aliases to it.
	var moduleInstance = module(moduleName, null, false);

	// Loop through each of our aliases and store them.
	me.each(aliases, function(alias) {
		// If the alias already exists, notify the end user before overwriting it.
		if (me.isDefined(module.aliases[alias])) {
			me.log(2, 'module', 'Module alias `' + alias + '` already exists for `' + module.aliases[alias] + '`! Overwriting!');
		}

		// Reference our alias.
		module.aliases[alias] = moduleName;

		// If we don't aleady have an alias stored in our modules aliases, then add it.
		if (me.indexOf(moduleInstance.alias, alias)) {
			moduleInstance.alias.push(alias);
		}
	});
};

// An `Object` of aliases mappings where the `key` is the alias and the `value` is the `module` that the alias is for.
module.aliases = {};

// Fetch the base URL for the current identity being passed in.
module.base = function(identity) {
	// If our `base` variable is null/empty, return null.
	if (!me.config.settings.base) {
		return null;
	}

	// If our `base` variable is a string, then return it.
	if (me.isString(me.config.settings.base)) {
		return me.config.settings.base;
	}

	// If no identity was given them revert to our fallback.
	if (!identity) {
		identity = module.identify.fallback;
	}

	// If a base URL exists for the identity, then return it.
	if (me.isDefined(me.config.settings.base[identity]) && me.config.settings.base[identity]) {
		return me.config.settings.base[identity];
	}

	// No base URL was found.
	return null;
};

// Attempt to load a module.
module.boot = function(moduleName, successCallback, errorCallback) {
	// Fetch the instance of our module.
	var moduleInstance = module(moduleName);

	// If our module is already loaded, then skip the loading process and hit the callback.
	if (moduleInstance.loader.loaded === true) {
		successCallback();
		return;
	}

	// Push our success callback to the queue.
	if (me.isFunction(successCallback)) {
		moduleInstance.successCallbacks.push(successCallback);
	}

	// Push our error callback to the queue.
	if (me.isFunction(errorCallback)) {
		moduleInstance.errorCallbacks.push(errorCallback);
	}

	// If this module is currently in the process of being loaded, queue our callback and skip processing.
	if (moduleInstance.loader.working === true) {
		return;
	}

	// Attempt to load the module on to the page.
	me.loader.boot(moduleInstance);
};

// Define a new module and normalize the `input`. This `Function` will override a module if it already exists with the
//  same name unless the `noOverride` parameter is explicity set to `true`.
module.define = function(moduleName, input, noOverride) {
	// If a module with the `moduleName` already exists, fetch the actual name of the module in case we have an alias.
	moduleName = module.named(moduleName);

	// If the module already exists, determine whether or not to override it.
	if (module.exists(moduleName)) {
		// If we explicity state not to override an existing module, then halt the function.
		if (noOverride === true) {
			return null;
		}

		// Let the end user know that we're overriding a module.
		me.log(2, 'module', 'Module `' + moduleName + '` already exists! Overwriting!');
	}

	// Force our input to an `Object`.
	if (!me.isObject(input)) {
		input = {};
	}

	// Normalize our `input` parameter.
	var normalized = module.define.normalize(moduleName, input);

	// Store the definition reference of our module.
	var moduleInstance = module.definitions[moduleName] = normalized;

	// Import the aliases for our module.
	module.alias(moduleName, normalized.alias);

	// Return our newly defined module.
	return moduleInstance;
};

// Normalize the `input` data for a new module.
module.define.normalize = function(moduleName, input) {
	// Fetch the defaults for a module.
	var defaults = module.define.defaults();

	// Storage for `input` after it's been normalized.
	var normalized = {};

	// Loop through the top level and loader sublevels of our `input` and `defaults`.
	me.each([false, true], function(inputKey) {
		// The reference to the level of our defaults that we're normalizing in this iteration.
		var payload = defaults;

		// If the `inputKey` isn't empty, then we're normalizing a sublevel. Adjust the payload's reference.
		if (inputKey) {
			normalized.loader = {};
			payload = payload.loader;
		}

		// Loop through our defaults.
		me.each(payload, function(values, key) {
			// By default set the value to whatever was passed in to our function.
			var value = input[key];

			// If our `values` is an `Array`, then run the normalization function on the input value.
			if (me.isaArray(values)) {
				value = values[0](value, values[1]);
			}

			// If the `inputKey` isn't empty, store the `value` in our sublevel of our normalized `Object`.
			if (inputKey) {
				normalized.loader[key] = value;
				return;
			}

			// Store the value at the top level of our normalized `Object`.
			normalized[key] = value;
		});
	});

	// Forcefully set the module name within the `Object`.
	normalized.name = moduleName;

	// Store the identity of our module now, so that we may reference it later.
	normalized.identity = module.identify(moduleName);

	// Normalize all of the URLs for the module now and store them in a normalized state.
	normalized.urls = module.urls(moduleName, normalized.identity, normalized.urls);

	// Return our normalized input.
	return normalized;
};

// The following are our defaults that we'll use to normalize our data when defining a new module. The values of this
// `Object` are `Array` based. The first parameter of the `Array` is the `Function` that we'll use to normalize the
// value, the 2nd parameter is the fallback value that we'll use. For example: `alias: [me.normalizeStringSeries, []]`
// will run the `me.normalizeStringSeries` on the value of `alias`, and if the value is malformed, the value will be
// set to `[]`. If the value in our `defaults` `Object` is not an `Array`, then it will be skipped/ignored from the
// normalization loop.
module.define.defaults = function() {
	return {
		// Wheter or not the module is a AMD.
		amd: [me.normalizeBoolean, false],

		// Aliases for the module.
		'alias': [me.normalizeStringSeries, null],

		// Custom check function to determine whether or not our library has loaded properly.
		'check': [me.normalizeFunction, null],

		// Dependencies for the module.
		'deps': [me.normalizeStringSeries, null],

		// An error `Function` which will be called if the library or it's dependencies fail to load.
		error: [me.normalizeFunction, null],

		// We store our errorr callbacks here for processing after our library has finished loading.
		errorCallbacks: [me.normalizeFunctionSeries, null],

		// Exports for the module that we'll check the global scope for to see if the module loaded properly.
		'exports': [me.normalizeStringSeries, null],

		// The identity of the module, for example: `css`, `img`, or `js`.
		identitiy: [me.normalizeString, null],

		// If the factory of the module is a function, it'll be invoked upon it's first require then that state will be
		// saved. This flags whether or not the factory was invoked and saved.
		invoked: [me.normalizeBoolean, false],

		// The value of our module. It's value can be anything, example: `Array`, `Function`, `HTMLElement`, `Object`,
		// `String`, etc.
		factory: null,

		// Must be either `null` or a `Function`. As soon as module is first used/referenced, this `Function` will
		// immediately be called upon if present.
		'init': [me.normalizeFunction, null],

		// Any loader data for the module will be stored here.
		loader: {
			// Any URLs that failed to load will be stored here.
			failed: [me.normalizeStringSeries, null],

			// Whether or not we actually attempted to load this module.
			loaded: [me.normalizeBoolean, false],

			// If a URL loaded sucecssfully, it will be stored here.
			success: [me.normalizeString, null],

			// The time that a module finished loading.
			timeEnd: [me.normalizeNumber, null],

			// The time that a module initiated it's load sequence. This includes all loading for the module in question. For
			// example if a library had 3 fallback URLs, and the first 2 failed due to timeouts, and the 3rd was successful,
			// this variable would reflect the current time prior to the first 2 URLs failing.
			timeStart: [me.normalizeNumber, null],

			// Flags whether or not the module is currently in the process of loading.
			working: [me.normalizeBoolean, false]
		},

		// We store our errorr callbacks here for processing after our library has finished loading.
		successCallbacks: [me.normalizeFunctionSeries, null],

		// Where all the URLs are stored for our module.
		'urls': [me.normalizeStringSeries, null],

		// The version of our module.
		version: [me.normalizeString, null]
	};
};

// All our module definitions will be stored and referenced through this `Object`. The keys of this `Object` correlate
// to the modules actual name.
module.definitions = {};

// Fetch the dependencies for an `Array` of modules that passed in. If `findNestedDependencies` is explicitly set to
// `true`, then the `Function` will run a loop and fetch the full dependecy tree for all of the modules until all
// dependencies have been exhausted and added to the queue.
module.dependencies = function(modules, findNestedDependencies) {
	// Store our queue of dependency modules.
	var queue = [];

	// Loop through and fetch our dependencies.
	me.each(modules, function(moduleName) {
		// Reference our module definition.
		var moduleInstance = module(moduleName, null, false);

		// If the module doesn't exist, or there aren't any dependencies, skip the iteration.
		if (!moduleInstance || !moduleInstance.deps.length) {
			return;
		}

		// Queue our dependencies.
		queue = queue.concat(moduleInstance.deps);

		// If we explicity want a loop of all our dependencies, then we'll trace through them here.
		if (findNestedDependencies === true) {
			queue = queue.concat(module.dependencies(moduleInstance.deps, findNestedDependencies));
		}
	});

	// Return all of our queued dependency modules.
	return queue;
};

// Check to see whether a module exists by name.
module.exists = function(moduleName) {
	// Search the definitions `Object`.
	if (me.isDefined(module.definitions[module.named(moduleName)])) {
		return true;
	}

	// No module found.
	return false;
};

// Identify the type of module that we have. Example: CSS, Image, JavaScript, etc.
module.identify = function(moduleName) {
	// If we can't identify the module, use our fallback.
	var fallback = module.identify.fallback;

	// If no `moduleName` was passed in, return the fallback.
	if (!moduleName) {
		return fallback;
	}

	// Split the `moduleName` on our `delimiter` which is derived from our configuration.
	var split = moduleName.split(me.config.settings.delimiter);

	// If we can't find our delimiter, then return our fallback.
	if (split.length < 2 || me.indexOf(module.identify.types, split[0]) === -1) {
		return fallback;
	}

	// Return our modules identity.
	return split[0];
};

// The identifier to fallback on if we cannot find a match.
module.identify.fallback = 'js';

// The support identifier types.
module.identify.types = ['css', 'img', 'js'];

// Invoke and return the invoked instance of the `factory` for our `module`, if the `factory` happens to be a
// `Function`. If the `factory` is not a `Function`, we'll simply return whatever value is set for the `factory.
module.invoke = function(moduleName) {
	// Fetch the instance of our `module`.
	var moduleInstance = module(moduleName, null, false);

	// If we couldn't fetch an instance of our `module`, something went wrong, relay a message to the end user.
	if (!moduleInstance) {
		me.log(1, 'Module wasn\'t found!', moduleName);
		return null;
	}

	// If the module hasn't already been invoked, then invoke it.
	if (!moduleInstance.invoked) {
		// Flag the module as invoked, so we don't run through this step again.
		moduleInstance.invoked = true;

		// Reference the instance of our invoked `factory` as the `factory` value for the module.
		moduleInstance.factory = module.invoke.factory(moduleInstance.factory, moduleInstance.deps);
	}

	// Return the invoked `factory` instance of the module.
	return moduleInstance.factory;
};

// Invoke all pending callbacks that are queued for a specific module.
module.invoke.callbacks = function(moduleName, success) {
	// Fetch the reference to our module.
	var moduleInstance = module(moduleName, null, false);

	// Determine which set of callbacks to invoke.
	var reference = moduleInstance.errorCallbacks;

	// If we're invoking our success callbacks, then wipe the error callback references from memory.
	if (success) {
		moduleInstance.errorCallbacks = [];
		reference = moduleInstance.successCallbacks;
	}

	// If there are no callbacks, then halt the `Function`.
	if (!me.isaArray(reference) || !reference.length) {
		return;
	}

	// Loop through end invoke each of the callbacks.
	me.each(reference, function(callback, index) {
		// Invoke the callback.
		if (me.isFunction(callback)) {
			callback();
		}

		// Remove the callback from the queue.
		delete reference[index];
	});
};

// Invoke a `factory` with the arguments being the dependencies that are passed in via the `deps` parameter.
module.invoke.factory = function(factory, deps) {
	// If the `factory` passed in is not a `Function`, then simply return it's current value.
	if (!me.isFunction(factory)) {
		return factory;
	}

	// Invoke and return the invoked reference of our `factory`.
	return factory.apply(null, module.references(deps));
};

// Fetch the actual name of a module. If a modules alias is passed in, this `Function` will fetch the modules name.
module.named = function(moduleName) {
	// Fetch our actual module name, in the case that the `Function` was passed an alias.
	if (me.isDefined(module.aliases[moduleName])) {
		moduleName = module.aliases[moduleName];
	}

	// Return the module name.
	return moduleName;
};

// Invoke an `Array` of modules, and return each of their `factory` values in an `Array`.
module.references = function(modules) {
	// Store a list of our `factory` references.
	var references = [];

	// If no `modules` were passed into the `Function`, then simply return an empty `Array`.
	if (!modules.length) {
		return references;
	}

	// Loop through and invoke each of our modules.
	me.each(modules, function(moduleInstance) {
		// Push the `factory` off to our `references` `Array`.
		references.push(module.invoke(moduleInstance));
	});

	// Return our set of modules references.
	return references;
};

// Normalize all of the URLs for our modules. This function will automatically prepend our base URLs and store them.
// This has a few benefits: we don't have to worry about processing the URLs later. We're able to store a snapshot
// of the current base URLs for the module in question, this way we can change our base URLs later and still maintain
// and use a different set of base URLs with other modules.
module.urls = function(moduleName, identity, urls) {
	// Fetch the base URL for our module.
	var base = module.base(identity) || '';

	// Store our extension string, for Node JS, don't add an extension. @nodejs
	var extension = '.' + identity;

	// If we don't have any URLs, then set the URLs to a AMD.
	if (!urls.length) {
		return [base + moduleName + extension];
	}

	// Store our set of normalized URLs that we'll reference.
	var normalizedUrls = [];

	// Loop through each of the URLs.
	me.each(urls, function(url) {
		// If the URL we're examining doesn't have an extension then automatically add it. If the `identity` of the module
		// happens to be an image, then the user must pass in an extension. We cannot assume the extension of image files
		// types, but we can for CSS and JavaScript files.
		if (identity !== 'img' && url.substr(-extension.length) !== extension) {
			url += extension;
		}

		// If we have a `base` URL and it's not prefixed with a match from our ignore list, then prepend the base URL.
		if (base && !me.isPrefixed(url, module.urls.ignore)) {
			url = base + url;
		}

		// Push the normalized URL off to our list.
		normalizedUrls.push(url);
	});

	// Return the set of our normalized URLs.
	return normalizedUrls;
};

// URL prefixes to specifically ignore from prepending with our base URL.
module.urls.ignore = ['/', 'data:', 'http://', 'https://'];

// Reference the module within the library.
me.module = module;
