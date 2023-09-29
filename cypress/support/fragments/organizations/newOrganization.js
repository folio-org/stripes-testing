import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

const getDefaultOrganization = ({ id = uuid(), accounts = 0 } = {}) => {
  const defaultUiOrganizations = {
    id,
    name: `autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    erpCode: getRandomPostfix(),
    isVendor: true,
    accounts: [...Array(accounts)].map(() => ({
      accountNo: getRandomPostfix(),
      accountStatus: 'Active',
      acqUnitIds: [],
      appSystemNo: '',
      description: 'Main library account',
      libraryCode: 'COB',
      libraryEdiCode: getRandomPostfix(),
      name: 'TestAccout1',
      notes: '',
      paymentMethod: 'Cash',
    })),
  };
  return defaultUiOrganizations;
};

export default {
  getDefaultOrganization,

  defaultUiOrganizations: {
    name: `autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  },

  createViaApi: (organizationProperties) => {
    return cy
      .okapiRequest({
        path: 'organizations/organizations',
        body: organizationProperties,
        method: 'POST',
      })
      .then((response) => {
        return response.body;
      });
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
    aliases: [
      {
        description: 'alias_description',
        value: 'alias',
      },
    ],
    addresses: [
      {
        country: 'USA',
      },
    ],
  },

  defaultContact: {
    firstName: `AT_FN_${getRandomPostfix()}`,
    lastName: `AT_LN_${getRandomPostfix()}`,
  },

  defaultInterface: {
    name: `AIN_${getRandomPostfix()}`,
  },
};
