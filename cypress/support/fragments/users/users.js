import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

const defaultUserName = `AutotestUser${getRandomPostfix()}`;
const defaultUser = {
  username: defaultUserName,
  active: true,
  barcode: uuid(),
  personal: {
    preferredContactTypeId: '002',
    firstName: 'testPermFirst',
    middleName: 'testMiddleName',
    lastName: defaultUserName,
    email: 'test@folio.org',
  },
  // should be defined
  patronGroup: undefined,
  departments: []
};

export default {
  defaultUser,
  createUserApi: (user) => cy.okapiRequest({
    method: 'POST',
    path: 'users',
    body: user,
    isDefaultSearchParamsRequired: false
  }).then(response => ({ id: response.body.id,
    username: response.body.username })),
  deleteViaApi:(userId) => cy.okapiRequest({
    method: 'DELETE',
    path: `bl-users/by-id/${userId}`,
    isDefaultSearchParamsRequired : false
  })
};
