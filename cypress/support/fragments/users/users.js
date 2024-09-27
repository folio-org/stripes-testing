import { including } from '@interactors/html';
import { recurse } from 'cypress-recurse';
import {
  Accordion,
  Button,
  Callout,
  Dropdown,
  HTML,
  KeyValue,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Section,
  Select,
  Spinner,
  TextField,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const userDetailsPane = Pane({ id: 'pane-userdetails' });
const contactInformationAccordion = Accordion('Contact information');
const defaultUserName = `autotestuser_${getRandomPostfix()}`;
const deleteUser = Button({ id: 'clickable-checkdeleteuser' });
const closeWithoutSavingButton = Button({ id: 'clickable-cancel-editing-confirmation-cancel' });
const deleteYesButton = Button({ id: 'delete-user-button' });
// As we checking number of search results value  but we dont have intaractor to get value so using xpath for this method
const zeroResultsFoundText = '0 records found';
const numberOfSearchResultsHeader = '//p[@id="paneHeaderusers-search-results-pane-subtitle"]';

const usersApiPath = Cypress.env('eureka') ? 'users-keycloak/users' : 'users';
const deleteUsersApiPath = Cypress.env('eureka') ? 'users-keycloak/users' : 'bl-users/by-id';
const createUserPane = Pane('Create User');

const defaultUser = {
  username: defaultUserName,
  active: true,
  // should be defined
  barcode: undefined,
  personal: {
    preferredFirstName: 'preferredName',
    preferredContactTypeId: '002',
    firstName: 'testPermFirst',
    middleName: 'testMiddleName',
    lastName: defaultUserName,
    email: 'test@folio.org',
  },
  // should be defined
  patronGroup: undefined,
  departments: [],
};

export default {
  defaultUser,
  createViaApi: (user) => cy
    .okapiRequest({
      method: 'POST',
      path: usersApiPath,
      body: user,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => ({
      id: response.body.id,
      username: response.body.username,
      barcode: response.body.barcode,
      lastName: response.body.personal.lastName,
      firstName: response.body.personal.firstName,
      middleName: response.body.personal.middleName,
      preferredFirstName: response.body.personal.preferredFirstName,
    })),

  deleteViaApi: (userId) => cy
    .okapiRequest({
      method: 'DELETE',
      path: `${deleteUsersApiPath}/${userId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    })
    .then(({ status }) => {
      return status;
    }),

  getUsers: (searchParams) => {
    return cy
      .okapiRequest({
        path: usersApiPath,
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.users;
      });
  },

  getAutomatedPatronBlocksApi(userId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `automated-patron-blocks/${userId}`,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },

  waitForAutomatedPatronBlocksForUser(userId, secondsToWait) {
    recurse(
      () => this.getAutomatedPatronBlocksApi(userId),
      (body) => body.automatedPatronBlocks.length > 0,
      {
        limit: Math.trunc(secondsToWait / 10),
        timeout: secondsToWait * 1000,
        delay: 10000,
      },
    );
  },

  createViaUi: (userData) => {
    return cy
      .do([
        Dropdown('Actions').find(Button()).click(),
        Button({ id: 'clickable-newuser' }).click(),
        TextField({ id: 'adduser_lastname' }).fillIn(userData.personal.lastName),
        TextField({ id: 'adduser_middlename' }).fillIn(userData.personal.middleName),
        TextField({ id: 'adduser_firstname' }).fillIn(userData.personal.firstName),
        TextField({ id: 'adduser_preferredname' }).fillIn(userData.personal.preferredFirstName),
        Select({ id: 'adduser_group' }).choose(userData.patronGroup),
        TextField({ name: 'barcode' }).fillIn(userData.barcode),
        TextField({ id: 'adduser_username' }).fillIn(userData.username),
        TextField({ id: 'adduser_email' }).fillIn(userData.personal.email),
        Select({ id: 'type' }).choose(userData.userType ? userData.userType : 'Staff'),
      ])
      .then(() => {
        cy.wait(1000);
        cy.do(Button({ id: 'clickable-save' }).click());
      })
      .then(() => {
        cy.intercept('/users').as('user');
        return cy.wait('@user', { timeout: 80000 }).then((xhr) => xhr.response.body.id);
      });
  },

  createViaUiIncomplete: (userData) => {
    return cy.do([
      Dropdown('Actions').find(Button()).click(),
      Button({ id: 'clickable-newuser' }).click(),
      TextField({ id: 'adduser_lastname' }).fillIn(userData.personal.lastName),
      TextField({ id: 'adduser_middlename' }).fillIn(userData.personal.middleName),
      TextField({ id: 'adduser_firstname' }).fillIn(userData.personal.firstName),
      TextField({ id: 'adduser_preferredname' }).fillIn(userData.personal.preferredFirstName),
      Select({ id: 'adduser_group' }).choose(userData.patronGroup),
      Select({ id: 'type' }).choose(userData.userType),
      TextField({ name: 'barcode' }).fillIn(userData.barcode),
      TextField({ id: 'adduser_email' }).fillIn(userData.personal.email),
      TextField({ id: 'adduser_username' }).fillIn(userData.username),
      Button({ id: 'clickable-save' }).click(),
      Dropdown('Actions').absent(),
    ]);
  },

  verifyUsernameMandatory(mandatory = true) {
    if (mandatory) {
      cy.expect(TextField('Username*').exists());
    } else {
      cy.expect(TextField('Username').exists());
    }
  },

  waitLoading() {
    cy.expect(Section({ id: 'users-search-results-pane' }).exists());
  },

  closeWithoutSavingButton: () => {
    cy.do([closeWithoutSavingButton.click()]);
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
    cy.expect(TextField({ value: 'Patron has block(s) in place' }).absent());
  },

  checkPatronIsNotBlockedViaApi(userId) {
    this.getAutomatedPatronBlocksApi(userId).then((body) => {
      cy.wrap(body.automatedPatronBlocks.length).should('eq', 0);
      cy.expect(TextField({ value: 'Patron has block(s) in place' }).absent());
    });
  },

  verifyFullNameIsDisplayedCorrectly(fullName) {
    cy.expect(Section({ id: 'pane-userdetails' }).find(HTML(fullName)).exists());
  },

  verifyFirstNameOnUserDetailsPane(firstName) {
    cy.expect(userDetailsPane.find(KeyValue('First name')).has({ value: `${firstName}` }));
  },

  verifyLastNameOnUserDetailsPane(lastName) {
    cy.expect(userDetailsPane.find(KeyValue('Last name')).has({ value: `${lastName}` }));
  },

  verifyMiddleNameOnUserDetailsPane(middleName) {
    cy.expect(userDetailsPane.find(KeyValue('Middle name')).has({ value: `${middleName}` }));
  },

  verifyPreferredfirstnameOnUserDetailsPane(Preferredfirstname) {
    cy.expect(
      userDetailsPane
        .find(KeyValue('Preferred first name'))
        .has({ value: `${Preferredfirstname}` }),
    );
  },

  verifyPatronGroupOnUserDetailsPane(patronGroup) {
    cy.expect(userDetailsPane.find(KeyValue('Patron group')).has({ value: `${patronGroup}` }));
  },

  verifyEmailDomainOnUserDetailsPane(emailDomain) {
    cy.do(contactInformationAccordion.clickHeader());
    cy.expect(userDetailsPane.find(KeyValue('Email')).has({ value: including(`@${emailDomain}`) }));
  },

  verifyExpirationDateOnUserDetailsPane(expirationDate) {
    cy.expect(
      userDetailsPane.find(KeyValue('Expiration date')).has({ value: `${expirationDate}` }),
    );
  },

  verifyUserTypeOnUserDetailsPane(userType) {
    cy.expect(userDetailsPane.find(KeyValue('User type')).has({ value: `${userType}` }));
  },

  verifyCustomFieldOnUserDetailsPane(name, text) {
    cy.expect(userDetailsPane.find(KeyValue(name)).has({ value: text }));
  },

  verifyUsernameOnUserDetailsPane(username) {
    cy.contains('[class^=accordion]', 'Extended information')
      .invoke('attr', 'aria-expanded')
      .then((ariaExpanded) => {
        if (!ariaExpanded) {
          cy.do(Accordion('Extended information').clickHeader());
        }
      });
    cy.expect(userDetailsPane.find(KeyValue('Username')).has({ value: username }));
  },

  clearTextField() {
    cy.do(TextField({ id: 'adduser_preferredname' }).clear());
  },

  clearTextFieldFirstName() {
    cy.do(TextField({ id: 'adduser_firstname' }).clear());
  },

  deleteUser: () => {
    cy.do([
      Section({ id: 'pane-userdetails' })
        .find(PaneHeader({ id: 'paneHeaderpane-userdetails' }))
        .find(Button('Actions'))
        .click(),
      deleteUser.click(),
      deleteYesButton.click(),
    ]);
  },

  successMessageAfterDeletion(message) {
    cy.expect(Callout(message).exists());
  },

  saveCreatedUser() {
    cy.intercept('POST', '/users-keycloak/users').as('createUser');
    cy.do(Button({ id: 'clickable-save' }).click());
    cy.wait('@createUser', { timeout: 120000 });
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  verifyUserDetailsPane() {
    cy.expect(userDetailsPane.exists());
  },

  getUserAddressTypesApi: (addressTypeId) => cy
    .okapiRequest({
      path: `addresstypes/${addressTypeId}`,
    })
    .then(({ body }) => body),

  checkCreateUserPaneOpened: (isOpened = true) => {
    cy.expect(Spinner().absent());
    if (isOpened) cy.expect([createUserPane.exists(), contactInformationAccordion.exists()]);
    else cy.expect(createUserPane.absent());
  },
};
