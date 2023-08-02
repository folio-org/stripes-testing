import { Accordion, Badge, Button, Callout, HTML, Link, Modal, MultiColumnListRow, Section, TextField, including } from '../../../../interactors';
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
  static #agreementBadge = Section({ id: 'lines' })
  static #rowInList = Section({ id: 'lines' }).find(MultiColumnListRow({ index: 0 }).find(Link('VLeBooks')))
  static #rowClick = Section({ id: 'lines' }).find(MultiColumnListRow({ index: 0 }))
  static #cancel = Button({ ariaLabel: 'Close VLeBooks' })
  static #newButtonClick = Button('New')
  static #recordLastUpdated = Section({ id: 'agreementInfoRecordMeta' }).find(Button(including('Record last updated')))
  static #actionButton = Section({ id: 'pane-view-agreement' }).find(Button('Actions'))
  static #deleteButton = Button('Delete')
  static #deleteConfirmationModal = Modal({ id: 'delete-agreement-confirmation' });
  static #deleteButtonInConfirmation = Button('Delete', { id: 'clickable-delete-agreement-confirmation-confirm' });
  static #searchAgreement = TextField({ id: 'input-agreement-search' })
  static #agreementLineDeleteModel = Modal({ id: 'delete-agreement-line-confirmation' })
  static #deleteButtonInLine = Button('Delete', { id:'clickable-delete-agreement-line-confirmation-confirm' })

  static #statusValue = {
    closed: 'Closed',
    draft: 'Draft',
    requested: 'Requested',
    inNegotiation: 'In negotiation',
    active: 'Active',
  }

  static #defaultAgreement = {
    name: `autotest_agreement_${getRandomPostfix()}`,
    status: this.#statusValue.draft,
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

  static save() {
    cy.do(this.#saveButton.click());
  }

  static waitLoading() {
    cy.expect(this.#nameField.exists());
  }

  static searchAgreement(specialAgreement = this.#defaultAgreement) {
    cy.do(this.#searchAgreement.fillIn(specialAgreement.name));
    cy.do(Button('Search').click());
    cy.expect(Section({ id:'pane-view-agreement' }).find(HTML(including(specialAgreement.name, { class: 'headline' }))).exists());
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

  static newButton() {
    cy.do(this.#newButton.click());
  }

  static agreementLine() {
    cy.do([this.#agreementLine.click(),
      this.#rowInList.click(),
      this.#cancel.click()]);
  }

  static findAgreement(specialAgreement = this.#defaultAgreement) {
    cy.visit(topMenu.agreementsPath);
    cy.do([this.#searchAgreement.fillIn(specialAgreement.name),
      Button('Search').click(),
    ]);
  }

  static deleteAgreement() {
    cy.do([
      this.#agreementLine.click(),
      this.#rowClick.click()]);
    cy.do([Section({ id:'pane-view-agreement-line' }).find(Button('Actions')).click(),
      Button('Delete').click(),
      this.#agreementLineDeleteModel.find(this.#deleteButtonInLine).click()]);
    cy.expect([Callout({ type:'success' }).exists(),
      Callout({ type:'success' }).has({ text:'Agreement line deleted' })]);
    cy.expect(this.#agreementBadge.find(Badge()).has({ value: '0' }));
    cy.do(this.#actionButton.click());
    cy.expect(this.#deleteButton.exists());
    cy.do(this.#deleteButton.click());
    cy.expect(this.#deleteConfirmationModal.exists());
    cy.do(this.#deleteConfirmationModal.find(this.#deleteButtonInConfirmation).click());
    cy.expect([Callout({ type:'success' }).exists(),
      Callout({ type:'success' }).has({ text:'Agreement line deleted' })]);
  }

  static newButtonClick() {
    cy.do(this.#newButtonClick.click());
  }
}
