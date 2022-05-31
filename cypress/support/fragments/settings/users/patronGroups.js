import getRandomPostfix from '../../../utils/stringTools';

const defaultPatronGroup = {
  'group': `Patron_group_${getRandomPostfix()}`,
  'desc': 'Patron_group_description',
  'expirationOffsetInDays': '10'
};
export default {
  createViaApi() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'groups',
      body:defaultPatronGroup
    }).then(({ body }) => {
      return body;
    });
  },
  deleteViaApi(patronGroupId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `groups/${patronGroupId}`
    });
  }
};
