import getRandomPostfix from '../../../utils/stringTools';
import { getPreviousFiscalYearCode } from '../../../utils/dateTools';

export default class NewLedger {
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
}
