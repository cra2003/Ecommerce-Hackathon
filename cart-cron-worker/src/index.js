export default {
	async fetch(_request, _env, _ctx) {
		return new Response('Hello World!');
	},

	async scheduled(_event, env, _ctx) {
		await env.DB.prepare(
			`
		DELETE FROM carts
		WHERE status = 'converted'
	  `,
		).run();

		console.log('Cart cleanup done');
	},
};
