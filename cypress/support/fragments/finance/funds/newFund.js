import getRandomPostfix from '../../../utils/stringTools';
import { statusActive } from '../financeHelper';

export default {
  defaultFund : {
    name: `autotest_fund_${getRandomPostfix()}`,
    code: `autotest_fund_code_${getRandomPostfix()}`,
    status: statusActive,
    ledgerName: '',
    externalAccount: 'autotest_external_account',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`
  }
};
