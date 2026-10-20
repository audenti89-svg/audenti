# 🚀 GUÍA DE INICIO RÁPIDO - AUDENTI CRM & OPENWA

Sigue estos pasos cada vez que enciendas la computadora para que todo el sistema nervioso (IA + WhatsApp + CRM) funcione correctamente.

## PASO 1: Iniciar el Servidor de WhatsApp (OpenWA)
El servidor de OpenWA es el "puente" que permite que la IA envíe y reciba mensajes.

1. Abre una terminal (PowerShell o CMD).
2. Entra a la carpeta de OpenWA:
   `cd "D:\Antigravity 2027\Odontologia\AppWeb CRM\audenti\OpenWA-main\OpenWA-main"`
3. Ejecuta el servidor:
   `npm run start:prod`
   *(Si es la primera vez que lo haces, primero ejecuta `npm install`)*.
4. **IMPORTANTE:** Deja esta ventana abierta. Si la cierras, WhatsApp dejará de funcionar.

## PASO 2: Iniciar la Aplicación Web (Next.js)
Este es el cerebro donde vive la Dra. Aura y el CRM.

1. Abre OTRA terminal.
2. Entra a la carpeta principal:
   `cd "D:\Antigravity 2027\Odontologia\AppWeb CRM\audenti"`
3. Ejecuta la aplicación:
   `npm run dev`
4. Abre tu navegador en: `http://localhost:3000`

## PASO 3: Verificar Conexión de WhatsApp
1. Entra al panel de control de OpenWA en: `http://localhost:2785`
2. Asegúrate de que la sesión `audenti_default` esté en estado **WORKING**. 
3. Si dice **SCAN_QR_CODE**, escanea el código con tu celular (WhatsApp $\rightarrow$ Dispositivos vinculados).

---
**💡 TIP PRO:** Si quieres que esto sea automático, puedes crear un archivo `.bat` en tu escritorio que abra ambas terminales con un solo clic. Si lo deseas, puedo escribírtelo.
