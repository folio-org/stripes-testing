import generateItemBarcode from './generateItemBarcode';
import getRandomPostfix from './stringTools';

export default function generateUniqueItemBarcodeWithShift(index = 0) {
  return (generateItemBarcode() - Math.round(getRandomPostfix()) + '').substring(index);
}
