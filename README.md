# Juego de Trivia Bíblica

Un juego interactivo de preguntas y respuestas sobre la Biblia, diseñado para educar y divertir. Incluye modos de juego, estrellas, monedas y características PWA para una experiencia completa.

## Características
- Preguntas bíblicas en español e inglés
- Modos: Quiz, Supervivencia, Mapa de Niveles
- Sistema de recompensas con estrellas y monedas
- Funcionamiento offline (PWA)
- Notificaciones y vibración háptica
- Compartir resultados

## Instalación
1. Clona o descarga el proyecto.
2. Abre `index.html` en un navegador moderno.
3. Para PWA completa, sirve desde un servidor HTTPS.

## Generar APK para Android con Capacitor

### Requisitos
- Node.js LTS (20 o posterior) y npm.
- Android Studio con el Android SDK instalado. Android Studio incluye un JDK que puedes seleccionar en la configuración de Gradle.

### Primera vez
Desde PowerShell, en la carpeta del proyecto:

```powershell
npm.cmd install
npm.cmd run build
npx.cmd cap add android
npm.cmd run android:sync
npx.cmd cap open android
```

En Android Studio, espera a que termine la sincronización de Gradle y selecciona **Build > Build Bundle(s) / APK(s) > Build APK(s)**. El APK de depuración se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.

### Después de cambiar la web

```powershell
npm.cmd run android:sync
npm.cmd run android:open
```

La carpeta `www` se genera automáticamente a partir de los HTML, estilos, scripts, preguntas, iconos y audios del proyecto. Para Android, `www/index.html` se prepara desde `juego.html`, de modo que la app abra directamente en la pantalla con el texto del día y el botón **¡Jugar!**. La portada web original `index.html` se conserva en el proyecto. No edites directamente `www`: vuelve a ejecutar `npm.cmd run android:sync` después de hacer cambios.

## Aviso de nuevas versiones de Android

La app Android consulta `https://bibliaquiz.pe/version.json` al abrirse y si hay conexión. Si el campo `version` es superior a la versión instalada, muestra un aviso con el enlace del campo `apkUrl`. El archivo `version.json` de este proyecto sirve como plantilla y propone publicar el APK en `https://bibliaquiz.pe/descargas/bibliaquiz.apk`.

En cada lanzamiento:

1. Aumenta `versionName` y `versionCode` en `android/app/build.gradle`, y el valor `APP_VERSION` en `js/update-check.js`.
2. Genera y firma el APK de lanzamiento; súbelo a `https://bibliaquiz.pe/descargas/bibliaquiz.apk`.
3. Actualiza `version` en `version.json` para que coincida con el APK publicado.
4. Publica `version.json` en la raíz de `https://bibliaquiz.pe/`. El servidor debe responder con `Content-Type: application/json` y permitir CORS para que la app (`https://localhost`) pueda leerlo (`Access-Control-Allow-Origin: *`).

El botón abre el enlace HTTPS del APK. Android puede pedir permiso para instalar aplicaciones descargadas fuera de Play Store; la persona debe aceptar la instalación. Esta comprobación solo avisa y descarga el APK: no instala actualizaciones silenciosamente. La primera instalación con esta función también requiere un APK nuevo.

## Tecnologías
- HTML5, CSS3, JavaScript ES6+
- Service Worker para cache offline
- Web App Manifest para instalación
- Capacitor para la aplicación Android

---

© 2026 Milner Tello Guzman

Todos los derechos reservados.

Este proyecto (juego de trivia bíblica) es propiedad exclusiva del autor.
No se permite copiar, modificar, distribuir ni usar este código
sin autorización expresa del propietario.