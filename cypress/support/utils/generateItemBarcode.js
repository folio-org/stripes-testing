export default function generateItemBarcode() {
  return (Number(new Date()) - Math.floor(Math.random() * 10000)).toString();
}
