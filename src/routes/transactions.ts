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

  app.get('/summary', {
    preHandler: checkSessionIdExists,
  }, async (request) => {

    const { sessionId } = request.cookies;

    const summary = await knex('transactions')
      .sum('amount', { as: 'amount' })
      .where({ session_id: sessionId })
      .first();

    return {
      summary,
    };

  });

  app.get('/:id', {
    preHandler: checkSessionIdExists,
  }, async (request) => {

    const getTransactionParamsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = getTransactionParamsSchema.parse(request.params);
    const { sessionId } = request.cookies;

    const transaction = await knex('transactions')
      .where({ 
        id,
        session_id: sessionId,
      })
      .first();

      return {
        transaction,
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

    return reply.status(201).send()
  });

};