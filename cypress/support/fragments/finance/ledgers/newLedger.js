import { Button } from '../../../../../interactors';
import { getRandomPostfix, getPreviousFiscalYearCode } from '../../../utils/stringTools';

export default class NewLedger {
    // TODO: start to use interactors instead of selectors
    static #rootCss = 'div[id="pane-ledger-form-content"]'
    static #nameCss = `${this.#rootCss} input[name="name"]`;
    static #codeCss = `${this.#rootCss} input[name="code"]`;
    static #descriptionCss = `${this.#rootCss} textarea[id="textarea-input-56"]`;
    static #statusCss = `${this.#rootCss} div[class^=selectionControlContainer]`;
    static #fiscalYearCss = `${this.#rootCss} select[name^="fiscalYearOneId"]`;
    static #acquisitionUnitsCss = `${this.#rootCss} select[id="ledger-acq-units"]`;
    static #saveButton = Button('Save & Close');
    static #cancelButton = Button('Cancel');
    static #closeWithoutSavingButton = Button('Close without saving');

    static #statusValue = {
      active: 'Active',
      frozen: 'Frozen',
      inactive: 'Inactive'
    }

    static #defaultLedger = {
      name: `autotest_ledger_${getRandomPostfix()}`,
      status: this.#statusValue.active,
      code: `test_automation_code_${getRandomPostfix()}`,
      fiscalYear: getPreviousFiscalYearCode(),
      description: 'This is ledger created by E2E test automation script'
    }

    static get defaultLedger() {
      return this.#defaultLedger;
    }

    static fillMandatoryFields(newLedger = this.#defaultLedger) {
      cy.get(this.#nameCss).type(newLedger.name);
      cy.get(this.#codeCss).type(newLedger.code);
      // status is set as 'active by default
      cy.get(this.#fiscalYearCss)
        .select(newLedger.fiscalYear);
    }

    static fillOnlyNameAndCode(name) {
      cy.get(this.#nameCss).type(name);
      cy.do(this.#saveButton.click());
      cy.get(this.#codeCss).type('testCode');
    }

    static save() {
      cy.do(this.#saveButton.click());
    }

    static closeWithoutSaving() {
      cy.do(this.#cancelButton.click());
      cy.do(this.#closeWithoutSavingButton.click());
    }

    static waitLoading() {
      cy.get(this.#codeCss).should('be.enabled');
      cy.get(this.#nameCss).should('be.enabled');
    }
}
