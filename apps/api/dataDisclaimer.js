const DATA_DISCLAIMER_TEXT = [
  "⚠️ Данные HydroPulse предварительные, справочные и не являются официальной гидрометеорологической информацией или экстренным предупреждением.",
  "Официальные данные и предупреждения: ФГБУ «Якутское УГМС» — https://ykuthydromet.ru/",
].join("\n");

function append_data_disclaimer(text) {
  return `${text}\n\n${DATA_DISCLAIMER_TEXT}`;
}

module.exports = {
  DATA_DISCLAIMER_TEXT,
  append_data_disclaimer,
};
