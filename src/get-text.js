const processContent = require('./process-content');

module.exports = async (text) => {
	const processedContent = await processContent(text);
	return encodeURIComponent(processedContent);
};
