'use strict';

const path = require('path');
const fs = require('fs');

function getAllFiles(root) {
	var res = [],
		files = fs.readdirSync(root);
	files.forEach(function (file) {
		var pathname = root + '/' + file,
			stat = fs.lstatSync(pathname);

		if (!stat.isDirectory()) {
			res.push(pathname);
		} else {
			res = res.concat(getAllFiles(pathname));
		}
	});
	return res
}

function replace(file, rules, chunkFileName) {
	const src = path.resolve(file);
	let template = fs.readFileSync(src, 'utf8');

	template = rules.reduce(
		(template, rule) => template.replace(
			rule.search, (typeof rule.replace === 'string' ? rule.replace : rule.replace.bind(global,chunkFileName))
		),
		template
	);

	fs.writeFileSync(src, template);
}

function ReplaceInFilePlugin(options = []) {
	this.options = options;
};

ReplaceInFilePlugin.prototype.apply = function (compiler) {
	const root = compiler.options.context;
	const done = (statsData) => {
		if (statsData.hasErrors()) {
			return
		}
		const chunkFilename = statsData.compilation.chunks[0].files[0];  
		this.options.forEach(option => {
			const dir = option.dir ? option.dir : root;
			const files = option.files;

			if (files && Array.isArray(files) && files.length) {
				files.forEach(file => {
					replace(path.resolve(dir, file), option.rules, chunkFilename);
				})
			} else {
				const test = option.test;
				const testArray = Array.isArray(test) ? test : [test];
				const files = getAllFiles(dir);

				files.forEach(file => {
					const match = testArray.some((test, index, array) => {
						return test.test(file);
					})

					if (!match) {
						return;
					}
					replace(file, option.rules, chunkFilename);

				})
			}
		})
	}

	if (compiler.hooks) {
		const plugin = {
			name: "ReplaceInFilePlugin"
		};
		compiler.hooks.done.tap(plugin, done);
	} else {
		compiler.plugin('done', done);
	}
};

module.exports = ReplaceInFilePlugin;
