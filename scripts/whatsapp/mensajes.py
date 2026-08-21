import pyautogui as pg
import time
import random
import subprocess
import win32clipboard
from PIL import Image
import io
import os
import sys
import json
import urllib.request
import urllib.parse
from urllib.error import HTTPError, URLError

# ─── Cargar .env ────────────────────────────────────────────────────────────

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_path):
        print("❌ No se encontró el archivo .env. Crealo con PLATAFORMA_URL y WHATSAPP_AGENTE_TOKEN.")
        sys.exit(1)
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                os.environ[key.strip()] = value.strip()

load_env()

PLATAFORMA_URL = os.environ.get('PLATAFORMA_URL', '').rstrip('/')
AGENTE_TOKEN   = os.environ.get('WHATSAPP_AGENTE_TOKEN', '')

if not PLATAFORMA_URL or not AGENTE_TOKEN:
    print("❌ Faltan PLATAFORMA_URL o WHATSAPP_AGENTE_TOKEN en el .env")
    sys.exit(1)

HEADERS = {
    'Authorization': f'Bearer {AGENTE_TOKEN}',
    'Content-Type': 'application/json',
}

# ─── Helpers de la plataforma ───────────────────────────────────────────────
#
# Antes esto hablaba directo con Supabase usando la service_role_key, que es una
# llave con acceso total a la base. Ahora va contra la plataforma, con un token
# que solo abre estos tres endpoints.

def _request(path, data=None, method='GET'):
    url = f"{PLATAFORMA_URL}/api/whatsapp/agente/{path}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            contenido = res.read()
            return json.loads(contenido) if contenido else {}
    except HTTPError as e:
        if e.code == 401:
            print("❌ La plataforma rechazó el token (401). Revisá WHATSAPP_AGENTE_TOKEN en el .env,")
            print("   tiene que ser el mismo que está configurado en el servidor.")
            sys.exit(1)
        if e.code == 404:
            raise
        detalle = e.read().decode(errors='replace')[:200]
        print(f"❌ La plataforma respondió {e.code}: {detalle}")
        raise
    except URLError as e:
        print(f"❌ No se pudo contactar a la plataforma ({PLATAFORMA_URL}): {e.reason}")
        raise

def api_get(path):
    return _request(path)

def api_post(path, data):
    return _request(path, data=data, method='POST')

def reportar_contacto(detalle_id, estado, error=None):
    """
    Avisa cómo salió un contacto. Reintenta: si esto se pierde, el contacto
    queda como pendiente y en la próxima corrida le llega el mensaje de nuevo
    a alguien que ya lo recibió.
    """
    payload = {'estado': estado}
    if error:
        payload['error'] = str(error)[:200]

    for intento in range(3):
        try:
            return api_post(f"contactos/{detalle_id}", payload)
        except Exception as e:
            if intento == 2:
                print(f"⚠️  ATENCIÓN: no se pudo registrar el resultado de este contacto ({e}).")
                print(f"   El mensaje SÍ se mandó, pero la plataforma no se enteró: si relanzás")
                print(f"   el job, a esta persona le va a llegar dos veces. Detalle: {detalle_id}")
                return None
            time.sleep(3)

# ─── Parsear job ID del argumento de URL ────────────────────────────────────

def get_job_id():
    # Puede venir como: whatsapp-sender://run?job=abc123  o directamente abc123
    if len(sys.argv) < 2:
        print("❌ Falta el argumento job. Uso: python mensajes.py --job JOB_ID")
        print("   O lanzado por el protocol handler: whatsapp-sender://run?job=JOB_ID")
        sys.exit(1)

    arg = sys.argv[1]

    if arg.startswith('whatsapp-sender://'):
        parsed = urllib.parse.urlparse(arg)
        params = urllib.parse.parse_qs(parsed.query)
        job_id = params.get('job', [None])[0]
    elif arg == '--job' and len(sys.argv) >= 3:
        job_id = sys.argv[2]
    else:
        job_id = arg

    if not job_id:
        print("❌ No se pudo extraer el job ID del argumento.")
        sys.exit(1)

    return job_id

# ─── Función para copiar imagen ─────────────────────────────────────────────

def enviar_imagen_al_portapapeles(path):
    if not path or not os.path.exists(path):
        return False
    try:
        image = Image.open(path)
        output = io.BytesIO()
        image.convert("RGB").save(output, "BMP")
        data = output.getvalue()[14:]
        output.close()
        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardData(win32clipboard.CF_DIB, data)
        win32clipboard.CloseClipboard()
        return True
    except Exception as e:
        print(f"❌ Error al copiar imagen: {e}")
        return False

# ─── Main ────────────────────────────────────────────────────────────────────

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

def main():
    job_id = get_job_id()
    print(f"🚀 Iniciando job: {job_id}")

    # El job trae los contactos que faltan mandar, con el mensaje ya armado por
    # la plataforma: acá no se renderiza nada.
    try:
        job = api_get(f"jobs/{job_id}")
    except HTTPError as e:
        if e.code == 404:
            print("❌ No se encontró el job.")
            sys.exit(1)
        raise

    contactos  = job['contactos']
    ruta_imagen = job.get('ruta_imagen') or ''

    if not contactos:
        print("✅ No hay contactos pendientes en este job.")
        api_post(f"jobs/{job_id}/estado", {'estado': 'completado'})
        return

    api_post(f"jobs/{job_id}/estado", {'estado': 'en_progreso'})

    total = len(contactos)
    print(f"📋 Contactos pendientes: {total}")

    interrumpido = False

    for i, contacto in enumerate(contactos):
        # Chequear si el job fue detenido desde la plataforma
        if api_get(f"jobs/{job_id}")['estado'] == 'interrumpido':
            print("⏹ Job detenido desde la plataforma. Saliendo...")
            interrumpido = True
            break

        # Pausa larga cada 4 envíos
        if i > 0 and i % 4 == 0:
            espera_larga = random.randint(120, 240)
            print(f"☕ Pausa de seguridad: {espera_larga}s...")
            time.sleep(espera_larga)

        celular = contacto['celular']
        nombre  = contacto['nombre']
        lineas  = contacto['mensaje'].split('\n')

        # 1. Abrir chat
        chat_url = f"https://web.whatsapp.com/send?phone={celular}"
        subprocess.Popen([chrome_path, chat_url])

        # El primer chat tarda más en cargar
        espera_inicial = random.randint(35, 45) if i == 0 else random.randint(25, 35)
        print(f"⏳ [{i+1}/{total}] Cargando chat de {nombre}...")
        time.sleep(espera_inicial)

        # 2. Click en el chat
        pg.moveTo(700 + random.randint(-50, 50), 500 + random.randint(-50, 50), duration=random.uniform(0.8, 1.5))
        pg.click()
        time.sleep(random.uniform(1, 2))

        # 3. Pegar imagen si hay
        tiene_imagen = enviar_imagen_al_portapapeles(ruta_imagen)
        if tiene_imagen:
            pg.hotkey('ctrl', 'v')
            time.sleep(random.uniform(4, 6))

        # 4. Escribir línea por línea
        print(f"✍️ Escribiendo mensaje para {nombre}...")
        try:
            for linea in lineas:
                pg.write(linea, interval=random.uniform(0.02, 0.08))
                pg.hotkey('shift', 'enter')
                time.sleep(random.uniform(0.3, 0.7))

            # Pausa final antes de enviar
            time.sleep(random.uniform(2, 4))
            pg.press('enter')

            reportar_contacto(contacto['id'], 'enviado')
            print(f"✅ Enviado.")

        except Exception as e:
            print(f"❌ Error con {nombre}: {e}")
            reportar_contacto(contacto['id'], 'error', error=e)

        # 5. Cerrar pestaña y esperar
        time.sleep(random.uniform(3, 5))
        pg.hotkey('ctrl', 'w')

        # Esta espera es para separar un envío del siguiente. Después del último
        # no separa nada: solo deja la terminal colgada un minuto. Ojo que esto
        # NO cambia el espaciado entre mensajes, que es lo que evita parecer un
        # robot — solo saca la espera final, cuando ya no queda nadie.
        if i < total - 1:
            espera_entre = random.randint(30, 60)
            print(f"💤 Siguiente en {espera_entre}s...")
            time.sleep(espera_entre)

    # Cerrar el job. Si lo detuvieron, no se lo marca como completado: quedaron
    # contactos sin mandar y decir "completado" sería mentir. La plataforma
    # además lo rechaza por su cuenta, y por eso vale la pena mirar la respuesta.
    estado_pedido = 'interrumpido' if interrumpido else 'completado'
    respuesta = api_post(f"jobs/{job_id}/estado", {'estado': estado_pedido})

    if respuesta.get('estado') == 'completado':
        print("\n🎉 Campaña finalizada con éxito.")
    else:
        print("\n⏹ Job cerrado como interrumpido: quedaron contactos sin enviar.")
        print("   Volvé a ejecutarlo cuando quieras — solo se le manda a quien falta.")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️ Script interrumpido manualmente.")
        # Intentar marcar como interrumpido
        try:
            api_post(f"jobs/{get_job_id()}/estado", {'estado': 'interrumpido'})
        except Exception:
            pass
