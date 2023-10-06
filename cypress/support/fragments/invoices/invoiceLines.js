import { Checkbox, KeyValue, Pane, Section, including } from '../../../../interactors';

// invoice lines details
const invoiceLineDetailsPane = Pane({ id: 'pane-invoiceLineDetails' });
const informationSection = invoiceLineDetailsPane.find(Section({ id: 'invoiceLineInformation' }));

export default {
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
