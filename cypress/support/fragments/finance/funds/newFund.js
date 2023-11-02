import getRandomPostfix from '../../../utils/stringTools';
import FinanceHelp from '../financeHelper';

export default {
  defaultFund: {
    name: `autotest_fund_${getRandomPostfix()}`,
    code: `autotest_fund_code_${getRandomPostfix()}`,
    status: FinanceHelp.statusActive,
    ledgerName: '',
    externalAccount: 'autotest_external_account',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  },
};
