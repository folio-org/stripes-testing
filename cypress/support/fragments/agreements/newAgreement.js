import getCurrentDate from '../../utils/dateTools';
import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField } from '../../../../interactors';

export default class NewAgreement {
    // TODO: start to use interactors instead of selectors
    static #rootCss = 'section[id="pane-agreement-form"]'
    static #statusCss = `${this.#rootCss} select[id="edit-agreement-status"]`;
    static #nameField = TextField({ id: 'edit-agreement-name' });
    static #startDateField = TextField({ id: 'period-start-date-0' });
    static #saveButton = Button('Save & close');

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
      startDate: getCurrentDate()
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
}
