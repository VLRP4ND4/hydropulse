import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import "./dataDisclaimer.scss";

const OFFICIAL_SOURCE_URL = "https://ykuthydromet.ru/";

const DataDisclaimer = () => (
  <aside className="dataDisclaimer" role="note" aria-label="Статус данных HydroPulse">
    <WarningAmberRoundedIcon className="dataDisclaimerIcon" aria-hidden="true" />
    <div>
      <strong>Предварительные данные</strong>
      <p>
        Данные HydroPulse носят информационно-справочный характер. Они не являются официальной
        гидрометеорологической информацией, прогнозом или экстренным предупреждением и не должны
        использоваться как единственное основание для решений, связанных с безопасностью. Официальные
        данные и предупреждения публикует{" "}
        <a href={OFFICIAL_SOURCE_URL} target="_blank" rel="noreferrer">
          ФГБУ «Якутское УГМС»
        </a>
        .
      </p>
    </div>
  </aside>
);

export default DataDisclaimer;
