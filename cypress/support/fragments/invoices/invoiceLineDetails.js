import {
  Button,
  Checkbox,
  KeyValue,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneHeader,
  Section,
  including,
} from '../../../../interactors';
import InvoiceLineEditForm from './invoiceLineEditForm';
import TransactionDetails from '../finance/transactions/transactionDetails';

// invoice lines details
const invoiceLineDetailsPane = Pane({ id: 'pane-invoiceLineDetails' });
const invoiceLineDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-invoiceLineDetails' });

// invoice lines details header
const actionsButton = Button('Actions');
const editButton = Button('Edit');

// invoice lines details information
const informationSection = invoiceLineDetailsPane.find(Section({ id: 'invoiceLineInformation' }));
const fundDistributionsSection = invoiceLineDetailsPane.find(
  Section({ id: 'invoiceLineFundDistribution' }),
);

export default {
  openInvoiceLineEditForm() {
    cy.do([invoiceLineDetailsPaneHeader.find(actionsButton).click(), editButton.click()]);
    InvoiceLineEditForm.waitLoading();

    return InvoiceLineEditForm;
  },
  checkInvoiceLineDetails(invoiceLine) {
    cy.expect([
      invoiceLineDetailsPane.exists(),
      informationSection
        .find(KeyValue('Description'))
        .has({ value: including(invoiceLine.description) }),
      informationSection.find(KeyValue('Status')).has({ value: including(invoiceLine.status) }),
      informationSection.find(Checkbox({ disabled: true, text: 'Release encumbrance' })).exists(),
    ]);
  },
  checkFundDistibutionTableContent(records = []) {
    records.forEach((record, index) => {
      cy.expect([
        fundDistributionsSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 0 }))
          .has({ content: including(record.name) }),
        fundDistributionsSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 5 }))
          .has({ content: including(record.encumbrance) }),
      ]);
    });
  },
  openEncumbrancePane(index = 0) {
    const budget = fundDistributionsSection
      .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
      .find(MultiColumnListCell({ columnIndex: 5 }))
      .find(Link());

    cy.do([budget.perform((el) => el.removeAttribute('target')), budget.click()]);

    TransactionDetails.waitLoading();

    return TransactionDetails;
  },
  getInvoiceLinesViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'invoice/invoice-lines',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  deleteInvoiceLineViaApi(invoiceLineId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `invoice/invoice-lines/${invoiceLineId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  deleteInvoiceLinesByInvoiceIdViaApi(invoiceId) {
    return this.getInvoiceLinesViaApi({ query: `invoiceId="${invoiceId}"` }).then(
      ({ invoiceLines }) => {
        invoiceLines.forEach(({ id }) => this.deleteInvoiceLineViaApi(id));
      },
    );
  },
};
