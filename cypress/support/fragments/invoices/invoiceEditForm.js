import { Button, Section, TextArea } from '../../../../interactors';

const invoiceEditFormRoot = Section({ id: 'pane-invoice-form' });
const informationSection = invoiceEditFormRoot.find(Section({ id: 'invoiceForm-information' }));
const cancelButtom = Button('Cancel');
const saveButtom = Button('Save & close');

const infoFields = {
  fiscalYear: informationSection.find(Button({ id: 'invoice-fiscal-year' })),
  note: informationSection.find(TextArea({ id: 'note' })),
};

const buttons = {
  'Fiscal year': infoFields.fiscalYear,
  Cancel: cancelButtom,
  'Save & close': saveButtom,
};

export default {
  waitLoading() {
    cy.expect(invoiceEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  fillInvoiceFields({ note }) {
    if (note) {
      cy.do(infoFields.note.fillIn(note));
      cy.expect(infoFields.note.has({ value: note }));
    }
  },
  clickCancelButton() {
    cy.do(cancelButtom.click());
    cy.expect(invoiceEditFormRoot.absent());
  },
  clickSaveButton() {
    cy.expect(saveButtom.has({ disabled: false }));
    cy.do(saveButtom.click());
    cy.expect(invoiceEditFormRoot.absent());
    // wait for changes to be applied
    cy.wait(2000);
  },
};
