export default {
	async fetch(_request, _env, _ctx) {
		return new Response('Hello World!');
	},

	async scheduled(_event, env, _ctx) {
		await env.DB.prepare(
			`
		DELETE FROM carts
		WHERE soft_deleted = 1
	  `,
		).run();

		console.log('Cart cleanup done');
	},
};
