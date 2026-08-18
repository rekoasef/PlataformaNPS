import { pgTable, index, check, uuid, text, timestamp, foreignKey, unique, smallint, boolean, jsonb, date, integer, pgView, bigint, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const campanaEstado = pgEnum("campana_estado", ['activa', 'completada', 'archivada'])
export const encuestaEstado = pgEnum("encuesta_estado", ['pendiente', 'respondida', 'recordatorio_enviado', 'necesidad_de_llamado', 'sin_respuesta'])
export const envioEstado = pgEnum("envio_estado", ['pendiente_envio', 'enviado'])
export const notificacionTipo = pgEnum("notificacion_tipo", ['nps_critico', 'nueva_respuesta', 'regalo_pendiente', 'campana_sin_actividad'])
export const regaloEstado = pgEnum("regalo_estado", ['pendiente_envio', 'enviado'])
export const tipoMaquinaEnum = pgEnum("tipo_maquina_enum", ['sembradora', 'fertilizadora'])


export const clientes = pgTable("clientes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: text().notNull(),
	telefono: text().notNull(),
	concesionario: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ordenFabricacion: text("orden_fabricacion"),
	telefono2: text("telefono_2"),
	telefono3: text("telefono_3"),
	tecnologia: text(),
	tipoMaquina: text("tipo_maquina"),
}, (table) => [
	index("idx_clientes_concesionario").using("btree", table.concesionario.asc().nullsLast().op("text_ops")),
	index("idx_clientes_tecnologia").using("btree", table.tecnologia.asc().nullsLast().op("text_ops")).where(sql`(tecnologia IS NOT NULL)`),
	index("idx_clientes_telefono").using("btree", table.telefono.asc().nullsLast().op("text_ops")),
	index("idx_clientes_tipo_maquina").using("btree", table.tipoMaquina.asc().nullsLast().op("text_ops")).where(sql`(tipo_maquina IS NOT NULL)`),
	check("clientes_tecnologia_check", sql`(tecnologia IS NULL) OR (tecnologia = ANY (ARRAY['leaf'::text, 'precision_planting'::text]))`),
	check("clientes_tipo_maquina_check", sql`(tipo_maquina IS NULL) OR (tipo_maquina = ANY (ARRAY['Gringa'::text, 'Pionera'::text, 'Plantor'::text, 'Drilor'::text, 'Mixia'::text, 'Domina'::text, 'Corper (incorporadora)'::text, 'Raster (motriz)'::text, 'Movia (arrastre)'::text, 'Luxion'::text]))`),
]);

export const envios = pgTable("envios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clienteId: uuid("cliente_id").notNull(),
	campanaId: uuid("campana_id").notNull(),
	numeroRecordatorio: smallint("numero_recordatorio").default(0).notNull(),
	estadoEnvio: envioEstado("estado_envio").default('pendiente_envio').notNull(),
	fechaEnvio: timestamp("fecha_envio", { withTimezone: true, mode: 'string' }),
	notificacionEnviada: boolean("notificacion_enviada").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_envios_campana_id").using("btree", table.campanaId.asc().nullsLast().op("uuid_ops")),
	index("idx_envios_cliente_id").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
	index("idx_envios_notificacion").using("btree", table.notificacionEnviada.asc().nullsLast().op("bool_ops"), table.fechaEnvio.asc().nullsLast().op("bool_ops")),
	index("idx_envios_numero_recordatorio").using("btree", table.numeroRecordatorio.asc().nullsLast().op("int2_ops")),
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "envios_cliente_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.campanaId],
			foreignColumns: [campanas.id],
			name: "envios_campana_id_fkey"
		}).onDelete("restrict"),
	unique("unique_envio_cliente_campana_recordatorio").on(table.clienteId, table.campanaId, table.numeroRecordatorio),
	check("envios_numero_recordatorio_check", sql`(numero_recordatorio >= 0) AND (numero_recordatorio <= 3)`),
]);

export const respuestas = pgTable("respuestas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	encuestaId: uuid("encuesta_id").notNull(),
	npsProducto: smallint("nps_producto").notNull(),
	npsEmpresa: smallint("nps_empresa").notNull(),
	npsConcesionario: smallint("nps_concesionario").notNull(),
	comentarioProducto: text("comentario_producto"),
	comentarioEmpresa: text("comentario_empresa"),
	comentarioGeneral: text("comentario_general"),
	fechaRespuesta: timestamp("fecha_respuesta", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	nombreApellido: text("nombre_apellido"),
	calleNumero: text("calle_numero"),
	pisoDepartamento: text("piso_departamento"),
	localidad: text(),
	codigoPostal: text("codigo_postal"),
	provincia: text(),
	email: text(),
	telefono: text(),
	concesionarioSede: text("concesionario_sede"),
	maquinaModelo: text("maquina_modelo"),
	nombreFirmaFactura: text("nombre_firma_factura"),
	calificacionEntregaPresentacion: smallint("calificacion_entrega_presentacion"),
	calificacionPuestaMarcha: smallint("calificacion_puesta_marcha"),
	calificacionCapacitacion: smallint("calificacion_capacitacion"),
	calificacionFuncionamientoGeneral: smallint("calificacion_funcionamiento_general"),
	calificacionTecnico: smallint("calificacion_tecnico"),
	tipoMaquina: tipoMaquinaEnum("tipo_maquina").default('sembradora').notNull(),
	regaloEstado: regaloEstado("regalo_estado").default('pendiente_envio').notNull(),
	comentarioConcesionario: text("comentario_concesionario"),
	canalRespuesta: text("canal_respuesta").default('mensaje').notNull(),
	numeroSeguimiento: text("numero_seguimiento"),
	fechaSeguimiento: timestamp("fecha_seguimiento", { withTimezone: true, mode: 'string' }),
	fechaEnvio: timestamp("fecha_envio", { withTimezone: true, mode: 'string' }),
	calificacionFuncionamientoAnual: smallint("calificacion_funcionamiento_anual"),
	tuvoProblemasTecnicos: boolean("tuvo_problemas_tecnicos"),
	calificacionResolucionProblemas: smallint("calificacion_resolucion_problemas"),
	comentarioProblemas: text("comentario_problemas"),
	cumplimientoExpectativas: smallint("cumplimiento_expectativas"),
	respuestasRaw: jsonb("respuestas_raw"),
	conformidadAcompanamientoGarantia: smallint("conformidad_acompanamiento_garantia"),
	necesitoAsistenciaUrgente: boolean("necesito_asistencia_urgente"),
	calificacionTiempoRespuestaUrgente: smallint("calificacion_tiempo_respuesta_urgente"),
	tuvoReclamoGarantia: boolean("tuvo_reclamo_garantia"),
	calificacionResolucionProblemaGarantia: smallint("calificacion_resolucion_problema_garantia"),
	comentarioProblemaGarantia: text("comentario_problema_garantia"),
}, (table) => [
	index("idx_respuestas_canal_respuesta").using("btree", table.canalRespuesta.asc().nullsLast().op("text_ops")),
	index("idx_respuestas_encuesta_id").using("btree", table.encuestaId.asc().nullsLast().op("uuid_ops")),
	index("idx_respuestas_fecha").using("btree", table.fechaRespuesta.asc().nullsLast().op("timestamptz_ops")),
	index("idx_respuestas_nps_concesionario").using("btree", table.npsConcesionario.asc().nullsLast().op("int2_ops")),
	index("idx_respuestas_nps_empresa").using("btree", table.npsEmpresa.asc().nullsLast().op("int2_ops")),
	index("idx_respuestas_nps_producto").using("btree", table.npsProducto.asc().nullsLast().op("int2_ops")),
	index("idx_respuestas_regalo_estado").using("btree", table.regaloEstado.asc().nullsLast().op("enum_ops")),
	index("idx_respuestas_tipo_maquina").using("btree", table.tipoMaquina.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.encuestaId],
			foreignColumns: [encuestas.id],
			name: "respuestas_encuesta_id_fkey"
		}).onDelete("restrict"),
	unique("respuestas_encuesta_id_key").on(table.encuestaId),
	check("respuestas_nps_producto_check", sql`(nps_producto >= 0) AND (nps_producto <= 10)`),
	check("respuestas_nps_empresa_check", sql`(nps_empresa >= 0) AND (nps_empresa <= 10)`),
	check("respuestas_nps_concesionario_check", sql`(nps_concesionario >= 0) AND (nps_concesionario <= 10)`),
	check("respuestas_calificacion_entrega_presentacion_check", sql`(calificacion_entrega_presentacion >= 1) AND (calificacion_entrega_presentacion <= 10)`),
	check("respuestas_calificacion_puesta_marcha_check", sql`(calificacion_puesta_marcha >= 1) AND (calificacion_puesta_marcha <= 10)`),
	check("respuestas_calificacion_capacitacion_check", sql`(calificacion_capacitacion >= 1) AND (calificacion_capacitacion <= 10)`),
	check("respuestas_calificacion_funcionamiento_general_check", sql`(calificacion_funcionamiento_general >= 1) AND (calificacion_funcionamiento_general <= 10)`),
	check("respuestas_calificacion_tecnico_check", sql`(calificacion_tecnico >= 1) AND (calificacion_tecnico <= 10)`),
	check("respuestas_canal_respuesta_check", sql`canal_respuesta = ANY (ARRAY['mensaje'::text, 'llamado'::text])`),
	check("respuestas_calificacion_funcionamiento_anual_check", sql`(calificacion_funcionamiento_anual >= 1) AND (calificacion_funcionamiento_anual <= 10)`),
	check("respuestas_calificacion_resolucion_problemas_check", sql`(calificacion_resolucion_problemas >= 1) AND (calificacion_resolucion_problemas <= 10)`),
	check("respuestas_cumplimiento_expectativas_check", sql`(cumplimiento_expectativas >= 1) AND (cumplimiento_expectativas <= 10)`),
	check("respuestas_conformidad_acompanamiento_garantia_check", sql`(conformidad_acompanamiento_garantia >= 1) AND (conformidad_acompanamiento_garantia <= 10)`),
	check("respuestas_calificacion_tiempo_respuesta_urgente_check", sql`(calificacion_tiempo_respuesta_urgente >= 1) AND (calificacion_tiempo_respuesta_urgente <= 10)`),
	check("respuestas_calificacion_resolucion_problema_garantia_check", sql`(calificacion_resolucion_problema_garantia >= 1) AND (calificacion_resolucion_problema_garantia <= 10)`),
]);

export const campanas = pgTable("campanas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: text().notNull(),
	fecha: date().default(sql`CURRENT_DATE`).notNull(),
	estado: campanaEstado().default('activa').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	tipoEncuestaId: uuid("tipo_encuesta_id").notNull(),
}, (table) => [
	index("idx_campanas_estado").using("btree", table.estado.asc().nullsLast().op("enum_ops")),
	index("idx_campanas_fecha").using("btree", table.fecha.asc().nullsLast().op("date_ops")),
	index("idx_campanas_tipo_encuesta").using("btree", table.tipoEncuestaId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tipoEncuestaId],
			foreignColumns: [tiposEncuesta.id],
			name: "campanas_tipo_encuesta_id_fkey"
		}),
]);

export const encuestas = pgTable("encuestas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clienteId: uuid("cliente_id").notNull(),
	campanaId: uuid("campana_id").notNull(),
	token: uuid().defaultRandom().notNull(),
	estado: encuestaEstado().default('pendiente').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	comentarioSinRespuesta: text("comentario_sin_respuesta"),
	marcadoSinRespuestaAt: timestamp("marcado_sin_respuesta_at", { withTimezone: true, mode: 'string' }),
	marcadoSinRespuestaPor: uuid("marcado_sin_respuesta_por"),
}, (table) => [
	index("idx_encuestas_campana_id").using("btree", table.campanaId.asc().nullsLast().op("uuid_ops")),
	index("idx_encuestas_cliente_id").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
	index("idx_encuestas_estado").using("btree", table.estado.asc().nullsLast().op("enum_ops")),
	index("idx_encuestas_marcado_sin_respuesta_at").using("btree", table.marcadoSinRespuestaAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(marcado_sin_respuesta_at IS NOT NULL)`),
	index("idx_encuestas_marcado_sin_respuesta_por").using("btree", table.marcadoSinRespuestaPor.asc().nullsLast().op("uuid_ops")).where(sql`(marcado_sin_respuesta_por IS NOT NULL)`),
	index("idx_encuestas_token").using("btree", table.token.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [clientes.id],
			name: "encuestas_cliente_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.campanaId],
			foreignColumns: [campanas.id],
			name: "encuestas_campana_id_fkey"
		}).onDelete("restrict"),
	unique("unique_cliente_campana").on(table.clienteId, table.campanaId),
	unique("encuestas_token_key").on(table.token),
]);

export const systemConfig = pgTable("system_config", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	diasNotificacionInicial: smallint("dias_notificacion_inicial").default(2).notNull(),
	diasNotificacionRecordatorio: smallint("dias_notificacion_recordatorio").default(2).notNull(),
	emailsNotificacion: text("emails_notificacion").array().default([""]).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	diasHastaLlamado: smallint("dias_hasta_llamado").default(2).notNull(),
	emailsRambla: text("emails_rambla").array().default([""]).notNull(),
}, (table) => [
	check("system_config_dias_notificacion_inicial_check", sql`dias_notificacion_inicial > 0`),
	check("system_config_dias_notificacion_recordatorio_check", sql`dias_notificacion_recordatorio > 0`),
	check("system_config_dias_hasta_llamado_check", sql`dias_hasta_llamado > 0`),
]);

export const notificaciones = pgTable("notificaciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tipo: notificacionTipo().notNull(),
	titulo: text().notNull(),
	mensaje: text().notNull(),
	leida: boolean().default(false).notNull(),
	paraRol: text("para_rol").notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notificaciones_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_notificaciones_para_rol_leida").using("btree", table.paraRol.asc().nullsLast().op("text_ops"), table.leida.asc().nullsLast().op("text_ops")),
	check("notificaciones_para_rol_check", sql`para_rol = ANY (ARRAY['admin'::text, 'rambla'::text])`),
]);

export const plantillasWhatsapp = pgTable("plantillas_whatsapp", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: text().notNull(),
	tipo: text().notNull(),
	lineas: text().array().default([""]).notNull(),
	rutaImagen: text("ruta_imagen"),
	activa: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_plantillas_whatsapp_activa").using("btree", table.activa.asc().nullsLast().op("bool_ops")),
	index("idx_plantillas_whatsapp_tipo").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
	check("plantillas_whatsapp_tipo_check", sql`tipo = ANY (ARRAY['inicial'::text, 'recordatorio'::text, 'personalizado'::text])`),
]);

export const enviosWhatsappJobs = pgTable("envios_whatsapp_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	campanaId: uuid("campana_id").notNull(),
	plantillaId: uuid("plantilla_id").notNull(),
	estado: text().default('pendiente').notNull(),
	totalContactos: integer("total_contactos").default(0).notNull(),
	enviados: integer().default(0).notNull(),
	errores: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_whatsapp_jobs_campana").using("btree", table.campanaId.asc().nullsLast().op("uuid_ops")),
	index("idx_whatsapp_jobs_estado").using("btree", table.estado.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.campanaId],
			foreignColumns: [campanas.id],
			name: "envios_whatsapp_jobs_campana_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.plantillaId],
			foreignColumns: [plantillasWhatsapp.id],
			name: "envios_whatsapp_jobs_plantilla_id_fkey"
		}).onDelete("restrict"),
	check("envios_whatsapp_jobs_estado_check", sql`estado = ANY (ARRAY['pendiente'::text, 'en_progreso'::text, 'completado'::text, 'error'::text, 'interrumpido'::text])`),
]);

export const enviosWhatsappDetalle = pgTable("envios_whatsapp_detalle", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: uuid("job_id").notNull(),
	encuestaId: uuid("encuesta_id").notNull(),
	celular: text().notNull(),
	nombre: text().notNull(),
	urlEncuesta: text("url_encuesta").notNull(),
	estado: text().default('pendiente').notNull(),
	enviadoAt: timestamp("enviado_at", { withTimezone: true, mode: 'string' }),
	errorMensaje: text("error_mensaje"),
}, (table) => [
	index("idx_whatsapp_detalle_estado").using("btree", table.estado.asc().nullsLast().op("text_ops")),
	index("idx_whatsapp_detalle_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [enviosWhatsappJobs.id],
			name: "envios_whatsapp_detalle_job_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.encuestaId],
			foreignColumns: [encuestas.id],
			name: "envios_whatsapp_detalle_encuesta_id_fkey"
		}).onDelete("restrict"),
	check("envios_whatsapp_detalle_estado_check", sql`estado = ANY (ARRAY['pendiente'::text, 'enviado'::text, 'error'::text])`),
]);

export const emailErrores = pgTable("email_errores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	destinatarios: text().array().default([""]).notNull(),
	asunto: text().notNull(),
	errorMensaje: text("error_mensaje").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_email_errores_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const encuestaMedidas = pgTable("encuesta_medidas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	encuestaId: uuid("encuesta_id").notNull(),
	comentario: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_encuesta_medidas_created_by").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")).where(sql`(created_by IS NOT NULL)`),
	index("idx_encuesta_medidas_encuesta_id").using("btree", table.encuestaId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.encuestaId],
			foreignColumns: [encuestas.id],
			name: "encuesta_medidas_encuesta_id_fkey"
		}).onDelete("cascade"),
]);

export const tiposEncuesta = pgTable("tipos_encuesta", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: text().notNull(),
	slug: text().notNull(),
	activo: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	enviaRegalo: boolean("envia_regalo").default(false).notNull(),
	config: jsonb(),
	introduccion: text(),
	preguntas: jsonb(),
}, (table) => [
	unique("tipos_encuesta_slug_key").on(table.slug),
]);
export const vEncuestasCompletas = pgView("v_encuestas_completas", {	id: uuid(),
	token: uuid(),
	estado: encuestaEstado(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	clienteNombre: text("cliente_nombre"),
	clienteTelefono: text("cliente_telefono"),
	concesionario: text(),
	campanaNombre: text("campana_nombre"),
	campanaId: uuid("campana_id"),
	npsProducto: smallint("nps_producto"),
	npsEmpresa: smallint("nps_empresa"),
	npsConcesionario: smallint("nps_concesionario"),
	fechaRespuesta: timestamp("fecha_respuesta", { withTimezone: true, mode: 'string' }),
}).with({"securityInvoker":true}).as(sql`SELECT e.id, e.token, e.estado, e.created_at, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.concesionario, ca.nombre AS campana_nombre, ca.id AS campana_id, r.nps_producto, r.nps_empresa, r.nps_concesionario, r.fecha_respuesta FROM encuestas e JOIN clientes c ON e.cliente_id = c.id JOIN campanas ca ON e.campana_id = ca.id LEFT JOIN respuestas r ON r.encuesta_id = e.id`);

export const vNpsPorCampana = pgView("v_nps_por_campana", {	campanaId: uuid("campana_id"),
	campanaNombre: text("campana_nombre"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalRespuestas: bigint("total_respuestas", { mode: "number" }),
	avgNpsProducto: numeric("avg_nps_producto"),
	avgNpsEmpresa: numeric("avg_nps_empresa"),
	avgNpsConcesionario: numeric("avg_nps_concesionario"),
	npsEmpresaScore: numeric("nps_empresa_score"),
}).with({"securityInvoker":true}).as(sql`SELECT ca.id AS campana_id, ca.nombre AS campana_nombre, count(r.id) AS total_respuestas, round(avg(r.nps_producto), 2) AS avg_nps_producto, round(avg(r.nps_empresa), 2) AS avg_nps_empresa, round(avg(r.nps_concesionario), 2) AS avg_nps_concesionario, round(count( CASE WHEN r.nps_empresa >= 9 THEN 1 ELSE NULL::integer END)::numeric / NULLIF(count(r.id), 0)::numeric * 100::numeric - count( CASE WHEN r.nps_empresa <= 6 THEN 1 ELSE NULL::integer END)::numeric / NULLIF(count(r.id), 0)::numeric * 100::numeric, 1) AS nps_empresa_score FROM campanas ca LEFT JOIN encuestas e ON e.campana_id = ca.id LEFT JOIN respuestas r ON r.encuesta_id = e.id GROUP BY ca.id, ca.nombre`);

export const vRespuestasRambla = pgView("v_respuestas_rambla", {	id: uuid(),
	encuestaId: uuid("encuesta_id"),
	npsProducto: smallint("nps_producto"),
	npsEmpresa: smallint("nps_empresa"),
	npsConcesionario: smallint("nps_concesionario"),
	comentarioProducto: text("comentario_producto"),
	comentarioEmpresa: text("comentario_empresa"),
	comentarioGeneral: text("comentario_general"),
	fechaRespuesta: timestamp("fecha_respuesta", { withTimezone: true, mode: 'string' }),
	nombreApellido: text("nombre_apellido"),
	calleNumero: text("calle_numero"),
	pisoDepartamento: text("piso_departamento"),
	localidad: text(),
	codigoPostal: text("codigo_postal"),
	provincia: text(),
	email: text(),
	telefono: text(),
	concesionarioSede: text("concesionario_sede"),
	maquinaModelo: text("maquina_modelo"),
	nombreFirmaFactura: text("nombre_firma_factura"),
	calificacionEntregaPresentacion: smallint("calificacion_entrega_presentacion"),
	calificacionPuestaMarcha: smallint("calificacion_puesta_marcha"),
	calificacionCapacitacion: smallint("calificacion_capacitacion"),
	calificacionFuncionamientoGeneral: smallint("calificacion_funcionamiento_general"),
	calificacionTecnico: smallint("calificacion_tecnico"),
	tipoMaquina: tipoMaquinaEnum("tipo_maquina"),
	regaloEstado: regaloEstado("regalo_estado"),
	comentarioConcesionario: text("comentario_concesionario"),
	canalRespuesta: text("canal_respuesta"),
	numeroSeguimiento: text("numero_seguimiento"),
	fechaSeguimiento: timestamp("fecha_seguimiento", { withTimezone: true, mode: 'string' }),
	fechaEnvio: timestamp("fecha_envio", { withTimezone: true, mode: 'string' }),
	calificacionFuncionamientoAnual: smallint("calificacion_funcionamiento_anual"),
	tuvoProblemasTecnicos: boolean("tuvo_problemas_tecnicos"),
	calificacionResolucionProblemas: smallint("calificacion_resolucion_problemas"),
	comentarioProblemas: text("comentario_problemas"),
}).with({"securityInvoker":true}).as(sql`SELECT r.id, r.encuesta_id, r.nps_producto, r.nps_empresa, r.nps_concesionario, r.comentario_producto, r.comentario_empresa, r.comentario_general, r.fecha_respuesta, r.nombre_apellido, r.calle_numero, r.piso_departamento, r.localidad, r.codigo_postal, r.provincia, r.email, r.telefono, r.concesionario_sede, r.maquina_modelo, r.nombre_firma_factura, r.calificacion_entrega_presentacion, r.calificacion_puesta_marcha, r.calificacion_capacitacion, r.calificacion_funcionamiento_general, r.calificacion_tecnico, r.tipo_maquina, r.regalo_estado, r.comentario_concesionario, r.canal_respuesta, r.numero_seguimiento, r.fecha_seguimiento, r.fecha_envio, r.calificacion_funcionamiento_anual, r.tuvo_problemas_tecnicos, r.calificacion_resolucion_problemas, r.comentario_problemas FROM respuestas r JOIN encuestas e ON e.id = r.encuesta_id JOIN campanas ca ON ca.id = e.campana_id JOIN tipos_encuesta te ON te.id = ca.tipo_encuesta_id WHERE te.envia_regalo = true`);