import getRandomPostfix from '../../utils/stringTools';

export default {
  defaultUiOrganizations : {
    name: `autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`
  }
};
