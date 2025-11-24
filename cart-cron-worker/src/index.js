export default {
	async fetch(request, env, ctx) {
	  return new Response('Hello World!');
	},
  
	async scheduled(event, env, ctx) {
	  await env.DB.prepare(`
		DELETE FROM carts
		WHERE soft_deleted = 1
	  `).run();
  
	  console.log("Cart cleanup done");
	}
  };
  