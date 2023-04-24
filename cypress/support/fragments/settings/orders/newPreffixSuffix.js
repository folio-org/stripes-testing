import getRandomPostfix from '../../../utils/stringTools';

export default {
  defaultPreffix : {
    name: `test_preff${getRandomPostfix()}`,
    description: 'Automation_Test_Preffix',
  },

  defaultSuffix : {
    name: `test_suff${getRandomPostfix()}`,
    description: 'Automation_Test_Suffix',
  }
};