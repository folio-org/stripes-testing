import getRandomPostfix from '../../../utils/stringTools';
import DateTools from '../../../utils/dateTools';
import FinanceHelper from '../financeHelper';

export default class NewLedger {
  static #statusValue = {
    active: FinanceHelper.statusActive,
    frozen: FinanceHelper.statusFrozen,
    inactive: FinanceHelper.statusInactive,
  };

  static #defaultLedger = {
    name: `autotest_ledger_${getRandomPostfix()}`,
    status: this.#statusValue.active,
    code: `test_automation_code_${getRandomPostfix()}`,
    fiscalYear: DateTools.getPreviousFiscalYearCode(),
    description: 'This is ledger created by E2E test automation script',
  };

  static get defaultLedger() {
    return this.#defaultLedger;
  }
}
