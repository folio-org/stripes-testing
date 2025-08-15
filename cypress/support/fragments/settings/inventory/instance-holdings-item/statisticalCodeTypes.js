import getRandomPostfix from '../../../../utils/stringTools';

const defaultStatisticalCodeType = {
  source: 'local',
  name: `autotest_statistical_code_type_${getRandomPostfix()}`,
};

export default {
  createViaApi(body = defaultStatisticalCodeType) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'statistical-code-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `statistical-code-types/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },
};
