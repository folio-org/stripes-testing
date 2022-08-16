import { HTML, including, Link } from '@interactors/html';
import { TextField } from 'bigtest';
import { Accordion, Button, Checkbox, Datepicker, MultiColumnList, MultiColumnListCell, MultiColumnListRow, Section, Selection, SelectionList, TextArea } from '../../../../interactors';
import textField from '../../../../interactors/text-field';
import DateTools from '../../utils/dateTools';

const rootSection = Section({ id: 'pane-userdetails' });
const permissionAccordion = Accordion({ id: 'permissionsSection' });
const actionsButton = rootSection.find(Button('Actions'));
const errors = {
  patronHasBlocksInPlace: 'Patron has block(s) in place'
};
const feesFinesAccourdion = rootSection.find(Accordion({ id: 'accountsSection' }));


export default {
  errors,
  openPatronBlocks() {
    cy.do(Accordion({ id: 'patronBlocksSection' }).clickHeader());
  },

  patronBlocksAccordionCovered() {
    cy.expect([
      Section({ id: 'patronBlocksSection' }).find(Button({ id: 'accordion-toggle-button-patronBlocksSection' })).has({ ariaExpanded: 'false' })
    ]);
  },

  openLoans() {
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(Accordion({ id: 'loansSection' }).clickHeader());
    cy.wait('@getLoans');
  },
  openFeeFines() {
    cy.do(feesFinesAccourdion.clickHeader());
  },

  showOpenedLoans() {
    cy.do(Link({ id: 'clickable-viewcurrentloans' }).click());
  },

  createPatronBlock() {
    cy.do([
      Button({ id: 'create-patron-block' }).click()
    ]);
  },

  createAndSaveNewPatronBlock(text) {
    this.openPatronBlocks();
    this.createPatronBlock();
    this.fillDescription(text);
    this.saveAndClose();
  },

  createNewPatronBlock(text) {
    this.openPatronBlocks();
    this.createPatronBlock();
    this.fillDescription(text);
  },

  selectTodayExpirationDate() {
    const today = new Date();
    cy.do(textField({ name: 'expirationDate' }).fillIn(DateTools.getFormattedDate({ date: today }, 'YYYY-MM-DD')));
  },

  openLastUpdatedInfo() {
    cy.do(Button({ role: 'presentation' }).click());
  },

  selectTomorrowExpirationDate() {
    const tomorrow = DateTools.getTomorrowDay();
    cy.do(textField({ name: 'expirationDate' }).fillIn(DateTools.getFormattedDate({ date: tomorrow }, 'YYYY-MM-DD')));
  },

  submitWrongExpirationDate() {
    cy.expect(Datepicker().has('Expiration date must be in the future'));
  },

  submitPatronInformation(text) {
    cy.expect(Accordion({ id: 'patronBlocksSection' })
      .find(MultiColumnList({ id: 'patron-block-mcl' }))
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: text }));
  },

  submitNewBlockPageOpen() {
    cy.expect([
      TextArea({ id: 'patronBlockForm-desc' }).exists(),
      Checkbox({ name: 'borrowing' }).exists,
      Checkbox({ name: 'renewals' }).exists,
      Checkbox({ name: 'requests' }).exists,
    ]);
  },

  closeNewBlockPage() {
    cy.do(Button({ id: 'close-patron-block' }).click());
  },

  selectPatronBlock(text) {
    cy.do(Accordion({ id: 'patronBlocksSection' })
      .find(MultiColumnList({ id: 'patron-block-mcl' }))
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 1, content: text }))
      .click());
  },

  deletePatronBlock() {
    cy.do([
      Button({ id: 'patron-block-delete' }).click(),
      Button({ id: 'clickable-patron-block-confirmation-modal-confirm' }).click()
    ]);
  },

  submitThatUserHasPatrons() {
    cy.expect(TextField({ id: 'patron-block-place' }).has({ value: 'Patron has block(s) in place' }));
  },

  fillDescription(text) {
    cy.do(TextArea({ name: 'desc' }).fillIn(text));
  },

  selectTemplate(templateName) {
    cy.do([
      Selection().open(),
      SelectionList().select(templateName)
    ]);
  },

  saveAndClose() {
    cy.do(Button({ id: 'patron-block-save-close' }).click());
    cy.expect(Button({ id: 'patron-block-save-close' }).absent());
  },

  getApi(userId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `users/${userId}`,
      })
      .then(({ body }) => body);
  },

  verifyPermissions(permissions) {
    cy.do(permissionAccordion.clickHeader());
    permissions.forEach(permission => {
      cy.expect(permissionAccordion.find(HTML(including(permission))).exists());
    });
  },

  waitLoading: () => cy.expect(rootSection.exists()),

  startFeeFine: () => {
    cy.do(actionsButton.click());
    cy.do(Button('Create fee/fine').click());
  },

  hasSaveError: (errorMessage) => cy.expect(rootSection.find(TextField({ value: errorMessage })).exists()),

  startFeeFineAdding: () => cy.do(feesFinesAccourdion.find(Button('Create fee/fine')).click()),
  
  viewAllFeesFines: () => cy.do(feesFinesAccourdion.find(Button({ id: 'clickable-viewallaccounts' })).click()),
};
