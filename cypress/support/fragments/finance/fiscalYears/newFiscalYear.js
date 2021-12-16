import getRandomPostfix from '../../../utils/stringTools';
import { getCurrentDate, getPreviousDayDate, getRandomFiscalYearCode } from '../../../utils/dateTools';

export default class NewFiscalYear {
    static #defaultFiscalYear = {
      name: `autotest_year_${getRandomPostfix()}`,
      code: getRandomFiscalYearCode(1000, 9999),
      acquisitionUnits: '',
      periodBeginDate: getPreviousDayDate(),
      periodEndDate: getCurrentDate(),
      description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`
    }

    static get defaultFiscalYear() {
      return this.#defaultFiscalYear;
    }
}
