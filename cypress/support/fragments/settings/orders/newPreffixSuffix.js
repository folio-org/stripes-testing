import FinanceHelper from '../../finance/financeHelper';

export default {
  defaultPreffix: {
    name: `TP${FinanceHelper.getRandomPreffixSuffix()}`,
    description: 'Automation_Test_Preffix',
  },

  defaultSuffix: {
    name: `TS${FinanceHelper.getRandomPreffixSuffix()}`,
    description: 'Automation_Test_Suffix',
  },
};
