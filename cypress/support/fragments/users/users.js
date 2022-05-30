import uuid from 'uuid';
import { HTML, including, Link } from '@interactors/html';
import { Accordion, Button, Section, TextArea } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const rootSection = Section({ id:'users-search-results-pane' });
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
  }).then(response => response.body.id),
  deleteViaApi:(userId) => cy.okapiRequest({
    method: 'DELETE',
    path: `bl-users/by-id/${userId}`,
  })
};
