import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

const getDefaultOrganization = () => {
  const defaultUiOrganizations = {
    name: `autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: true,
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
        method: 'POST'
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
    aliases: [{
      description: 'alias_description',
      value: 'alias'
    }],
    addresses: [{
      country: 'USA'
    }],
  }
};
