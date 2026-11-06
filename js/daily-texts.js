const dailyTextsUrl = new URL('daily-texts.json', document.currentScript.src);
let dailyTextsPromise;

async function fetchDailyTexts() {
  const response = await fetch(dailyTextsUrl);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el archivo de textos diarios (${response.status})`);
  }

  const texts = await response.json();
  if (!Array.isArray(texts) || texts.length === 0
      || texts.some(item => typeof item.text !== 'string'
        || !item.text.trim()
        || typeof item.ref !== 'string'
        || !item.ref.trim())) {
    throw new Error('El archivo de textos diarios tiene un formato inválido');
  }
  return texts;
}

async function loadDailyTexts() {
  if (!dailyTextsPromise) {
    dailyTextsPromise = fetchDailyTexts()
      .catch(() => new Promise(resolve => setTimeout(resolve, 300))
        .then(fetchDailyTexts))
      .catch(error => {
        dailyTextsPromise = undefined;
        throw error;
      });
  }
  return dailyTextsPromise;
}

window.getDailyTextForDate = async function (date = new Date()) {
  const dailyTexts = await loadDailyTexts();
  const yearStart = Date.UTC(date.getFullYear(), 0, 1);
  const currentDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((currentDay - yearStart) / 86400000) + 1;
  return dailyTexts[dayOfYear % dailyTexts.length];
};
