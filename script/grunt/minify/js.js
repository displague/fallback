module.exports = function(grunt, tasks) {
	var me = {};
	var uri = grunt.app.config.uri;

	me.dest = uri.dist + 'fallback.min.js';

	me.options = {};

	me.options.checkModified = false;

	me.options.compilerFile = uri.nodeModules + 'superstartup-closure-compiler/build/compiler.jar';

	me.options.compilerOpts = {};

	me.options.compilerOpts.compilation_level = 'ADVANCED_OPTIMIZATIONS';

	me.options.compilerOpts.externs = uri.config + 'closureExterns.js';

	me.src = uri.distTmp + 'fallback.min.js';

	tasks.closureCompiler.js = me;

	return tasks;
};
