import {
  Heading,
  Link,
  Button,
  Section,
  PaneHeader,
  PaneContent,
  TextField,
  HTML,
  Select,
  KeyValue,
} from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';

const mainTitle = 'Overdue fine policies';
const createTitle = 'New overdue fine policy';
const actionsButton = Button({ id: 'clickable-create-entry' });
const cancelButton = Button({ id: 'footer-cancel-entity' });
const saveButton = Button({ id: 'footer-save-entity' });
const createFormSection = Section({ id: 'overdue-fine-policy-pane' });
const createFormHeader = PaneHeader({ id: 'paneHeaderoverdue-fine-policy-pane' });
const createFormContent = PaneContent({ id: 'overdue-fine-policy-pane-content' });
const overdueFineInput = TextField({ name: 'overdueFine.quantity' });
const generalInformationButton = Button({ id: 'accordion-toggle-button-overdueGeneralSection' });
const nameInput = TextField('Overdue fine policy name*');
const generalInformationSection = Section({ id: 'overdueGeneralSection' });
const nameRequiredAlert = 'Please fill this in to continue';
const name = `Autotest_fine_policy_name_${getRandomPostfix()}`;
const editFineSection = Section({ id: 'editFineSection' });
const overdueFineNegativeAlert = 'The value must be greater than or equal to 0';
const maximumOverDueFineAlert =
  'Maximum overdue fine must be greater than or equal to Overdue fine';
const intervalAlert = 'Please make a selection';
const intervalSetAlert = 'Overdue fine must be greater than 0 if interval set';
const alertOverdueAmount = 'Please enter an overdue fine amount or set maximum overdue fine to 0';
const intervalSelect = Select({ name: 'overdueFine.intervalId' });
const generalFeePolicySection = Section({ id: 'generalFeePolicy' });
const feeViewSection = Section({ id: 'viewFineSection' });

export default {
  waitLoading() {
    cy.expect([Link(mainTitle).exists(), Heading(mainTitle).exists()]);
  },

  openCreatingForm() {
    cy.do(actionsButton.click());
  },

  checkCreatingForm() {
    cy.do(createFormSection.click());
    cy.expect([
      createFormSection.exists(),
      createFormHeader.exists(),
      createFormContent.exists(),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: true }),
      createFormSection.find(Heading(createTitle)).exists(),
      generalInformationButton.exists(),
      nameInput.exists(),
      generalInformationSection.find(HTML(nameRequiredAlert)).exists(),
      cy.expect(overdueFineInput.has({ value: '0.00' })),
    ]);
  },

  fillOverdueFine(value) {
    cy.get('[name="overdueFine.quantity"]')
      .invoke('val', '')
      .clear()
      .type(value, { force: true })
      .blur();
  },

  fillMaxFine(value) {
    cy.get('[name="maxOverdueFine"]')
      .focus()
      .invoke('val', '')
      .clear()
      .type(value, { force: true })
      .blur();
  },

  fillOverdueRecall(value) {
    cy.get('[name="overdueRecallFine.quantity"]')
      .invoke('val', '')
      .clear()
      .type(value, { force: true })
      .blur();
  },

  fillMaxRecall(value) {
    cy.get('[name="maxOverdueRecallFine"]')
      .invoke('val', '')
      .clear()
      .type(value, { force: true })
      .blur();
  },

  save() {
    cy.do(Button({ id: 'footer-save-entity' }).click());
  },

  checkAlert(alertText) {
    cy.expect(editFineSection.find(HTML(alertText)).exists());
  },

  checkOverDueFineInCreating() {
    cy.do([intervalSelect.choose('day'), overdueFineInput.focus(), overdueFineInput.blur()]);
    this.checkAlert(intervalSetAlert);

    cy.reload();
    this.waitLoading();

    // waiting the html form to be rendered
    cy.wait(1000);
    this.fillMaxFine('1.00');
    this.checkAlert(alertOverdueAmount);

    this.fillOverdueFine('1.00');
    this.save();
    this.checkAlert(intervalAlert);

    this.fillOverdueFine('-1.00');
    this.checkAlert(overdueFineNegativeAlert);

    this.fillOverdueFine('1.00');
    this.fillMaxFine('0.00');
    this.checkAlert(maximumOverDueFineAlert);
  },

  fillGeneralInformation([overdueFine, maxOverdueFine, recallFine, maxRecallFine]) {
    // waiting the html form to be rendered
    cy.wait(1000);
    this.fillOverdueFine(overdueFine);
    this.fillMaxFine(maxOverdueFine);
    this.fillOverdueRecall(recallFine);
    this.fillMaxRecall(maxRecallFine);

    cy.do([
      nameInput.fillIn(name),
      intervalSelect.choose('day'),
      Select({ name: 'overdueRecallFine.intervalId' }).choose('day'),
    ]);
  },

  verifyCreatedFines([overdueFine, maxOverdueFine, recallFine, maxRecallFine]) {
    cy.expect([
      generalFeePolicySection.find(KeyValue('Overdue fine policy name', { value: name })).exists(),
      feeViewSection.find(KeyValue('Overdue fine', { value: `${overdueFine} per day` })).exists(),
      feeViewSection.find(KeyValue('Maximum overdue fine', { value: maxOverdueFine })).exists(),
      feeViewSection
        .find(KeyValue('Overdue recall fine', { value: `${recallFine} per day` }))
        .exists(),
      feeViewSection
        .find(KeyValue('Maximum recall overdue fine', { value: maxRecallFine }))
        .exists(),
    ]);
  },

  openEditingForm() {
    cy.do([Button('Actions').click(), Button({ id: 'dropdown-clickable-edit-item' }).click()]);
    cy.expect(createFormContent.exists());
  },

  checkEditingForm([overdueFine, maxOverdueFine, recallFine, maxRecallFine]) {
    cy.do(createFormSection.click());
    cy.expect([
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: true }),
      createFormSection.find(Heading(name)).exists(),
      nameInput.has({ value: name }),
      TextField({ name: 'overdueFine.quantity' }).has({ value: overdueFine }),
      TextField({ name: 'maxOverdueFine' }).has({ value: maxOverdueFine }),
      TextField({ name: 'overdueRecallFine.quantity' }).has({ value: recallFine }),
      TextField({ name: 'maxOverdueRecallFine' }).has({ value: maxRecallFine }),
    ]);
  },

  delete() {
    cy.do([
      Button('Actions').click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },

  linkIsAbsent() {
    cy.expect(Link(name).absent());
  },
};
