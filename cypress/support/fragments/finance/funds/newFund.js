import getRandomPostfix from '../../../utils/stringTools';

export default class NewFund {
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
}
