const fs = require('fs');

const styles = fs.readFileSync(__dirname + '/styles.css');
const css = fs.readFileSync(__dirname + '/codemirror.css');
const js = fs.readFileSync(__dirname + '/codemirror.js');
const meta = fs.readFileSync(__dirname + '/meta.js');

let modes = '';
['javascript', 'jsx', 'php', 'xml', 'css', 'htmlmixed'].forEach((lang) => {
	modes += fs.readFileSync(`node_modules/codemirror/mode/${lang}/${lang}.js`);
});

module.exports = (text, mode) => {
	return `<html lang="en">
		<body>
		<style>
			${css}
			${styles}
		</style>

		<div id="code"></div>

		<script>
			${js}
		</script>
		<script>
			${modes}
		</script>
		<script>
			${meta}
		</script>

		<script>
			var mode = CodeMirror.findModeByName('${mode}');
			var myCodeMirror = CodeMirror(document.querySelector("#code"), {
			  value: \`${text.trim()}\`,
			  mode: mode.mime,
			  theme: "material",
			  lineNumbers: true,
			});
		</script>

		</body>
	</html>`
};

