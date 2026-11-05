// Mantén esta versión sincronizada con versionName en android/app/build.gradle.
const APP_VERSION = '1.0.0';
const VERSION_URL = 'https://bibliaquiz.pe/version.json';
const APK_HOST = 'bibliaquiz.pe';

const updateText = {
  es: {
    title: '¡Hay una nueva versión!',
    message: 'Descarga la actualización para disfrutar las mejoras.',
    download: 'Descargar actualización',
    close: 'Cerrar aviso',
  },
  en: {
    title: 'A new version is available!',
    message: 'Download the update to enjoy the latest improvements.',
    download: 'Download update',
    close: 'Close update notice',
  },
  qu: {
    title: 'Musuq versiónmi kan!',
    message: 'Allinchasqkunata tarinaykipaq musuqchasqta uraykachiy.',
    download: 'Musuqchasqta uraykachiy',
    close: 'Willakuyta wisqay',
  },
};

function parseVersion(version) {
  if (typeof version !== 'string' || !/^\d+(?:\.\d+){1,2}$/.test(version)) {
    return null;
  }
  return version.split('.').map(Number);
}

function isNewerVersion(candidate, installed) {
  const remoteParts = parseVersion(candidate);
  const installedParts = parseVersion(installed);
  if (!remoteParts || !installedParts) return false;

  for (let index = 0; index < 3; index += 1) {
    const remotePart = remoteParts[index] || 0;
    const installedPart = installedParts[index] || 0;
    if (remotePart !== installedPart) return remotePart > installedPart;
  }
  return false;
}

function showUpdateNotice(update) {
  const language = localStorage.getItem('lang') || 'es';
  const text = updateText[language] || updateText.es;
  const backdrop = document.getElementById('appUpdateNotice');
  const closeButton = document.getElementById('appUpdateClose');
  const title = document.getElementById('appUpdateTitle');
  const message = document.getElementById('appUpdateMessage');
  const version = document.getElementById('appUpdateVersion');
  const download = document.getElementById('appUpdateDownload');

  title.textContent = text.title;
  message.textContent = update.message || text.message;
  version.textContent = `Versión ${update.version}`;
  download.textContent = text.download;
  download.href = update.apkUrl;
  download.target = '_blank';
  closeButton.setAttribute('aria-label', text.close);
  backdrop.hidden = false;
  closeButton.focus();
}

async function checkForAndroidUpdate() {
  if (!navigator.onLine
      || !window.Capacitor?.isNativePlatform?.()
      || window.Capacitor.getPlatform?.() !== 'android') {
    return;
  }

  try {
    const response = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`El servidor respondió ${response.status}`);

    const update = await response.json();
    const apkUrl = new URL(update.apkUrl);
    if (apkUrl.protocol !== 'https:'
        || apkUrl.hostname !== APK_HOST
        || !apkUrl.pathname.toLowerCase().endsWith('.apk')) {
      throw new Error('El enlace del APK debe ser HTTPS y pertenecer a bibliaquiz.pe');
    }

    if (isNewerVersion(update.version, APP_VERSION)) {
      showUpdateNotice({ ...update, apkUrl: apkUrl.href });
    }
  } catch (error) {
    console.info('No se pudo comprobar si hay una actualización:', error);
  }
}

const closeUpdateNotice = () => {
  document.getElementById('appUpdateNotice').hidden = true;
};

document.getElementById('appUpdateClose').addEventListener('click', closeUpdateNotice);
document.getElementById('appUpdateNotice').addEventListener('click', event => {
  if (event.target.id === 'appUpdateNotice') closeUpdateNotice();
});

if (navigator.onLine) {
  checkForAndroidUpdate();
} else {
  window.addEventListener('online', checkForAndroidUpdate, { once: true });
}
