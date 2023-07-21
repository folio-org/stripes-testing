import { including } from "@interactors/html";
import {
  Accordion,
  Button,
  Dropdown,
  KeyValue,
  Link,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Section,
  Select,
  TextField
} from "../../../../interactors";
import getRandomPostfix from "../../utils/stringTools";
const errorMsg = TextField({ error: "This barcode has already been taken" });
const closeButton = Button("Close");
const cancelButton = Button({ id: "clickable-cancel" });
const userDetailsPane = Pane({ id: "pane-userdetails" });
const ClosedLoancheckboxclick = "//input[@name='Closed loan']";
const contactInformationAccordion = Accordion("Contact information");
const defaultUserName = `AutotestUser${getRandomPostfix()}`;
const ActionButton = "//span[text()='Actions']";
const newButton = Button("New");
const editButton = Button("Edit");
const checkbox = "//input[@name='check-all']";
const BarCode = TextField("Barcode");
const Closewithoutsavingbutton = Button({
  id: "clickable-cancel-editing-confirmation-cancel",
});

const defaultUser = {
  username: defaultUserName,
  active: true,
  // should be defined
  barcode: undefined,
  personal: {
    preferredContactTypeId: "002",
    firstName: "testPermFirst",
    middleName: "testMiddleName",
    lastName: defaultUserName,
    email: "test@folio.org",
  },
  // should be defined
  patronGroup: undefined,
  departments: [],
};

export default {
  defaultUser,

  createViaApi: (user) =>
    cy
      .okapiRequest({
        method: "POST",
        path: "users",
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
  Assertion: () => {
    cy.do(BarCode.has({ error: "This barcode has already been taken" }));
  },
  Closewithoutsavingbutton: () => {
    cy.do([Closewithoutsavingbutton.click()]);
  },

  deleteViaApi: (userId) =>
    cy.okapiRequest({
      method: "DELETE",
      path: `bl-users/by-id/${userId}`,
      isDefaultSearchParamsRequired: false,
    }),

  createViaUi: (userData) => {
    return cy
      .do([
        Dropdown("Actions").find(Button()).click(),
        Button({ id: "clickable-newuser" }).click(),
        TextField({ id: "adduser_lastname" }).fillIn(
          userData.personal.lastName
        ),
        TextField({ id: "adduser_firstname" }).fillIn(
          userData.personal.firstName
        ),
        Select({ id: "adduser_group" }).choose(userData.patronGroup),
        TextField({ name: "barcode" }).fillIn(userData.barcode),
        TextField({ name: "username" }).fillIn(userData.username),
        TextField({ id: "adduser_email" }).fillIn(userData.personal.email),
        Button({ id: "clickable-save" }).click(),
      ])
      .then(() => {
        cy.intercept("/users").as("user");
        return cy
          .wait("@user", { timeout: 800000 })
          .then((xhr) => xhr.response.body.id);
      });
  },
  createData: (userData) => {
    return cy.do([
      Dropdown("Actions").find(Button()).click(),
      Button({ id: "clickable-newuser" }).click(),
      TextField({ id: "adduser_lastname" }).fillIn(userData.personal.lastName),
      TextField({ id: "adduser_middlename" }).fillIn(
        userData.personal.middleName
      ),
      TextField({ id: "adduser_firstname" }).fillIn(
        userData.personal.firstName
      ),
      Select({ id: "adduser_group" }).choose(userData.patronGroup),
      TextField({ name: "barcode" }).fillIn(userData.barcode),
      TextField({ name: "username" }).fillIn(userData.username),
      TextField({ id: "adduser_email" }).fillIn(userData.personal.email),
      TextField({ id: "adduser_preferredname" }).fillIn(
        userData.personal.Preferredfirstname
      ),
      Button({ id: "clickable-save" }).click(),
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
    cy.intercept(`/automated-patron-blocks/${userId}`).as("patronBlockStatus");
    cy.wait("@patronBlockStatus", { timeout: 10000 }).then((xhr) => {
      cy.wrap(xhr.response.body.automatedPatronBlocks.length).should("eq", 0);
      cy.expect(TextField({ value: "Patron has block(s) in place" }).absent());
    });
  },

  verifyFirstNameOnUserDetailsPane(firstName) {
    cy.expect(
      userDetailsPane
        .find(KeyValue("First name"))
        .has({ value: `${firstName}` })
    );
  },
  verifyLastNameOnUserDetailsPane(lastName) {
    cy.expect(
      userDetailsPane.find(KeyValue("Last name")).has({ value: `${lastName}` })
    );
  },
  verifyMiddleNameOnUserDetailsPane(middleName) {
    cy.expect(
      userDetailsPane
        .find(KeyValue("Middle name"))
        .has({ value: `${middleName}` })
    );
  },
  verifyPreferredfirstnameOnUserDetailsPane(Preferredfirstname) {
    cy.expect(
      userDetailsPane
        .find(KeyValue("Preferred first name"))
        .has({ value: `${Preferredfirstname}` })
    );
  },

  verifyPatronGroupOnUserDetailsPane(patronGroup) {
    cy.expect(
      userDetailsPane
        .find(KeyValue("Patron group"))
        .has({ value: `${patronGroup}` })
    );
  },

  verifyEmailDomainOnUserDetailsPane(emailDomain) {
    cy.do(contactInformationAccordion.clickHeader());
    cy.expect(
      userDetailsPane
        .find(KeyValue("Email"))
        .has({ value: including(`@${emailDomain}`) })
    );
  },

  verifyExpirationDateOnUserDetailsPane(expirationDate) {
    cy.expect(
      userDetailsPane
        .find(KeyValue("Expiration date"))
        .has({ value: `${expirationDate}` })
    );
  },
  closeDetailsPane: () => {
    cy.do([cy.xpath(closeButton).click()]);
  },
  CancelButton: () => {
    cy.do([
      cancelButton.click(),
      //Closewithoutsavingbutton.click({ multiple: true })
    ]);
  },
  selectFirstUser: (userName) => {
    cy.do(Pane({ id: "list-users" }).find(Link(userName)).click());
  },
  selectUserByName: (Barcode) => {
    cy.do([MultiColumnListCell(Barcode).click({ row: 0, columnIndex: 2 })]);
  },
  checkErrorMessage: () => {
    cy.expect(errorMsg.has({ error: "This barcode has already been taken" }));
  },
  clearTextfield() {
    cy.do(TextField({ id: "adduser_preferredname" }).clear());
  },
  clearTextfieldfirstName() {
    cy.do(TextField({ id: "adduser_firstname" }).clear());
  },
  clickOnLoans: () => {
    cy.do([Button({ id: "accordion-toggle-button-loansSection" }).click()]);
  },
  EntertheitemBarcodeSearchFiled(Barcode) {
    cy.do([TextField({ id: "text-input-9" }).fillIn(Barcode)]);
  },
  clickOnOpenLoans: () => {
    cy.do([Button({ id: "clickable-viewcurrentloans" }).click()]);
  },
  clickOnCirculationLoanFilterDropDown: () => {
    cy.do([Button({ id: "accordion-toggle-button-loan" }).click()]);
  },
  clickOncheckbox: () => {
    cy.do([cy.xpath(checkbox).click()]);
  },
  clickOnClosedLoanCheckBox: () => {
    cy.do([cy.xpath(ClosedLoancheckboxclick).click()]);
  },

  clickOnXButton() {
    cy.do([Button({ id: "clickable-closenewuserdialog" }).click()]);
  },
  clickOnResetFilterText() {
    cy.do([Button({ id: "reset-receiving-filters" }).click()]);
  },
  SaveBtn() {
    cy.do([Button({ id: "clickable-save" }).click()]);
  },

  ActionsViaNew: () => {
    cy.do([
      cy.xpath(ActionButton).click({ multiple: true }),
      newButton.click({ multiple: true }),
    ]);
  },

  editButton: () => {
    cy.do([
      Section({ id: "pane-userdetails" })
        .find(PaneHeader({ id: "paneHeaderpane-userdetails" }))
        .find(Button("Actions"))
        .click(),
      editButton.click(),
    ]);
  },
};
