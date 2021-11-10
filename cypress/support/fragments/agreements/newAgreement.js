import { Button } from '@interactors/html';
import { getCurrentDate } from '../../../plugins/dateTools';
import { getRandomPostfix } from '../../../plugins/stringTools';

export default class NewAgreement {
    // TODO: start to use interactors instead of selectors
    static #rootCss = 'section[id="pane-agreement-form"]'
    static #nameCss = `${this.#rootCss} input[name="name"]`;
    static #statusCss = `${this.#rootCss} select[id="edit-agreement-status"]`;
    static #startDateCss = `${this.#rootCss} input[id="period-start-date-0"]`;
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
      cy.get(this.#nameCss).type(specialAgreement.name);
      cy.get(this.#statusCss)
        .select(specialAgreement.status)
        .should('have.value', specialAgreement.status.toLowerCase());
      cy.get(this.#startDateCss).type(specialAgreement.startDate);
    }

    static save() {
      cy.do(this.#saveButton.click());
    }

    static waitLoading() {
      cy.get(this.#nameCss).should('exist');
    }
}
