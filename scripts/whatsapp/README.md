# `mensajes.py` — el agente de envío de WhatsApp

Este script **no corre en el servidor**: corre en la PC Windows del operador, y
es el que realmente manda los mensajes. La plataforma solo prepara la lista.

## Por qué vive afuera

No automatiza ninguna API de WhatsApp. Abre Chrome en `web.whatsapp.com`, mueve
el mouse a coordenadas de pantalla, pega la imagen por el portapapeles de Windows
y **tipea el mensaje tecla por tecla**. Necesita una pantalla real, un mouse real
y una sesión de WhatsApp abierta.

Por eso no se puede "mover a un contenedor": para centralizar el envío hay que
reemplazar el emisor, no mudarlo. Ver `docs/06-migracion-self-hosted.md`.

El ritmo (un mensaje cada 30-60s, más una pausa de 2 a 4 minutos cada 4 envíos)
es a propósito, para no parecer un robot. **No tocarlo sin pensarlo dos veces.**

## Cómo obtiene los datos

Antes leía y escribía Supabase directo, con la `service_role_key` en un `.env` en
el escritorio del operador — una llave con acceso total a la base. Ahora habla con
la plataforma, con un token que solo abre tres endpoints:

| Llamada | Para qué |
|---|---|
| `GET  /api/whatsapp/agente/jobs/:id` | El job, y **solo los contactos que faltan**, con el mensaje ya renderizado. También se usa entre contacto y contacto para ver si lo detuvieron. |
| `POST /api/whatsapp/agente/jobs/:id/estado` | Avisar que arrancó o que terminó. |
| `POST /api/whatsapp/agente/contactos/:id` | Reportar cómo salió cada contacto. |

Tres cosas quedaron del lado del servidor a propósito:

- **El mensaje se renderiza allá.** El reemplazo de `{nombre}` y `{url}` estaba
  duplicado acá en Python y en `renderizar.ts`. Ahora hay una sola copia.
- **Los contadores los calcula el servidor**, recontando las filas. Antes el
  script leía el contador y lo escribía +1 en dos llamadas sueltas: un corte en
  el medio los dejaba mintiendo.
- **El GET devuelve solo pendientes**, así relanzar un job cortado nunca le
  vuelve a escribir a quien ya recibió el mensaje.

## Instalación

1. Copiar `mensajes.py` a la carpeta donde ya estaba el anterior.
2. En esa misma carpeta, un `.env`:
   ```
   PLATAFORMA_URL=https://plataforma.crucianelli.site
   WHATSAPP_AGENTE_TOKEN=<el mismo que está en el servidor>
   ```
3. El `launcher.bat` y el protocolo `whatsapp-sender://` no cambian. La pantalla
   `/whatsapp/setup` de la plataforma tiene los pasos.

## Si algo falla

- **`❌ La plataforma rechazó el token (401)`** — el `WHATSAPP_AGENTE_TOKEN` del
  `.env` no coincide con el del servidor.
- **`❌ No se pudo contactar a la plataforma`** — la PC no llega a la URL, o
  `PLATAFORMA_URL` está mal escrita.
- **`⚠️ ATENCIÓN: no se pudo registrar el resultado de este contacto`** — el
  mensaje se mandó pero la plataforma no se enteró (se reintenta 3 veces antes de
  darse por vencido). Importa: si relanzás el job, a esa persona le llega dos
  veces. El aviso incluye el id del contacto para poder marcarlo a mano.

## Un job detenido ya no dice "Completado"

El script cortaba el loop al ver que lo habían detenido, y después marcaba el job
como `completado` igual — la plataforma mostraba campañas cortadas a la mitad como
si hubieran salido enteras. En staging había dos así, de 3 sobre 8 y 1 sobre 10.

Ahora el script reporta `interrumpido`, y además **el servidor lo hace cumplir**:
`marcarJobEstado` se niega a mover un job de `interrumpido` a `completado`, sin
importar lo que le pidan. La guarda está de los dos lados a propósito: una versión
vieja del script no puede volver a romperlo.
