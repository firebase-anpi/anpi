/**
 * 標準Date型のYYYY/MM/DD固定フォーマットへの変換
 * @param date
 * @returns {string}
 */
export function toDateStr(date: Date | undefined) {
  if (!!date) {
    return (
      date.getFullYear() +
      '/' +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      '/' +
      ('0' + date.getDate()).slice(-2)
    );
  } else {
    return '未設定';
  }
}
