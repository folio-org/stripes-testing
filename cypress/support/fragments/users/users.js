import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Dropdown,
  KeyValue,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Section,
  Select,
  TextField,
  Callout,
  HTML,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const userDetailsPane = Pane({ id: 'pane-userdetails' });
const contactInformationAccordion = Accordion('Contact information');
const defaultUserName = `AutotestUser_${getRandomPostfix()}`;
const editButton = Button('Edit');
const barCode = TextField('Barcode');
const deleteUser = Button({ id: 'clickable-checkdeleteuser' });
const closeWithoutSavingButton = Button({ id: 'clickable-cancel-editing-confirmation-cancel' });
const deleteYesButton = Button({ id: 'delete-user-button' });
// As we checking number of search results value  but we dont have intaractor to get value so using xpath for this method
const zeroResultsFoundText = '0 records found';
const numberOfSearchResultsHeader = '//p[@id="paneHeaderusers-search-results-pane-subtitle"]';

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
  departments: [],
};

export default {
  defaultUser,
  createViaApi: (user) => cy
    .okapiRequest({
      method: 'POST',
      path: 'users',
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
    })),

  deleteViaApi: (userId) => cy.okapiRequest({
    method: 'DELETE',
    path: `bl-users/by-id/${userId}`,
    isDefaultSearchParamsRequired: false,
  }),

  getUsers: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'users',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.users;
      });
  },

  createViaUi: (userData) => {
    return cy
      .do([
        Dropdown('Actions').find(Button()).click(),
        Button({ id: 'clickable-newuser' }).click(),
        TextField({ id: 'adduser_lastname' }).fillIn(userData.personal.lastName),
        Select({ id: 'adduser_group' }).choose(userData.patronGroup),
        TextField({ name: 'barcode' }).fillIn(userData.barcode),
        TextField({ name: 'username' }).fillIn(userData.username),
        TextField({ id: 'adduser_email' }).fillIn(userData.personal.email),
        Button({ id: 'clickable-save' }).click(),
      ])
      .then(() => {
        cy.intercept('/users').as('user');
        return cy.wait('@user', { timeout: 80000 }).then((xhr) => xhr.response.body.id);
      });
  },

  assertion: () => {
    cy.do(barCode.has({ error: 'This barcode has already been taken' }));
  },

  closeWithoutSavingButton: () => {
    cy.do([closeWithoutSavingButton.click()]);
  },

  createData: (userData) => {
    return cy.do([
      Dropdown('Actions').find(Button()).click(),
      Button({ id: 'clickable-newuser' }).click(),
      TextField({ id: 'adduser_lastname' }).fillIn(userData.personal.lastName),
      TextField({ id: 'adduser_middlename' }).fillIn(userData.personal.middleName),
      TextField({ id: 'adduser_firstname' }).fillIn(userData.personal.firstName),
      Select({ id: 'adduser_group' }).choose(userData.patronGroup),
      TextField({ name: 'barcode' }).fillIn(userData.barcode),
      TextField({ name: 'username' }).fillIn(userData.userName),
      TextField({ id: 'adduser_email' }).fillIn(userData.personal.email),
      TextField({ id: 'adduser_preferredname' }).fillIn(userData.personal.preferredFirstName),
      Button({ id: 'clickable-save' }).click(),
    ]);
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
    cy.wait('@patronBlockStatus', { timeout: 10000 }).then((xhr) => {
      cy.wrap(xhr.response.body.automatedPatronBlocks.length).should('eq', 0);
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

  verifyCustomFieldOnUserDetailsPane(name, text) {
    cy.expect(userDetailsPane.find(KeyValue(name)).has({ value: text }));
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

  saveButton() {
    cy.do([Button({ id: 'clickable-save' }).click()]);
  },

  editButton: () => {
    cy.do([
      Section({ id: 'pane-userdetails' })
        .find(PaneHeader({ id: 'paneHeaderpane-userdetails' }))
        .find(Button('Actions'))
        .click(),
      editButton.click(),
    ]);
  },
  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  verifyUserDetailsPane() {
    cy.expect(userDetailsPane.exists());
  },
};
