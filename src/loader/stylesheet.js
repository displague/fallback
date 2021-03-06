// Cascading Stylesheet loader which is responsible for loading any CSS files for the library. A lot of browser quirks
// to deal with here. @reference http://www.phpied.com/when-is-a-stylesheet-really-loaded/
var stylesheet = {};

// Attempt to load a stylesheet onto the page.
stylesheet.boot = function(module, url, callbackSuccess, callbackFailed) {
	// If the stylesheet is already loaded on the page, don't attempt to reload it.
	var factory = stylesheet.check(module, url, false);

	// Check if our module has already been loaded.
	if (factory) {
		return callbackSuccess(module, url, factory, true);
	}

	// If our library failed to load, we'll call upon this function.
	var failed = function() {
		return callbackFailed(module, url);
	};

	// Whether a callback comes back as an error/success, they're not always trustworthy.
	// We need to manually check to make sure that our libraries were loaded properly.
	var check = function() {
		// Attempt to fetch the factory for our module.
		factory = stylesheet.check(module, url);

		// If the factory is empty, then it failed to load! Invoke the failure callback.
		if (!factory) {
			return failed();
		}

		// We passed the checks, invoke the success callback.
		return callbackSuccess(module, url, factory);
	};

	// Spawn a new element on the page contained our URL with our callbacks.
	return stylesheet.element(url, check, failed);
};

// Check to see if a module has already been loaded on the page. This `Function` will return `Boolean`, `true` being
// that a module has already been loaded and `false` being that it hasn't.
stylesheet.check = function(module, url, fallback) {
	// See if the module itself has been flagged as loaded.
	if (module.loader.loaded === true) {
		return true;
	}

	// If the user added their own custom checking function, invoke it now to preform the check.
	if (me.isFunction(module.check)) {
		return module.check();
	}

	// This has been disabled due to a variety of timing factors with different browsers.
	// @reference http://www.phpied.com/when-is-a-stylesheet-really-loaded/

	// If globals are enabled, and we have exports for the module, check the DOM to see if they're defined.
	//if (me.config.settings.globals === true && module.exports.length && !me.isPrefixed(url, stylesheet.check.ignore)) {
	//	return stylesheet.check.exports(module.exports);
	//}

	// By default just return true, as this function was hit from a success callback.
	return me.isDefined(fallback) ? fallback : true;
};

// Bypass checking if a URL starts with any of the following values. This is due to CORS issues with the browsers when
// a CSS file is loaded from an external source.
stylesheet.check.ignore = ['//', 'http://', 'https://'];

// Check for the instance of our library based on the exports given. If the instance of our library exists it'll be
// returned, otherwise this function will return `null. The `Function` basically checks the `window` variable for a
// subkey which are the exports that are specified in the paramter.
stylesheet.check.exports = function(exports) {
	// If our `exports` parameter is not an `Array`, cast it to one.
	if (!me.isaArray(exports)) {
		exports = [exports];
	}

	// Storage for our factory value.
	var factory = null;

	// If we have no exports, return `null`.
	if (!exports.length) {
		return factory;
	}

	// Case all of our exports to lowercase as some browsers automatically change them.
	var normalized = [];

	me.each(exports, function(exportName) {
		normalized.push(exportName.toLowerCase());
	});

	// Swap our exports `Array` out with out normalized lowercase `Array`.
	exports = normalized;

	// If the `global.document` doesn't contain the key `styleSheets`, return `null`.
	if (!me.isDefined(global.document.styleSheets)) {
		return factory;
	}

	// Loop through each of the documents stylesheets.
	me.each(global.document.styleSheets, function(sheet) {
		// If the sheet is `0`, skip it.
		if (sheet === 0) {
			return true;
		}

		// Loop through the following keys in `global.document.stylesheets`.
		me.each(['cssRules', 'rules'], function(key) {

			// This has to be wrapped in a `try catch` due to some browsers throwing a CORS exception if the stylesheet is
			//loaded via an external domain.
			try {
				// If `sheet.rules` exists, scan it for our export.
				if (me.isDefined(sheet[key])) {
					factory = stylesheet.scan(sheet[key], exports);

					// If we found our rule, halt the loop.
					if (factory) {
						return false;
					}
				}
			} catch (exception) {
				me.log(2, 'loader', 'stylesheet', '`fallback.loader.css.check.exports` threw an exception.', exception);
			}
		});

		// If we found our selector, halt the loop!
		if (factory) {
			return false;
		}
	});

	// Return whether or not our stylesheet was loaded.
	return factory;
};

// Spawn a new element on the page with our URL.
// @reference https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement
stylesheet.element = function(url, success, failed) {
	// Create a new script element instance.
	var element = global.document.createElement('link');

	// Explicitly set async behavior.
	element.async = element.defer = true;

	// The browser supports it, enable crossorigin.
	element.crossorigin = true;

	// Set the actual URL that we're going to request to load for our library.
	element.href = url;

	// If we get an error callback, bypass any checking and just fail.
	element.onerror = failed;

	// Do our checks and throw our callback.
	element.onload = success;

	// Special event handler for certain versions of IE. @ie
	me.loader.onReadyStateChange(element, success);

	// Set the type, some legacy browsers require this attribute be present.
	element.rel = 'stylesheet';

	// Load our URL on the page.
	return me.head.appendChild(element);
};

// Scan through the documents stylesheets searching for a specific selector.
stylesheet.scan = function(ruleset, selectors) {
	// Store whether or not we found our selector.
	var found = false;

	// Loop through the rules.
	for (var index in ruleset) {
		if (ruleset[index]) {
			var rule = ruleset[index];

			// See if we find a match for one of our selectors.
			if (me.indexOf(selectors, String(rule.selectorText).toLowerCase()) !== -1) {
				// Flag that we found our selector.
				found = true;

				// Halt the loop.
				break;
			}
		}
	}

	// Return our search status.
	return found;
};

// Reference the module within the `loader`.
me.loader.css = stylesheet;
