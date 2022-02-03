import uuid from 'uuid';
import { getCurrentDate } from '../../utils/dateTools';
import { getRandomInvoiceNumber } from '../finance/financeHelper';

export default {
  defaultUiInvoice : {
    id: uuid(),
    status: 'Open',
    invoiceDate: getCurrentDate(),
    vendorName: 'Amazon.com',
    accountingCode: '',
    batchGroup: '',
    invoiceNumber: getRandomInvoiceNumber()
  }
};
