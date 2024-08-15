import process from "node:process";
import Fastify from "fastify";
import FastifyVite from "@fastify/vite";

const server = Fastify();

import { api } from "./user_api.js";

// api has path, method, and handler
const attachAdditionalRoutes = (userApis) => {
  userApis.forEach((api) => {
    server.route({
      method: api.method,
      url: api.path,
      handler: api.handler,
    });
  });
};

await server.register(FastifyVite, {
  root: import.meta.url,
  dev: process.argv.includes("--dev"),
  spa: true,
});

// Handling the render of the react app
server.get("/", (req, reply) => {
  return reply.html();
});

attachAdditionalRoutes(api);

await server.vite.ready();
await server.listen({ port: 3000 });
