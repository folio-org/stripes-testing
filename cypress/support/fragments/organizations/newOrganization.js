import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

export default {
  defaultUiOrganizations: {
    name: `autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: true,
  },
  specialOrganization: {
    name: `autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: true,
    paymentMethod: 'Cash',
    taxId: uuid(),
    description: `autotest_description_${getRandomPostfix()}`,
    erpCode: getRandomPostfix(),
    language: 'eng',
    aliases: [{
      description: 'alias_description',
      value: 'alias'
    }],
    addresses: [{
      country: 'USA'
    }],
  }
};
