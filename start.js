require('dotenv').config();
const path = require('path');
const Telegraf = require('telegraf');
const fastifyApp = require('fastify')({ trustProxy: true });
const SocksAgent = require('socks5-https-client/lib/Agent');
const getLocalImage = require('./src/get-local-image');
const getText = require('./src/get-text');

const { HOST, PROXY, PORT, TOKEN, CHAT_ID, BOT_NAME } = process.env;

const options = PROXY ? ({
	telegram: {
		agent: new SocksAgent({
			socksHost: PROXY.split(':')[0],
			socksPort: PROXY.split(':')[1]
		})
	}
}) : undefined;

const REQUESTS = {};

const checkRequest = (message_id) => {
	if (REQUESTS[message_id]) {
		throw 'Stop throttling!';
	}
	REQUESTS[message_id] = Date.now();

	setTimeout(() => {
		delete REQUESTS[message_id];
	}, 60000);
};

const bot = new Telegraf(TOKEN, options);

bot.start((ctx) => ctx.reply('Welcome!'));
bot.help((ctx) => ctx.reply('Send me code'));

bot.on('text', async ({ replyWithPhoto, message }) => {
	checkRequest(message.message_id);
	console.log('Received message. Processing', message.text);

	try {
		const text = await getText(message.text);

		if (text.length > 0) {
			const { message_id } = await bot.telegram.sendMessage(message.chat.id, 'Processing...');

			const imagePath = await getLocalImage(text);

			await replyWithPhoto(`${HOST}${imagePath}`);

			await bot.telegram.deleteMessage(message.chat.id, message_id);
		}
	} catch (e) {
		console.warn(e);
	}
});

bot.on('inline_query', async ({ inlineQuery, answerInlineQuery }) => {
	console.log('Received inline. Processing');

	try {
		const text = await getText(inlineQuery.query);

		if (text.length < 1) {
			return;
		}

		if (inlineQuery.query.length > 250) {
			return await answerInlineQuery([{
				type: 'article',
				id: inlineQuery.id,
				title: 'Warning!',
				input_message_content: {message_text: 'Sorry, long code is not supported in inline mode. Send code directly to @CarbonNowBot'},
				description: 'Sorry, long code is not supported in inline mode. Send code directly to @CarbonNowBot',
				url: `t.me/${BOT_NAME}`,
				hide_url: true,
				thumb_url: 'https://carbon.now.sh/static/brand/apple-touch-icon.png'
			}]);
		}

		const imagePath = await getLocalImage(text);

		const { photo, message_id } = await bot.telegram.sendPhoto(CHAT_ID, `${HOST}${imagePath}`);
		const large = photo.pop();
		const thumb = photo.shift() || large;

		await (new Promise(resolve => setTimeout(resolve, 100)));

		const results = [{
			type: 'photo',
			id: inlineQuery.id,
			description: inlineQuery.query,
			thumb_url: thumb.file_id,
			photo_url: large.file_id
		}];

		const result = await answerInlineQuery(results);
		console.log(result);

		await bot.telegram.deleteMessage(CHAT_ID, message_id);
	} catch (e) {
		console.log(e);
	}
});

bot.telegram.setWebhook(`${HOST}/telegram-webhook`).then(() => {
	console.log('REGISTERED');
});

fastifyApp.use(bot.webhookCallback('/telegram-webhook'));

fastifyApp.get('/', (request, reply) => {
	reply.send({ carbon: 'works' })
});

fastifyApp.register(require('fastify-static'), {
	root: path.join(__dirname, 'tmp'),
	prefix: '/tmp/',
});

fastifyApp.listen(PORT, '0.0.0.0');
