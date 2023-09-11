import uuid from 'uuid';
import DateTools from '../../utils/dateTools';
import FinanceHelper from '../finance/financeHelper';

export default {
  defaultUiInvoice: {
    id: uuid(),
    status: 'Open',
    invoiceDate: DateTools.getCurrentDate(),
    vendorName: 'Amazon.com',
    accountingCode: '',
    batchGroup: '',
    invoiceNumber: FinanceHelper.getRandomInvoiceNumber(),
  },
};
