import getRandomPostfix from '../../../utils/stringTools';
import DateTools from '../../../utils/dateTools';

export default class NewFiscalYear {
  static #defaultFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(1000, 9999),
    acquisitionUnits: '',
    periodBeginDate: DateTools.getPreviousDayDate(),
    periodEndDate: DateTools.getCurrentDate(),
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
  };

  static get defaultFiscalYear() {
    return this.#defaultFiscalYear;
  }
}
