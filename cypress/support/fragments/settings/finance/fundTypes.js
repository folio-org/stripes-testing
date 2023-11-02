import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
  getDefaultFundTypes() {
    return {
      name: `autotest_type_name_${getRandomPostfix()}`,
      id: uuid(),
    };
  },
  createFundTypesViaApi(fundTypes) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'finance/fund-types',
        body: fundTypes,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },
  deleteFundTypesViaApi(fundTypeId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `finance/fund-types/${fundTypeId}`,
    });
  },
};
