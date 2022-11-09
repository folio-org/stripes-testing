import getRandomPostfix from '../../utils/stringTools';
import {
  Button,
  Select,
  TextField,
  Pane,
  Dropdown,
  MultiColumnListCell,
} from '../../../../interactors';

const defaultUserName = `AutotestUser${getRandomPostfix()}`;
const defaultUser = {
  username: defaultUserName,
  active: true,
  // should be defined
  barcode: undefined,
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

  createViaApi: (user) => cy.okapiRequest({
    method: 'POST',
    path: 'users',
    body: user,
    isDefaultSearchParamsRequired: false
  }).then(response => ({ id: response.body.id,
    username: response.body.username,
    barcode:  response.body.barcode,
    lastName: response.body.personal.lastName,
    firstName : response.body.personal.firstName,
    middleName : response.body.personal.middleName })),

  deleteViaApi:(userId) => cy.okapiRequest({
    method: 'DELETE',
    path: `bl-users/by-id/${userId}`,
    isDefaultSearchParamsRequired : false
  }),

  createViaUi: (userData) => {
    return cy.do([
      Dropdown('Actions').find(Button()).click(),
      Button({ id: 'clickable-newuser' }).click(),
      TextField({ id: 'adduser_lastname' }).fillIn(userData.personal.lastName),
      Select({ id: 'adduser_group' }).choose(userData.patronGroup),
      TextField({ name: 'barcode' }).fillIn(userData.barcode),
      TextField({ name: 'username' }).fillIn(userData.username),
      TextField({ id: 'adduser_email' }).fillIn(userData.personal.email),
      Button({ id: 'clickable-save' }).click()]).then(() => {
      cy.intercept('/users').as('user');
      return cy.wait('@user', { timeout: 70000 }).then((xhr) => xhr.response.body.id);
    });
  },

  checkIsUserCreated: (userData) => {
    cy.expect(Pane(userData.personal.lastName).exists());
  },

  checkIsPatronBlocked: (description, blockedActions) => {
    cy.expect([
      MultiColumnListCell({ content: description }).exists(),
      MultiColumnListCell({ content: blockedActions }).exists(),
    ]);
  },

  checkPatronIsNotBlocked: () => {
    cy.expect(TextField({ value:'Patron has block(s) in place' }).absent());
  }
};
