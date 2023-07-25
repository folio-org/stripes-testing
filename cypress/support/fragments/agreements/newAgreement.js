import { Accordion, Button, Link, MultiColumnListCell, MultiColumnListRow, Pane, Section, TextField, including, Modal } from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import getRandomPostfix from '../../utils/stringTools';
import topMenu from '../topMenu';

export default class NewAgreement {
  // TODO: start to use interactors instead of selectors
  static #rootCss = 'section[id="pane-agreement-form"]'
  static #statusCss = `${this.#rootCss} select[id="edit-agreement-status"]`;
  static #nameField = TextField({ id: 'edit-agreement-name' });
  static #startDateField = TextField({ id: 'period-start-date-0' });
  static #saveButton = Button('Save & close');
  static #newButton = Section({ id: 'packageShowAgreements' }).find(Button('New'))
  static #agreementLine = Section({ id: 'lines' }).find(Button('Agreement lines'))
  static #rowInList = Section({ id: 'lines' }).find(MultiColumnListRow({ index: 0 }).find(Link('VLeBooks')))
  static #cancel = Button({ ariaLabel: 'Close VLeBooks' })
  static #newButtonClick = Button('New')
  static #recordLastUpdated = Section({ id: 'agreementInfoRecordMeta' }).find(Button(including('Record last updated')))
  static #actionButton = Section({ id: 'pane-view-agreement' }).find(Button('Actions'))
  static #deleteButton = Section({ id: 'pane-view-agreement' }).find(Button('Delete'))
  static #deleteConfirmationModal = Modal({ id: 'delete-agreement-confirmation' });
  static #deleteButtonInConfirmation = Button('Delete', { id: 'clickable-delete-agreement-confirmation-confirm' });

  static #statusValue = {
    closed: 'Closed',
    draft: 'Draft',
    requested: 'Requested',
    inNegotiation: 'In negotiation',
    active: 'Active',
  }

  static #statusValues = {
    active: 'Active',
    closed: 'Closed',
    inNegotiation: 'In Negotiation',
    requested: 'Requested',
    temporary: 'Temporary',
  }

  static #defaultAgreement = {
    name: `autotest_agreement_${getRandomPostfix()}`,
    status: this.#statusValues.active,
    startDate: DateTools.getCurrentDate()
  }

  static get defaultAgreement() {
    return this.#defaultAgreement;
  }

  static fill(specialAgreement = this.#defaultAgreement) {
    cy.do(this.#nameField.fillIn(specialAgreement.name));
    cy.get(this.#statusCss)
      .select(specialAgreement.status)
      .should('have.value', specialAgreement.status.toLowerCase());
    cy.do(this.#startDateField.fillIn(specialAgreement.startDate));
  }

  static validateDateAndTime() {
    cy.wrap(this.#recordLastUpdated.text()).as('date');
    cy.get('@date').then((val) => {
      const dateTimePattern = /\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2} [AP]M/g;
      const dateTimes = val.match(dateTimePattern)[0];
      cy.expect(this.#recordLastUpdated.has({ text: including(`Record last updated: ${dateTimes}`) }));
      cy.expect(Accordion({ headline: 'Update information' }).has({ content: including(`Record created: ${dateTimes}`) }));
    });
  }

  static save() {
    cy.do(this.#saveButton.click());
  }

  static waitLoading() {
    cy.expect(this.#nameField.exists());
  }

  static newButton() {
    cy.do(this.#newButton.click());
  }

  static agreementLine() {
    cy.do([this.#agreementLine.click(),
      this.#rowInList.click(),
      this.#cancel.click()]);
  }

  static removeAgreement(specialAgreement = this.#defaultAgreement) {
    cy.visit(topMenu.agreementsPath);
    cy.do(Pane({ id: 'agreements-tab-pane-content' }).find(MultiColumnListCell({ column: 'Name', content: specialAgreement.name })).click());
    cy.do([this.#actionButton.click(),
      this.#deleteButton.click(),
      this.#deleteConfirmationModal.find(this.#deleteButtonInConfirmation).click()]);
  }

  static newButtonClick() {
    cy.do(this.#newButtonClick.click());
  }
}
