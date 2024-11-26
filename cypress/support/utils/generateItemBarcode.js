export default function generateItemBarcode() {
  return (Number(new Date()) - Math.floor(Math.random() * 100)).toString();
}
