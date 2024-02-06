import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { knex } from "../knex";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";


export async function transactionsRoutes(app: FastifyInstance){

  app.get("/", {
    preHandler: checkSessionIdExists,
  }, async (request) => {

    const { sessionId } = request.cookies;

    const transactions = await knex('transactions').select('*').where({
      session_id: sessionId,
    });

    return {
      transactions,
    };
  });
  
  app.post('/', async (request, reply) => {
    
    const createBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    });

    const { title, amount, type } = createBodySchema.parse(request.body);

    let sessionId = request.cookies.sessionId;

    if(!sessionId){
      sessionId = randomUUID();

      reply.cookie("sessionId", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      session_id: sessionId,
      amount: type === 'credit' ? amount : amount * - 1
    })

    return reply.status(201).send({
      message: "sucessful",
    });
  });

};