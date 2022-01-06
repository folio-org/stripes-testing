import getRandomPostfix from '../../../utils/stringTools';
import { statusActive, statusInactive, statusFrozen } from '../financeHelper';

export default class NewFund {
    static #statusValue = {
      active: statusActive,
      frozen: statusFrozen,
      inactive: statusInactive
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
