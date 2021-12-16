import getRandomPostfix from '../../../utils/stringTools';
import { getCurrentDate, getPreviousDayDate } from '../../../utils/dateTools';

export default class NewFiscalYear {
    static #defaultFiscalYear = {
      name: `autotest_year_${getRandomPostfix()}`,
      code: `autotest_year_code_${getRandomPostfix()}`,
      acquisitionUnits: '',
      periodBeginDate: getPreviousDayDate(),
      periodEndDate: getCurrentDate(),
      description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`
    }

    static get defaultFiscalYear() {
      return this.#defaultFiscalYear;
    }
}
