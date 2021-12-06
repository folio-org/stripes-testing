import { Button } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

export default class NewLedger {
    // TODO: start to use interactors instead of selectors
    static #rootCss = 'div[id="pane-ledger-form-content"]'
    static #nameCss = `${this.#rootCss} input[name="name"]`;
    static #codeCss = `${this.#rootCss} input[name="code"]`;
    static #fiscalYearCss = `${this.#rootCss} select[name^="fiscalYearOneId"]`;
    static #saveButton = Button('Save & Close');
    static #cancelButton = Button('Cancel');
    static #closeWithoutSavingButton = Button('Close without saving');

    static #statusValue = {
      active: 'Active',
      frozen: 'Frozen',
      inactive: 'Inactive'
    }

    static #defaultFund = {
      name: `autotest_fund_${getRandomPostfix()}`,
      code: `autotest_fund_code_${getRandomPostfix()}`,
      status: this.#statusValue.active,
      ledgerName: '',
      externalAccount: 'autotest_external_account',
      description: `This is fund created by E2E test automation script_${getRandomPostfix()}`
    }

    static get defaultFund() {
      return this.#defaultFund;
    }

    static fillMandatoryFields() {
    }

    static fillOnlyNameAndCode() {
    }

    static save() {
    }

    static closeWithoutSaving() {

    }

    static waitLoading() {
    }
}
