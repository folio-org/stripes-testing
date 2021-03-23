import {
  Button,
  Checkbox,
  MultiColumnList,
  TextField,
} from '../interactors';

// eslint-disable-next-line
export const checkIn = barcode => ({
  description: `Check in item ${barcode}`,
  action: async () => {
    await TextField({ id: 'input-item-barcode' }).fillIn(barcode);
    await Button('Enter').click();
    await Button({ text: 'Check in', button: true }).click();
    await Checkbox('Print slip').click();
    await Button('Close').click();

    await MultiColumnList({ id: 'list-items-checked-in' }).exists();
  },
});
