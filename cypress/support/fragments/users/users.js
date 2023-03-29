import getRandomPostfix from '../../utils/stringTools';
import {
  Button,
  Select,
  TextField,
  Pane,
  Dropdown,
  MultiColumnListCell,
  KeyValue
} from '../../../../interactors';

const userDetailsPane = Pane({ id: 'pane-userdetails' });
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
      return cy.wait('@user', { timeout: 80000 }).then((xhr) => xhr.response.body.id);
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

  checkPatronIsNotBlocked: (userId) => {
    cy.intercept(`/automated-patron-blocks/${userId}`).as('patronBlockStatus');
    cy.wait('@patronBlockStatus', { timeout: 10000 }).then(xhr => {
      cy.wrap(xhr.response.body.automatedPatronBlocks.length).should('eq', 0);
      cy.expect(TextField({ value:'Patron has block(s) in place' }).absent());
    });
  },

  verifyFirstNameOnUserDetailsPane(firstName) {
    cy.expect(userDetailsPane.find(KeyValue('First name')).has({ value: `${firstName}` }));
  },

  verifyPatronGroupOnUserDetailsPane(patronGroup) {
    cy.expect(userDetailsPane.find(KeyValue('Patron group')).has({ value: `${patronGroup}` }));
  },

  verifyExpirationDateOnUserDetailsPane(expirationDate) {
    cy.expect(userDetailsPane.find(KeyValue('Expiration date')).has({ value: `${expirationDate}` }));
  },
};
