import "./table.scss";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

// Старый демонстрационный MUI-компонент из шаблона.
// В рабочем HydroPulse он не участвует: реальные гидропосты показывает StationsTable.
const List = () => {
  const rows = [
    {
      id: 1143155,
      product: "Демо-датчик",
      img: "https://m.media-amazon.com/images/I/81bc8mA3nKL._AC_UY327_FMwebp_QL65_.jpg",
      customer: "Оператор 1",
      date: "1 марта",
      amount: 785,
      method: "Демо",
      status: "Подтверждено",
    },
    {
      id: 2235235,
      product: "Демо-пост",
      img: "https://m.media-amazon.com/images/I/31JaiPXYI8L._AC_UY327_FMwebp_QL65_.jpg",
      customer: "Оператор 2",
      date: "1 марта",
      amount: 900,
      method: "Демо",
      status: "Ожидает",
    },
    {
      id: 2342353,
      product: "Демо-ретранслятор",
      img: "https://m.media-amazon.com/images/I/71kr3WAj1FL._AC_UY327_FMwebp_QL65_.jpg",
      customer: "Оператор 1",
      date: "1 марта",
      amount: 35,
      method: "Демо",
      status: "Ожидает",
    },
    {
      id: 2357741,
      product: "Демо-база",
      img: "https://m.media-amazon.com/images/I/71wF7YDIQkL._AC_UY327_FMwebp_QL65_.jpg",
      customer: "Оператор 3",
      date: "1 марта",
      amount: 920,
      method: "Демо",
      status: "Подтверждено",
    },
    {
      id: 2342355,
      product: "Демо-модуль",
      img: "https://m.media-amazon.com/images/I/81hH5vK-MCL._AC_UY327_FMwebp_QL65_.jpg",
      customer: "Оператор 4",
      date: "1 марта",
      amount: 2000,
      method: "Демо",
      status: "Ожидает",
    },
  ];
  return (
    <TableContainer component={Paper} className="table">
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell className="tableCell">ID</TableCell>
            <TableCell className="tableCell">Объект</TableCell>
            <TableCell className="tableCell">Оператор</TableCell>
            <TableCell className="tableCell">Дата</TableCell>
            <TableCell className="tableCell">Значение</TableCell>
            <TableCell className="tableCell">Источник</TableCell>
            <TableCell className="tableCell">Статус</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="tableCell">{row.id}</TableCell>
              <TableCell className="tableCell">
                <div className="cellWrapper">
                  <img src={row.img} alt="" className="image" />
                  {row.product}
                </div>
              </TableCell>
              <TableCell className="tableCell">{row.customer}</TableCell>
              <TableCell className="tableCell">{row.date}</TableCell>
              <TableCell className="tableCell">{row.amount}</TableCell>
              <TableCell className="tableCell">{row.method}</TableCell>
              <TableCell className="tableCell">
                <span className={`status ${row.status}`}>{row.status}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default List;
