import { Button, including, Modal, MultiSelect, RadioButton } from '../../../../../interactors';
import { EXPORT_INVOICE_FIELDS, EXPORT_INVOICE_LINE_FIELDS } from '../../../constants';
import FileManager from '../../../utils/fileManager';
import InteractorsTools from '../../../utils/interactorsTools';

const TITLE = 'Export settings';
const MESSAGE =
  'This export could take a few minutes. If you reload or close the page the export will not be completed. Once the file is ready it could take another minute for your browser to finish downloading the file. You can continue to work with invoices and invoice lines in a different browser tab if needed.';

const exportSettingsModal = Modal({
  title: TITLE,
  message: including(MESSAGE),
});

const cancelButton = exportSettingsModal.find(Button('Cancel'));
const exportButton = exportSettingsModal.find(Button('Export'));

const allInvoiceFieldsRadioButton = RadioButton({
  name: 'invoiceExport',
  ariaLabel: 'Export all invoice fields',
});
const selectedInvoiceRadioButton = RadioButton({
  name: 'invoiceExport',
  ariaLabel: 'Export selected invoice fields',
});
const allInvoiceLineFieldsRadioButton = RadioButton({
  name: 'invoiceLineExport',
  ariaLabel: 'Export all invoice line fields',
});
const selectedInvoiceLineFieldsRadioButton = RadioButton({
  name: 'invoiceLineExport',
  ariaLabel: 'Export selected invoice line fields',
});

const invoiceFieldsSelection = exportSettingsModal.find(
  MultiSelect({ id: including('multiselect-:rg:') }),
);
const invoiceLineFieldsSelection = exportSettingsModal.find(
  MultiSelect({ id: including('multiselect-:ri:') }),
);

const EXPORT_STARTED_SUCCESSFULLY_TOAST_MESSAGE = 'Export has been started successfully';

const handleListRow = (jsonData, columnsSet, row, i) => {
  const fileRowData = jsonData[i];

  Object.entries(row).forEach(([key, value]) => {
    if (columnsSet.has(key)) {
      const cellValue = fileRowData[key].toString();
      expect(cellValue).to.equal(value === undefined ? '' : value.toString());
    }
  });
};

const defaultSortFileData = (a, b) => {
  return (
    a[EXPORT_INVOICE_FIELDS.FOLIO_INVOICE_NO]
      .toString()
      .localeCompare(b[EXPORT_INVOICE_FIELDS.FOLIO_INVOICE_NO].toString()) ||
    a[EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_NUMBER]
      .toString()
      .localeCompare(b[EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_NUMBER].toString())
  );
};

export default {
  waitLoading() {
    cy.expect([
      allInvoiceFieldsRadioButton.exists(),
      allInvoiceFieldsRadioButton.is({ checked: true }),
      selectedInvoiceRadioButton.exists(),
      selectedInvoiceRadioButton.is({ checked: false }),
      allInvoiceLineFieldsRadioButton.exists(),
      allInvoiceLineFieldsRadioButton.is({ checked: true }),
      selectedInvoiceLineFieldsRadioButton.exists(),
      selectedInvoiceLineFieldsRadioButton.is({ checked: false }),
      cancelButton.is({ disabled: false, visible: true }),
      exportButton.is({ disabled: false, visible: true }),
    ]);
  },

  exportResults() {
    cy.do(exportButton.click());
    InteractorsTools.checkCalloutMessage(EXPORT_STARTED_SUCCESSFULLY_TOAST_MESSAGE);
    cy.expect(exportSettingsModal.absent());
  },

  assertExportedCSVFile({ content, expectedFields, fileMask, sortFileData = defaultSortFileData }) {
    const expectedFieldsSet = new Set(
      expectedFields || [
        ...Object.values(EXPORT_INVOICE_FIELDS),
        ...Object.values(EXPORT_INVOICE_LINE_FIELDS),
      ],
    );

    FileManager.convertCsvToJson(fileMask).then((jsonData) => {
      const headersSet = new Set(Object.keys(jsonData[0]));
      const sortedJsonData =
        typeof sortFileData === 'function' ? jsonData.sort(sortFileData) : jsonData;

      cy.expect(expectedFieldsSet.difference(headersSet).size).to.equal(0);

      if (content) {
        cy.expect(sortedJsonData.length).to.equal(content.length);
        content.forEach(handleListRow.bind(null, sortedJsonData, expectedFieldsSet));
      }
    });
  },

  selectInvoiceFields(fields = []) {
    cy.do(selectedInvoiceRadioButton.click());
    cy.do(invoiceFieldsSelection.choose(fields));
  },

  selectInvoiceLineFields(fields = []) {
    cy.do(selectedInvoiceLineFieldsRadioButton.click());
    cy.do(invoiceLineFieldsSelection.choose(fields));
  },
};
