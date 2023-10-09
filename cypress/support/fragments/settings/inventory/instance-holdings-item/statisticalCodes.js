import getRandomPostfix from '../../../../utils/stringTools';

const defaultStatisticalCode = {
  source: 'local',
  code: `autotest_code_${getRandomPostfix()}`,
  name: `autotest_statistical_code_${getRandomPostfix()}`,
  statisticalCodeTypeId: '3abd6fc2-b3e4-4879-b1e1-78be41769fe3',
};

export default {
  createViaApi() {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'statistical-codes',
        body: defaultStatisticalCode,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `statistical-codes/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
