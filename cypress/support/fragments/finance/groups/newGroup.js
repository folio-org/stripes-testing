import getRandomPostfix from '../../../utils/stringTools';

export default {
  defaultGroup: {
    name: `autotest_group_${getRandomPostfix()}`,
    code: `autotest_group_code_${getRandomPostfix()}`,
    status: 'Active',
  },
};
