export default function getCurrentDate() {
  const currentDate = new Date();
  const replacer = (val) => String(val).padStart(2, 0);
  return `${replacer(currentDate.getMonth() + 1)}/${replacer(currentDate.getDate())}/${currentDate.getFullYear()}`;
}
