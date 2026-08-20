import { relations } from "drizzle-orm/relations";
import { clientes, envios, campanas, encuestas, respuestas, tiposEncuesta, enviosWhatsappJobs, plantillasWhatsapp, enviosWhatsappDetalle, encuestaMedidas } from "./schema";
// Igual que en `schema.ts`: `authUser` no sale del `pull` (tablesFilter excluye auth_*),
// pero las relaciones que lo referencian sí. Re-agregar este import al regenerar.
import { authUser } from "./auth-schema";

export const enviosRelations = relations(envios, ({one}) => ({
	cliente: one(clientes, {
		fields: [envios.clienteId],
		references: [clientes.id]
	}),
	campana: one(campanas, {
		fields: [envios.campanaId],
		references: [campanas.id]
	}),
}));

export const clientesRelations = relations(clientes, ({many}) => ({
	envios: many(envios),
	encuestas: many(encuestas),
}));

export const campanasRelations = relations(campanas, ({one, many}) => ({
	envios: many(envios),
	tiposEncuesta: one(tiposEncuesta, {
		fields: [campanas.tipoEncuestaId],
		references: [tiposEncuesta.id]
	}),
	encuestas: many(encuestas),
	enviosWhatsappJobs: many(enviosWhatsappJobs),
}));

export const respuestasRelations = relations(respuestas, ({one}) => ({
	encuesta: one(encuestas, {
		fields: [respuestas.encuestaId],
		references: [encuestas.id]
	}),
}));

export const encuestasRelations = relations(encuestas, ({one, many}) => ({
	respuestas: many(respuestas),
	cliente: one(clientes, {
		fields: [encuestas.clienteId],
		references: [clientes.id]
	}),
	campana: one(campanas, {
		fields: [encuestas.campanaId],
		references: [campanas.id]
	}),
	enviosWhatsappDetalles: many(enviosWhatsappDetalle),
	encuestaMedidas: many(encuestaMedidas),
	authUser: one(authUser, {
		fields: [encuestas.marcadoSinRespuestaPor],
		references: [authUser.id]
	}),
}));

export const authUserRelations = relations(authUser, ({many}) => ({
	encuestas: many(encuestas),
	encuestaMedidas: many(encuestaMedidas),
}));

export const tiposEncuestaRelations = relations(tiposEncuesta, ({many}) => ({
	campanas: many(campanas),
}));

export const enviosWhatsappJobsRelations = relations(enviosWhatsappJobs, ({one, many}) => ({
	campana: one(campanas, {
		fields: [enviosWhatsappJobs.campanaId],
		references: [campanas.id]
	}),
	plantillasWhatsapp: one(plantillasWhatsapp, {
		fields: [enviosWhatsappJobs.plantillaId],
		references: [plantillasWhatsapp.id]
	}),
	enviosWhatsappDetalles: many(enviosWhatsappDetalle),
}));

export const plantillasWhatsappRelations = relations(plantillasWhatsapp, ({many}) => ({
	enviosWhatsappJobs: many(enviosWhatsappJobs),
}));

export const enviosWhatsappDetalleRelations = relations(enviosWhatsappDetalle, ({one}) => ({
	enviosWhatsappJob: one(enviosWhatsappJobs, {
		fields: [enviosWhatsappDetalle.jobId],
		references: [enviosWhatsappJobs.id]
	}),
	encuesta: one(encuestas, {
		fields: [enviosWhatsappDetalle.encuestaId],
		references: [encuestas.id]
	}),
}));

export const encuestaMedidasRelations = relations(encuestaMedidas, ({one}) => ({
	encuesta: one(encuestas, {
		fields: [encuestaMedidas.encuestaId],
		references: [encuestas.id]
	}),
	authUser: one(authUser, {
		fields: [encuestaMedidas.createdBy],
		references: [authUser.id]
	}),
}));