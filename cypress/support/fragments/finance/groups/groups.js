import getRandomPostfix from '../../../utils/stringTools';

export default {

  defaultUiGroup: {
    name: `autotest_group_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    status: 'Active'
  },

  createViaApi: (groupProperties) => {
    return cy
      .okapiRequest({
        path: 'finance/groups',
        body: groupProperties,
        method: 'POST'
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteGroupViaApi: (groupId) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/groups/${groupId}`,
    isDefaultSearchParamsRequired: false,
  }),
};
