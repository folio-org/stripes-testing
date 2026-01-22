import { HTML, including } from '@interactors/html';
import { v4 as uuidv4 } from 'uuid';
import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  Image,
  KeyValue,
  List,
  ListItem,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  not,
  or,
  Pane,
  ProxyUser,
  RadioButton,
  RadioButtonGroup,
  SearchField,
  Section,
  Select,
  Selection,
  SelectionOption,
  MultiSelectOption,
  Spinner,
  PaneHeader,
  TextArea,
  TextField,
  ValueChipRoot,
} from '../../../../interactors';
import SelectUser from '../check-out-actions/selectUser';
import TopMenu from '../topMenu';
import defaultUser from './userDefaultObjects/defaultUser';

const rootPane = Pane('Edit');
const userDetailsPane = Pane({ id: 'pane-userdetails' });
const permissionsList = MultiColumnList({ id: '#list-permissions' });
const saveAndCloseBtn = Button('Save & close');
const setExpirationDateButton = Button('Set');
const actionsButton = Button('Actions');
const permissionsAccordion = Accordion({ id: 'permissions' });
const userInformationAccordion = Accordion('User information');
const affiliationsAccordion = Accordion('Affiliations');
const extendedInformationAccordion = Accordion('Extended information');
const contactInformationAccordion = Accordion('Contact information');
const customFieldsAccordion = Accordion('Custom fields');
const userPermissionsAccordion = Accordion('User permissions');
const servicePointsAccordion = Accordion({ id: 'servicePoints' });
const patronBlocksAccordion = Accordion('Patron blocks');
const proxySponsorAccordion = Accordion({ id: 'proxy' });
const feesFinesAccordion = Accordion('Fees/fines');
const loansAccordion = Accordion('Loans');
const requestsAccordion = Accordion('Requests');
const notesAccordion = Accordion('Notes');
const readingRoomAccessAccordion = Accordion({ id: 'readingRoomAccess' });
const selectPermissionsModal = Modal('Select Permissions');
const deleteProfilePicturesModal = Modal({ header: 'Delete profile picture' });
const areYouSureForm = Modal('Are you sure?');
const updateProfilePictureModal = Modal('Update profile picture');
const externalSystemIdTextfield = TextField('External system ID');
const userSearch = TextField({ name: 'query' });
const externalImageUrlTextField = updateProfilePictureModal.find(
  TextField({ id: 'external-image-url' }),
);
const permissionsSearch = selectPermissionsModal.find(SearchField());
const editButton = Button('Edit');
const createRequestActionsButton = Button('Create request');
const createFeeFineActionsButton = Button('Create fee/fine');
const createPatronBlockActionsButton = Button('Create block');
const addPermissionsButton = Button({ id: 'clickable-add-permission' });
const searchButton = Button('Search');
const resetAllButton = Button('Reset all');
const cancelButton = Button('Cancel');
const userEditPane = Pane('Edit');
const closeIcon = Button({ id: 'clickable-closenewuserdialog' });
const resetPasswordLink = Button({ className: including('resetPasswordButton') });
const resetPasswordModal = Modal('Reset password email sent');
const resetPasswordInput = resetPasswordModal.find(TextField());
const resetPasswordCopyButton = resetPasswordModal.find(Button('Copy link'));
const userRolesAccordion = userEditPane.find(Accordion('User roles'));
const addRolesButton = Button({ dataTestID: 'add-roles-button' });
const unassignAllRolesButton = Button({ dataTestID: 'unassign-all-roles-button' });
const selectRolesModal = Modal('Select user roles');
const roleAssignmentFilter = selectRolesModal.find(
  Accordion({ id: including('Role assigment status') }),
);
const rolesPane = selectRolesModal.find(Pane('User roles'));
const unassignAllRolesModal = Modal('Unassign all user roles');
const yesButton = Button('Yes');
const noButton = Button('No');
const usernameField = TextField({ id: 'adduser_username' });
const lastNameField = TextField({ id: 'adduser_lastname' });
const firstNameField = TextField({ id: 'adduser_firstname' });
const middleNameField = TextField({ id: 'adduser_middlename' });
const preferredFirstName = TextField({ id: 'adduser_preferredname' });
const preferredContactSelect = Select({ id: 'adduser_preferredcontact' });
const preferableServicePointSelect = Select({ id: 'servicePointPreference' });
const barcodeField = TextField({ id: 'adduser_barcode' });
const emailField = TextField({ id: 'adduser_email' });
const expirationDateField = TextField({ id: 'adduser_expirationdate' });
const birthDateField = TextField({ id: 'adduser_dateofbirth' });
const phoneField = TextField({ id: 'adduser_phone' });
const mobilePhoneField = TextField({ id: 'adduser_mobilePhone' });
const addressSelect = Select({ id: 'adduser_group' });
const statusSelect = Select({ id: 'useractive' });
const userRoleDeleteIcon = Button({ id: including('clickable-remove-user-role') });
const profilePictureCard = Image({ alt: 'Profile picture' });
const externalUrlButton = Button({ dataTestID: 'externalURL' });
const deletePictureButton = Button({ dataTestID: 'delete' });
const keepEditingBtn = Button('Keep editing');
const closeWithoutSavingButton = Button('Close without saving');
const saveExternalLinkBtn = updateProfilePictureModal.find(
  Button({ id: 'save-external-link-btn' }),
);
const selectUserType = Select({ id: 'type' });
const selectReadingRoomAccess = Select({ id: 'reading-room-access-select' });
const promoteUserModal = Modal('Keycloak user record');
const confirmButton = Button('Confirm');
const promoteUserModalText = 'This operation will create new record in Keycloak for';
const userRolesEmptyText = 'No user roles found';
const rolesAffiliationSelect = userRolesAccordion.find(Selection('Affiliation'));
const pronounsField = TextField('Pronouns');

const selectUserModal = Modal('Select User');
const saveButton = Button({ id: 'clickable-save' });
const createUserPane = Pane('Create User');
const closeEditPaneButton = createUserPane.find(PaneHeader().find(Button({ icon: 'times' })));
const preferredEmailCommunicationsSelect = MultiSelect({
  ariaLabelledby: 'adduserPreferredEmailCommunication-label',
});
const resetExpirationDateButton = Button('Reset');
const resetExpirationDateModal = Modal('Set expiration date?');

let totalRows;

Cypress.Commands.add('getUserServicePoints', (userId) => {
  cy.okapiRequest({
    path: 'service-points-users',
    searchParams: {
      query: `(userId==${userId})`,
    },
  }).then(({ body }) => {
    Cypress.env('userServicePoints', body.servicePointsUsers);
    return body.servicePointsUsers;
  });
});

// servicePointIds is array of ids
const addServicePointsViaApi = (servicePointIds, userId, defaultServicePointId) => cy.okapiRequest({
  method: 'POST',
  path: 'service-points-users',
  body: {
    id: uuidv4(),
    userId,
    servicePointsIds: servicePointIds,
    defaultServicePointId: defaultServicePointId || servicePointIds[0],
  },
  isDefaultSearchParamsRequired: false,
});

export default {
  addServicePointsViaApi,

  openEdit() {
    cy.wait(1000);
    cy.do([userDetailsPane.find(actionsButton).click(), editButton.click()]);
    cy.wait(2000);
    cy.expect(rootPane.exists());
    cy.wait(3000);
  },

  changeMiddleName(midName) {
    cy.do(middleNameField.fillIn(midName));
  },
  changeLastName(lastName) {
    cy.do(lastNameField.fillIn(lastName));
    cy.wait(500);
  },

  changeFirstName(firstName) {
    cy.do(firstNameField.fillIn(firstName));
  },

  changeUsername(username) {
    cy.do(usernameField.fillIn(username));
  },

  changeEmail(email) {
    cy.do(emailField.fillIn(email));
  },

  changeExpirationDate(expirationDate) {
    cy.do(expirationDateField.fillIn(expirationDate));
  },

  verifyExpirationDateFieldValue(expectedDate) {
    cy.wait(500);
    cy.expect(expirationDateField.has({ value: expectedDate }));
  },

  verifySetExpirationDatePopup(groupName, offsetDays, expectedDates) {
    const modal = Modal('Set expiration date?');
    cy.expect([
      modal.exists(),
      modal.find(HTML(including(`Library accounts with patron group ${groupName}`))).exists(),
      modal.find(HTML(including(`expire in ${offsetDays} days`))).exists(),
      modal.find(HTML(including(expectedDates))).exists(),
    ]);
  },

  verifyActiveStatusField(expectedStatus) {
    cy.expect(statusSelect.has({ value: expectedStatus }));
  },

  changeExternalSystemId(externalSystemId) {
    cy.do(externalSystemIdTextfield.fillIn(externalSystemId));
  },

  changeBirthDate(birthDate) {
    cy.do(birthDateField.fillIn(birthDate));
  },

  changePhone(phone) {
    cy.do(phoneField.fillIn(phone));
  },

  changeMobilePhone(mobilePhone) {
    cy.do(mobilePhoneField.fillIn(mobilePhone));
  },
  changePreferredFirstName(prefFirstName) {
    cy.do(preferredFirstName.fillIn(prefFirstName));
  },

  changePronouns(pronouns) {
    cy.do(pronounsField.fillIn(pronouns));
  },

  fillPronouns(pronouns) {
    cy.do(pronounsField.fillIn(pronouns));
    cy.wait(500);
    cy.expect(pronounsField.has({ value: pronouns }));
  },

  clearPronounsField() {
    cy.do(pronounsField.clear());
    cy.wait(500);
  },

  focusPronounsField() {
    cy.do(pronounsField.focus());
    cy.wait(500);
    cy.expect(pronounsField.has({ focused: true }));
  },

  verifyPronounsFieldInFocus() {
    cy.wait(500);
    cy.expect(pronounsField.has({ focused: true }));
  },

  verifyPronounsFieldPresent() {
    cy.wait(500);
    cy.expect(pronounsField.exists());
  },

  verifyPronounsFieldValue(value) {
    cy.expect(pronounsField.has({ value }));
    cy.wait(500);
  },

  checkPronounsError(isPresent = true, message = 'Pronouns are limited to 300 characters') {
    if (isPresent) {
      cy.expect(pronounsField.has({ error: message, errorTextRed: true }));
    } else {
      cy.expect(pronounsField.has({ error: undefined }));
    }
  },

  verifyPronounsNoError() {
    this.checkPronounsError(false);
  },

  verifyPronounsError(message = 'Pronouns are limited to 300 characters') {
    this.checkPronounsError(true, message);
  },

  verifyPronounsTextVisibleInEdit(text) {
    cy.expect(userEditPane.find(HTML(including(text))).exists());
  },

  verifySaveButtonActive() {
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
  },

  verifyUserFullNameWithPronouns(
    lastName,
    preferredName = 'preferredName',
    testMiddleName = 'testMiddleName',
    pronouns,
  ) {
    cy.expect(
      userEditPane
        .find(HTML(including(`${lastName}, ${preferredName} ${testMiddleName}`)))
        .exists(),
    );
    cy.expect(userEditPane.find(HTML(including(`(${pronouns})`))).exists());
  },

  changeUserType(type = 'Patron') {
    cy.do(selectUserType.choose(type));
  },

  changePreferredContact(contact = 'Email') {
    cy.do(preferredContactSelect.choose(contact));
  },

  changeBarcode(barcode) {
    cy.do(barcodeField.fillIn(barcode));
  },

  clearFirstName() {
    cy.do(firstNameField.clear());
  },

  clearBarcode() {
    cy.do(barcodeField.clear());
  },

  changeStatus(status) {
    cy.do(statusSelect.choose(status));
  },

  changePatronGroup(patronGroup) {
    cy.do(addressSelect.choose(patronGroup));
    cy.wait(500);
  },

  searchForPermission(permission) {
    cy.do(permissionsSearch.fillIn(permission));
    cy.expect(permissionsSearch.is({ value: permission }));
    cy.do(searchButton.click());
  },

  selectFirsPermissionInSearch() {
    cy.do(MultiColumnListRow({ index: 0 }).find(Checkbox()).click());
  },

  savePermissionsInModal() {
    cy.do(selectPermissionsModal.find(saveAndCloseBtn).click());
  },

  saveUserEditForm() {
    cy.do(saveButton.click());
  },

  editUserDetails(user) {
    // Limitation with permissions
    // this.changeUsername(testData.editUser.username);
    // this.changeEmail(user.email);
    this.addAddress();
    this.clearFirstName();
    this.clearBarcode();
    this.changeMiddleName(user.middleName);
    this.changeLastName(user.lastName);
    this.changePreferredFirstName(user.preferredFirstName);
    this.changeExpirationDate(user.expirationDate);
    this.changeExternalSystemId(user.externalSystemId);
    this.changeBirthDate(user.birthDate);
    this.changePhone(user.phone);
    this.changeMobilePhone(user.mobilePhone);
    this.changePreferredContact(user.preferredContact);
    this.changeStatus(user.status);
    this.changeUserType(user.userType);
  },

  checkKeyValue(label, value) {
    cy.expect(KeyValue(label, { value }).exists());
  },

  openSelectPermissionsModal() {
    cy.get('#permissions').then(($accordion) => {
      if ($accordion.attr('expanded') !== 'true') {
        cy.wait(2000);
        cy.do(permissionsAccordion.clickHeader());
      }
    });
    cy.do(addPermissionsButton.click());
    cy.expect(selectPermissionsModal.exists());
  },

  addPermissions(permissions) {
    this.openEdit();
    this.openSelectPermissionsModal();
    cy.wrap(permissions).each((permission) => {
      this.searchForPermission(permission);
      cy.do(MultiColumnListRow({ index: 0 }).find(Checkbox()).click());
      cy.wait(2000);
    });
    cy.do(selectPermissionsModal.find(saveAndCloseBtn).click());
  },

  addPermissions1(permissions) {
    cy.do([userDetailsPane.find(actionsButton).click(), editButton.click()]);
    cy.wait(5000);
    cy.do([permissionsAccordion.clickHeader(), addPermissionsButton.click()]);
    permissions.forEach((permission) => {
      cy.do(userSearch.fillIn(permission));
      cy.expect(userSearch.is({ value: permission }));
      // wait is needed to avoid so fast robot clicks
      cy.wait(1000);
      cy.do(searchButton.click());
      cy.do(MultiColumnListRow({ index: 0 }).find(Checkbox()).click());
      cy.wait(2000);
    });
    cy.do(selectPermissionsModal.find(saveAndCloseBtn).click());
  },

  assignAllPermissionsToTenant(tenant, permission) {
    cy.do([userDetailsPane.find(actionsButton).click(), editButton.click()]);
    cy.wait(5000);
    cy.do([
      permissionsAccordion.clickHeader(),
      Button({ id: 'user-assigned-affiliations-select' }).click(),
      SelectionOption(tenant).click(),
      addPermissionsButton.click(),
    ]);

    cy.do(userSearch.fillIn(permission));
    cy.expect(userSearch.is({ value: permission }));
    // wait is needed to avoid so fast robot clicks
    cy.wait(1000);
    cy.do(searchButton.click());
    cy.do(
      Modal({ id: 'permissions-modal' })
        .find(Checkbox({ name: 'selected-selectAll' }))
        .click(),
    );
    cy.wait(2000);
    cy.do(selectPermissionsModal.find(saveAndCloseBtn).click());
  },

  cancelSelectPermissionsModal() {
    cy.do(selectPermissionsModal.find(cancelButton).click());
  },

  editAccessToReadingRoom(roomName, optionValue, note) {
    this.openReadingRoomAccessAccordion();
    cy.do(
      MultiColumnListCell({ content: roomName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.do(
          MultiColumnListRow({ indexRow: rowNumber })
            .find(selectReadingRoomAccess)
            .choose(optionValue),
        );
        cy.expect(
          readingRoomAccessAccordion
            .find(MultiColumnListRow({ indexRow: rowNumber }))
            .find(selectReadingRoomAccess)
            .has({ value: 'NOT_ALLOWED' }),
        );
        cy.do(
          readingRoomAccessAccordion
            .find(MultiColumnListRow({ indexRow: rowNumber }))
            .find(TextArea({ name: 'notes' }))
            .fillIn(note),
        );
      }),
    );
  },

  openServicePointsAccordion() {
    cy.do(servicePointsAccordion.clickHeader());
    cy.wait(1000);
  },

  openProxySponsorAccordion() {
    cy.do(proxySponsorAccordion.clickHeader());
    cy.wait(1000);
  },

  clickAddProxy() {
    cy.do(Button({ id: 'clickable-plugin-find-proxy' }).click());
    cy.wait(1000);
  },

  searchAndSelectProxyUser(username) {
    cy.do(selectUserModal.find(TextField({ name: 'query' })).fillIn(username));
    cy.do(selectUserModal.find(Button('Search')).click());
    cy.wait(1000);
    cy.do(MultiColumnListCell({ row: 0, content: username }).click());
    cy.wait(2000);
  },

  verifyUserProxyDetails(username) {
    const proxyUser = ProxyUser(including(username));
    cy.do(Select('Notifications sent to').choose('Proxy'));
    cy.expect([
      proxyUser.exists(),
      proxyUser.find(Select('Relationship Status')).has({ checkedOptionText: 'Active' }),
      proxyUser.find(Select('Proxy can request for sponsor')).has({ checkedOptionText: 'Yes' }),
      proxyUser.find(Select('Notifications sent to')).has({ checkedOptionText: 'Proxy' }),
      proxyUser.find(TextField('Expiration date')).exists(),
    ]);
  },

  openReadingRoomAccessAccordion() {
    cy.do(readingRoomAccessAccordion.clickHeader());
    cy.expect(readingRoomAccessAccordion.find(MultiColumnList()).exists());
  },

  addServicePoints(...points) {
    cy.do([Button({ id: 'add-service-point-btn' }).click()]);

    points.forEach((point) => {
      cy.do(MultiColumnListRow({ content: point, isContainer: true }).find(Checkbox()).click());
    });

    cy.do(Modal().find(saveAndCloseBtn).click());
  },

  removeAllServicePoints() {
    cy.do(Button({ id: 'add-service-point-btn' }).click());

    cy.get('input[type="checkbox"]:checked').then(($checkboxes) => {
      $checkboxes.each((index, checkbox) => {
        // eslint-disable-next-line cypress/no-force
        cy.wrap(checkbox).uncheck({ force: true });
      });
    });

    cy.do(Modal().find(saveAndCloseBtn).click());
  },

  selectPreferableServicePoint(point) {
    cy.do(preferableServicePointSelect.choose(point));
  },

  checkServicePoints(...points) {
    points.forEach((point) => {
      cy.expect(servicePointsAccordion.find(HTML(including(point))).exists());
    });
  },

  checkAccordionsForShadowUser() {
    cy.expect([
      userInformationAccordion.exists(),
      affiliationsAccordion.exists(),
      extendedInformationAccordion.exists(),
      contactInformationAccordion.exists(),
      customFieldsAccordion.exists(),
      servicePointsAccordion.exists(),
    ]);
    if (!Cypress.env('eureka')) cy.expect(userPermissionsAccordion.exists());
    else cy.expect(userPermissionsAccordion.absent());
    cy.expect([
      patronBlocksAccordion.absent(),
      proxySponsorAccordion.absent(),
      feesFinesAccordion.absent(),
      loansAccordion.absent(),
      requestsAccordion.absent(),
      notesAccordion.absent(),
    ]);
  },

  checkAccordionsForShadowUserInEditMode() {
    cy.expect([
      userInformationAccordion.exists(),
      extendedInformationAccordion.exists(),
      contactInformationAccordion.exists(),
      servicePointsAccordion.exists(),
    ]);
    if (!Cypress.env('eureka')) cy.expect(userPermissionsAccordion.exists());
    else cy.expect(userPermissionsAccordion.absent());
    cy.expect([
      patronBlocksAccordion.absent(),
      proxySponsorAccordion.absent(),
      feesFinesAccordion.absent(),
      loansAccordion.absent(),
      requestsAccordion.absent(),
      notesAccordion.absent(),
    ]);
  },

  checkActionsForShadowUser() {
    cy.do(userDetailsPane.find(actionsButton).click());
    cy.expect([
      createRequestActionsButton.absent(),
      createFeeFineActionsButton.absent(),
      createPatronBlockActionsButton.absent(),
    ]);
    cy.do(userDetailsPane.find(actionsButton).click());
  },

  addProxySponsor(users, type = 'sponsor') {
    cy.do(Button({ id: 'accordion-toggle-button-proxy' }).click());
    cy.wrap(users).each((username) => {
      cy.do(Button({ id: `clickable-plugin-find-${type}` }).click());
      SelectUser.searchUser(username);
      SelectUser.selectUserFromList(username);
    });
  },

  cancelChanges() {
    cy.do([cancelButton.click(), closeWithoutSavingButton.click()]);
  },

  cancelEdit() {
    cy.do(cancelButton.click());
  },

  clickCloseWithoutSavingIfModalExists() {
    cy.do(cancelButton.click());
    cy.get('body').then(($body) => {
      if ($body.find('[class^=modal-]').length > 0) {
        cy.do(areYouSureForm.find(closeWithoutSavingButton).click());
      }
    });
  },

  verifySaveButtonEnabled() {
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
  },

  saveAndClose() {
    cy.wait(1000);
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
    cy.do(saveAndCloseBtn.click());
    cy.wait(3000);
    cy.get('body').then(($body) => {
      if ($body.find('[class^=modal-]').length > 0) {
        cy.do(areYouSureForm.find(closeWithoutSavingButton).click());
      }
    });
    cy.expect(rootPane.absent());
  },

  saveAndCloseWithoutConfirmation() {
    cy.wait(1000);
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
    cy.do(saveAndCloseBtn.click());
    cy.expect(rootPane.absent());
  },

  confirmChangingUserType() {
    cy.wait(1000);
    cy.do(Modal().find(Button('Confirm')).click());
    cy.wait(500);
  },

  saveEditedUser() {
    cy.intercept('PUT', /\/users\/.+|\/users-keycloak\/users\/.+/).as('updateUser');
    cy.wait(1000);
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
    cy.do(saveAndCloseBtn.click());
    cy.wait('@updateUser', { timeout: 100000 });
    cy.expect(rootPane.absent());
  },

  addServicePointViaApi: (servicePointId, userId, defaultServicePointId) => addServicePointsViaApi([servicePointId], userId, defaultServicePointId),

  // we can remove the service point if it is not Preference
  changeServicePointPreference: (userName = defaultUser.defaultUiPatron.body.userName) => {
    cy.visit(TopMenu.usersPath);
    cy.do([
      TextField({ id: 'input-user-search' }).fillIn(userName),
      searchButton.click(),
      MultiColumnList().click({ row: 0, column: 'Active' }),
      userDetailsPane.find(actionsButton).click(),
      Button({ id: 'clickable-edituser' }).click(),
      Button({ id: 'accordion-toggle-button-servicePoints' }).click(),
      preferableServicePointSelect.choose('None'),
      saveButton.click(),
    ]);
  },

  changeServicePointPreferenceViaApi: (userId, servicePointIds, defaultServicePointId = null) => cy
    .okapiRequest({
      method: 'GET',
      path: `service-points-users?query="userId"="${userId}"`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    })
    .then((servicePointsUsers) => {
      if (servicePointsUsers.body.servicePointsUsers.length === 0) {
        return;
      }
      cy.okapiRequest({
        method: 'PUT',
        path: `service-points-users/${servicePointsUsers.body.servicePointsUsers[0].id}`,
        body: {
          userId,
          servicePointsIds: [
            ...new Set([
              ...servicePointsUsers.body.servicePointsUsers[0].servicePointsIds,
              ...servicePointIds,
            ]),
          ],
          defaultServicePointId,
        },
        isDefaultSearchParamsRequired: false,
      });
    }),

  addProfilePictureViaApi(userId, url) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `users/${userId}`,
      })
      .then((response) => {
        response.body.personal.profilePictureLink = url;

        cy.okapiRequest({
          method: 'PUT',
          path: `users/${userId}`,
          body: response.body,
          isDefaultSearchParamsRequired: false,
        });
      });
  },

  updateExternalIdViaApi(user, externalSystemId) {
    cy.updateUser({
      ...user,
      externalSystemId,
    });
  },

  addExternalId(externalId) {
    cy.do([
      userDetailsPane.find(actionsButton).click(),
      editButton.click(),
      extendedInformationAccordion.click(),
      extendedInformationAccordion.find(externalSystemIdTextfield).fillIn(externalId),
    ]);
    this.saveAndClose();
  },

  addMultiSelectCustomField(data) {
    cy.do([
      userDetailsPane.find(actionsButton).click(),
      editButton.click(),
      customFieldsAccordion.click(),
    ]);
    cy.wait(2000);
    cy.do([
      customFieldsAccordion.find(MultiSelect({ label: data.fieldLabel })).choose(data.label1),
      customFieldsAccordion.find(MultiSelect({ label: data.fieldLabel })).choose(data.label2),
    ]);
    cy.wait(2000);
    this.saveAndClose();
  },

  addCustomField(customFieldName, customFieldText) {
    cy.do([
      userDetailsPane.find(actionsButton).click(),
      editButton.click(),
      customFieldsAccordion.click(),
      customFieldsAccordion.find(TextArea({ label: customFieldName })).fillIn(customFieldText),
    ]);
    this.saveAndClose();
  },

  selectSingleSelectValue: ({ data }) => {
    cy.do(Select({ label: data.fieldLabel }).choose(data.firstLabel));
  },

  chooseUserType(userType) {
    cy.do(selectUserType.choose(userType));
  },

  resetAll() {
    cy.do(resetAllButton.click());
    permissionsList.perform((el) => {
      el.invoke('attr', 'aria-rowcount').then((rowCount) => {
        expect(rowCount).to.equal(totalRows);
      });
    });
  },

  addAddress(type = 'Home') {
    cy.do([Button('Add address').click(), Select('Address Type*').choose(type)]);
  },

  addAddressWithCountry(type = 'Home', country = 'Australia') {
    cy.do([
      Button('Add address').click(),
      Select('Address Type*').choose(type),
      Selection('Country').choose(country),
    ]);
  },

  addAddressWithoutType() {
    cy.do([Button('Add address').click()]);
    cy.wait(1000);
  },

  deleteAddress() {
    cy.do(Button('Delete address').click());
  },

  cancelAddressForm() {
    // eslint-disable-next-line cypress/no-force
    cy.get('[data-test-delete-address-button="true"]').click({ force: true });
    cy.wait(1000);
  },

  saveAndCloseStayOnEdit() {
    cy.wait(1000);
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
    cy.do(saveAndCloseBtn.click());
  },

  closeEditPaneIfExists() {
    cy.get('body').then(($body) => {
      if ($body.find('section [data-test-pane-header-title]')?.textContent === 'Edit') {
        cy.do(closeEditPaneButton.click());
      }
    });
    cy.get('body').then(($body) => {
      if ($body.find('[class^=modal-]').length > 0) {
        cy.do(areYouSureForm.find(closeWithoutSavingButton).click());
      }
    });
    cy.wait(5000);
    cy.expect(rootPane.absent());
  },

  editUsername(username) {
    cy.do(usernameField.fillIn(username));
  },

  fillInExternalImageUrlTextField(url) {
    cy.wait(1000);
    cy.do(externalImageUrlTextField.fillIn(url));
  },

  clickSaveButton() {
    cy.expect(saveExternalLinkBtn.has({ disabled: false }));
    cy.do(saveExternalLinkBtn.click());
  },

  clearExternalImageUrlTextField() {
    cy.get('#external-image-url').clear();
    cy.expect([
      externalImageUrlTextField.has({ value: '' }),
      saveExternalLinkBtn.has({ disabled: true }),
    ]);
  },

  setPictureFromExternalUrl(url, setNewUrl = true) {
    cy.do(externalUrlButton.click({ force: true }));
    if (setNewUrl) {
      cy.expect([
        externalImageUrlTextField.has({ value: '' }),
        saveExternalLinkBtn.has({ disabled: true }),
      ]);
      this.fillInExternalImageUrlTextField(url);
      this.clickSaveButton();
    } else {
      this.fillInExternalImageUrlTextField(url);
      this.clickSaveButton();
    }
  },

  deleteProfilePicture(user) {
    cy.do(deletePictureButton.click({ force: true }));
    cy.expect([
      deleteProfilePicturesModal.exists(),
      deleteProfilePicturesModal
        .find(
          HTML(
            including(
              `You are deleting the profile picture for ${user.lastName}, ${user.firstName}`,
            ),
          ),
        )
        .exists(),
      deleteProfilePicturesModal.find(Button('Yes')).exists(),
      deleteProfilePicturesModal.find(Button('No')).exists(),
    ]);
    cy.do(deleteProfilePicturesModal.find(Button('Yes')).click());
    cy.expect(deleteProfilePicturesModal.absent());
  },

  expandUpdateDropDown() {
    cy.do(Button('Update').click());
  },

  clickCloseWithoutSavingButton() {
    cy.do(areYouSureForm.find(closeWithoutSavingButton).click());
    cy.expect(rootPane.absent());
  },

  // checking
  verifyPermissionDoesNotExist(permission) {
    cy.do([addPermissionsButton.click(), userSearch.fillIn(permission)]);
    cy.expect(userSearch.is({ value: permission }));
    // wait is needed to avoid so fast robot clicks
    cy.wait(1000);
    cy.do(searchButton.click());
  },

  verifyPermissionDoesNotExistInSelectPermissions(permission) {
    this.searchForPermission(permission);
    cy.expect(selectPermissionsModal.find(HTML('The list contains no items')).exists());
  },

  verifySaveAndCloseIsDisabled: (status) => {
    cy.expect(saveAndCloseBtn.has({ disabled: status }));
  },

  verifyCancelIsDisable: (status) => {
    cy.expect(cancelButton.has({ disabled: status }));
  },

  verifyUserInformation: (allContentToCheck) => {
    return allContentToCheck.forEach((contentToCheck) => cy.expect(Section({ id: 'editUserInfo' }, including(contentToCheck)).exists()));
  },

  verifyTextFieldPresented(fieldData) {
    cy.expect(TextField(fieldData.fieldLabel).exists());
    cy.do(
      TextField(fieldData.fieldLabel)
        .find(Button({ ariaLabel: 'info' }))
        .click(),
    );
    cy.expect(HTML(fieldData.helpText).exists());
  },

  verifyAreaFieldPresented(fieldData) {
    cy.expect(TextArea(fieldData.fieldLabel).exists());
    cy.do(
      customFieldsAccordion
        .find(TextArea(fieldData.fieldLabel))
        .find(Button({ ariaLabel: 'info' }))
        .click(),
    );
    cy.expect(HTML(fieldData.helpText).exists());
  },

  verifyCheckboxPresented(fieldData) {
    cy.expect(customFieldsAccordion.find(Checkbox(fieldData.fieldLabel)).exists());
    cy.do(
      customFieldsAccordion
        .find(Checkbox(fieldData.fieldLabel))
        .find(Button({ ariaLabel: 'info' }))
        .click(),
    );
    cy.expect(HTML(fieldData.helpText).exists());
  },

  verifyRadioButtonPresented(fieldData) {
    cy.expect(RadioButtonGroup({ label: including(fieldData.data.fieldLabel) }).exists());
    cy.expect(
      customFieldsAccordion
        .find(RadioButtonGroup(including(fieldData.data.fieldLabel)))
        .find(RadioButton(fieldData.data.label1))
        .exists(),
    );
    cy.expect(
      customFieldsAccordion
        .find(RadioButtonGroup(including(fieldData.data.fieldLabel)))
        .find(RadioButton(fieldData.data.label2))
        .exists(),
    );
    cy.do(
      customFieldsAccordion
        .find(RadioButtonGroup(fieldData.data.fieldLabel))
        .find(Button({ ariaLabel: 'info' }))
        .click(),
    );
    cy.expect(HTML(fieldData.data.helpText).exists());
  },

  verifySingleSelectPresented({ data }) {
    cy.do(
      Accordion('Custom fields')
        .find(Select({ label: data.fieldLabel }))
        .exists(),
    );
    cy.do(
      Accordion('Custom fields')
        .find(Select({ label: data.fieldLabel }))
        .find(Button({ ariaLabel: 'info' }))
        .click(),
    );
    cy.expect(HTML(data.helpText).exists());
  },

  verifyUserTypeItems() {
    cy.expect([
      selectUserType.has({ content: including('Patron') }),
      selectUserType.has({ content: including('Staff') }),
    ]);
  },

  enterValidValueToCreateViaUi: (userData, patronGroup) => {
    cy.intercept({ method: 'POST', url: /\/users$/ }).as('createUser');
    cy.do([
      lastNameField.fillIn(userData.personal.lastName),
      barcodeField.fillIn(userData.barcode),
      usernameField.fillIn(userData.username),
      emailField.fillIn(userData.personal.email),
      addressSelect.choose(patronGroup),
      setExpirationDateButton.click(),
      saveAndCloseBtn.click(),
    ]);
    return cy.wait('@createUser', { timeout: 80_000 }).then(({ response }) => {
      return response.body.id;
    });
  },

  verifyUserPermissionsAccordion(isShown = false) {
    if (isShown) {
      cy.expect(permissionsAccordion.exists());
      cy.expect(permissionsAccordion.has({ open: false }));
    } else cy.expect(permissionsAccordion.absent());
  },

  verifyPermissionsNotExistInPermissionsAccordion(permissions) {
    cy.do(permissionsAccordion.clickHeader());
    permissions.forEach((permission) => {
      cy.expect(permissionsAccordion.find(HTML(including(permission))).absent());
    });
  },

  verifyPermissionsFiltered(permission) {
    permissionsList.perform((el) => {
      el.invoke('attr', 'aria-rowcount').then((rowCount) => {
        for (let i = 0; i < rowCount - 1; i++) {
          const statusField = MultiColumnListCell({ row: i, columnIndex: 1 });
          cy.expect(statusField.has({ content: permission[i] }));
        }
      });
    });
  },

  verifyProfileCardIsPresented() {
    cy.expect(profilePictureCard.exists());
  },

  verifyProfilePictureIsPresent(url) {
    cy.expect(profilePictureCard.has({ src: including(url) }));
  },

  verifyPlaceholderProfilePictureIsPresent() {
    cy.expect(profilePictureCard.has({ src: including('/./img/placeholderThumbnail') }));
  },

  verifyPictureIsRemoved(url) {
    cy.expect(profilePictureCard.has({ src: not(including(url)) }));
  },

  verifyButtonsStateForProfilePicture(buttonsToCheck) {
    this.expandUpdateDropDown();
    buttonsToCheck.forEach((button) => {
      cy.expect(
        DropdownMenu({ ariaLabel: 'profile picture action menu' })
          .find(Button(button.value))
          .exists(),
      );
    });
  },

  verifyAreYouSureForm(isOpen = false) {
    if (isOpen) {
      cy.expect([
        areYouSureForm.find(HTML(including('There are unsaved changes'))).exists(),
        areYouSureForm.find(keepEditingBtn).exists(),
        areYouSureForm.find(closeWithoutSavingButton).exists(),
      ]);
    } else {
      cy.expect(areYouSureForm.absent());
    }
  },

  verifyModalWithInvalidUrl(errorMessage) {
    cy.expect([
      externalImageUrlTextField.has({ error: errorMessage, errorTextRed: true }),
      updateProfilePictureModal.exists(),
      saveExternalLinkBtn.has({ disabled: true }),
    ]);
  },

  fillRequiredFields(userLastName, patronGroup, email, userType = null, userName = null) {
    if (userType) this.changeUserType(userType);
    if (userName) cy.do(usernameField.fillIn(userName));
    cy.do([
      lastNameField.fillIn(userLastName),
      addressSelect.choose(patronGroup),
      emailField.fillIn(email),
    ]);
    cy.wait(2000);
  },

  checkUserEditPaneOpened: (isOpened = true) => {
    cy.expect(Spinner().absent());
    if (isOpened) {
      cy.expect(userEditPane.exists(), userInformationAccordion.exists());
    } else {
      cy.expect(userEditPane.absent(), userInformationAccordion.absent());
    }
  },

  closeUsingIcon() {
    cy.do(closeIcon.click());
    cy.expect(userEditPane.absent);
  },

  clickResetPasswordLink() {
    cy.do(resetPasswordLink.click());
    cy.expect([
      resetPasswordModal.exists(),
      resetPasswordInput.exists(),
      resetPasswordCopyButton.exists(),
    ]);
  },

  verifyResetLink(expectedLink) {
    cy.expect(resetPasswordInput.has({ value: expectedLink }));
  },

  verifyUserRolesCounter(expectedCount) {
    cy.expect(userRolesAccordion.has({ counter: expectedCount }));
  },

  clickUserRolesAccordion(isExpanded = true, isEditable = true) {
    cy.do(userRolesAccordion.clickHeader());
    cy.expect(userRolesAccordion.has({ open: isExpanded }));
    if (isEditable) {
      cy.expect([
        addRolesButton.exists(),
        unassignAllRolesButton.has({ disabled: or(true, false) }),
      ]);
    } else {
      cy.expect([
        addRolesButton.absent(),
        unassignAllRolesButton.absent(),
        userRoleDeleteIcon.absent(),
      ]);
    }
  },

  verifyUserRolesAccordionEmpty() {
    cy.wait(2000);
    cy.expect([
      userRolesAccordion.find(ListItem()).absent(),
      userRolesAccordion.find(HTML(userRolesEmptyText)).exists(),
    ]);
  },

  clickAddUserRolesButton() {
    cy.do(userRolesAccordion.find(addRolesButton).click());
    cy.expect(selectRolesModal.exists());
  },

  verifySelectRolesModal() {
    cy.expect([
      selectRolesModal.find(userSearch).exists(),
      selectRolesModal.find(searchButton).has({ disabled: true }),
      selectRolesModal.find(saveAndCloseBtn).exists(),
      selectRolesModal.find(cancelButton).exists(),
      rolesPane.exists(),
      roleAssignmentFilter.exists(),
    ]);
  },

  selectRoleInModal(roleName, isSelected = true) {
    const targetCheckbox = MultiColumnListRow(including(roleName), { isContainer: false }).find(
      Checkbox(),
    );
    cy.do([
      selectRolesModal.find(userSearch).fillIn(roleName),
      selectRolesModal.find(searchButton).click(),
      targetCheckbox.click(),
    ]);
    cy.expect(targetCheckbox.has({ checked: isSelected }));
  },

  saveAndCloseRolesModal() {
    cy.do(selectRolesModal.find(saveAndCloseBtn).click());
    cy.expect(selectRolesModal.absent());
    cy.wait(1000);
  },

  verifyUserRoleNames(roleNames, isEditable = true) {
    roleNames.forEach((roleName) => {
      const roleItem = userRolesAccordion.find(ListItem(including(roleName)));
      if (isEditable) cy.expect(roleItem.find(userRoleDeleteIcon).exists());
      else cy.expect(roleItem.exists());
    });
  },

  verifyUserRoleNamesOrdered(roleNames, isEditable = true) {
    roleNames.forEach((roleName, index) => {
      const roleItem = userRolesAccordion.find(ListItem(including(roleName), { index }));
      if (isEditable) cy.expect(roleItem.find(userRoleDeleteIcon).exists());
      else cy.expect(roleItem.exists());
    });
  },

  verifyUserRolesRowsCount(expectedCount) {
    cy.expect(userRolesAccordion.find(List()).has({ count: expectedCount }));
  },

  removeOneRole(roleName) {
    cy.do(userRolesAccordion.find(ListItem(including(roleName)).find(userRoleDeleteIcon)).click());
  },

  unassignAllRoles(isConfirmed = true) {
    cy.do(userRolesAccordion.find(unassignAllRolesButton).click());
    cy.expect([
      unassignAllRolesModal.find(yesButton).exists(),
      unassignAllRolesModal.find(noButton).exists(),
    ]);
    if (isConfirmed) cy.do(unassignAllRolesModal.find(yesButton).click());
    else cy.do(unassignAllRolesModal.find(noButton).click());
    cy.expect(unassignAllRolesModal.absent());
  },

  fillLastFirstNames(lastName, firstName) {
    cy.do(lastNameField.fillIn(lastName));
    if (firstName) cy.do(firstNameField.fillIn(firstName));
    cy.wait(1000);
  },

  fillEmailAddress(email) {
    cy.do(emailField.fillIn(email));
  },

  verifyEmailCommunicationPreferencesField() {
    cy.expect(preferredEmailCommunicationsSelect.exists());
  },

  selectEmailCommunicationPreference(preference) {
    cy.do(preferredEmailCommunicationsSelect.choose(preference));
  },

  verifyEmailCommunicationPreferenceSelected(preferences) {
    const preferencesArray = Array.isArray(preferences) ? preferences : [preferences];
    preferencesArray.forEach((preference) => {
      cy.expect(preferredEmailCommunicationsSelect.find(ValueChipRoot(preference)).exists());
    });
  },

  removeEmailCommunicationPreference(preference) {
    cy.do(
      preferredEmailCommunicationsSelect
        .find(ValueChipRoot(preference))
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.wait(1000);
    cy.expect(preferredEmailCommunicationsSelect.find(ValueChipRoot(preference)).absent());
  },

  typeInEmailCommunicationPreferences(text) {
    cy.do(preferredEmailCommunicationsSelect.fillIn(text));
  },

  pressEnter() {
    cy.get('body').type('{enter}');
  },

  verifyEmailCommunicationPreferencesDropdownItemExists(item) {
    cy.expect(preferredEmailCommunicationsSelect.find(MultiSelectOption(including(item))).exists());
  },

  verifyRemoveButtonExists(preference) {
    cy.expect(
      preferredEmailCommunicationsSelect
        .find(ValueChipRoot(preference))
        .find(Button({ icon: 'times' }))
        .exists(),
    );
  },

  checkPromoteUserModal(lastName, firstName = '') {
    cy.expect([
      promoteUserModal.find(cancelButton).exists(),
      promoteUserModal.find(confirmButton).exists(),
      promoteUserModal.has({ message: including(promoteUserModalText) }),
      promoteUserModal.has({
        message: including(`${lastName}${firstName ? ', ' + firstName : ''}`),
      }),
    ]);
  },

  clickConfirmInPromoteUserModal: (closedAfterClick = true) => {
    cy.do(promoteUserModal.find(confirmButton).click());
    if (closedAfterClick) cy.expect(promoteUserModal.absent());
    else cy.expect(promoteUserModal.exists());
  },

  clickCancelInPromoteUserModal: () => {
    cy.do(promoteUserModal.find(cancelButton).click());
    cy.expect(promoteUserModal.absent());
  },

  checkSelectedRolesAffiliation(affiliation) {
    cy.expect(
      rolesAffiliationSelect.has({ singleValue: or(affiliation, `${affiliation} (Primary)`) }),
    );
  },

  selectRolesAffiliation(affiliation) {
    cy.do(rolesAffiliationSelect.choose(or(affiliation, `${affiliation} (Primary)`)));
    this.checkSelectedRolesAffiliation(affiliation);
  },

  clickAddSponsor() {
    cy.do(Button({ id: 'clickable-plugin-find-sponsor' }).click());
    cy.wait(1000);
  },

  verifyInvalidModal(type) {
    const modalTitle = `Invalid ${type}`;
    const pluralType = type.toLowerCase() === 'proxy' ? 'proxies' : `${type.toLowerCase()}s`;
    const errorMessage = `Users cannot be ${pluralType} for themselves.`;

    cy.expect([
      Modal(modalTitle).exists(),
      Modal(modalTitle)
        .find(HTML(including(errorMessage)))
        .exists(),
      Modal(modalTitle).find(Button('OK')).exists(),
    ]);
  },

  closeInvalidModal(type) {
    const modalTitle = `Invalid ${type}`;
    cy.do(Modal(modalTitle).find(Button('OK')).click());
    cy.expect(Modal(modalTitle).absent());
  },

  verifyNoRecordAdded(type) {
    const pluralType = type.toLowerCase() === 'proxy' ? 'proxies' : `${type.toLowerCase()}s`;
    const noRecordsText = `No ${pluralType} found`;
    cy.expect(proxySponsorAccordion.find(HTML(including(noRecordsText))).exists());
  },

  verifyAddressTypeError() {
    cy.expect(HTML(including('Please select address type')).exists());
  },

  setExpirationDate() {
    cy.do(setExpirationDateButton.click());
  },

  closeKeycloakModalIfExists() {
    cy.get('body').then(($body) => {
      if ($body.find('[aria-label="Keycloak user record"]').length > 0) {
        cy.do(
          Modal('Keycloak user record')
            .find(Button({ id: 'clickable-JIT-user-cancel' }))
            .click(),
        );
      }
    });
  },

  checkUserCreatePaneOpened() {
    cy.expect(createUserPane.exists());
  },

  verifyRequiredFieldsFilled(lastName, barcode, username, email) {
    this.verifyLastNameFieldValue(lastName);
    this.verifyBarcodeFieldValue(barcode);
    this.verifyUsernameFieldValue(username);
    this.verifyEmailFieldValue(email);
  },

  verifyLastNameFieldValue(value) {
    cy.expect(lastNameField.has({ value }));
  },

  verifyUsernameFieldValue(value) {
    cy.expect(usernameField.has({ value }));
  },

  verifyEmailFieldValue(value) {
    cy.expect(emailField.has({ value }));
  },

  verifyBarcodeFieldValue(value) {
    cy.expect(barcodeField.has({ value }));
  },

  verifyUserTypeFieldValue(value) {
    cy.expect(selectUserType.has({ value }));
  },

  clearExpirationDateField() {
    cy.do(expirationDateField.find(Button({ icon: 'times-circle-solid' })).click());
  },

  openExpirationDateCalendar() {
    cy.do(expirationDateField.find(Button({ icon: 'calendar' })).click());
  },

  convertDateFormat(dateString) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const [month, day, year] = dateString.split('/');

    const monthName = months[parseInt(month, 10) - 1];

    return `${monthName} ${+day}, ${year}`;
  },

  pickFutureDate() {
    // Pick a date 30 days in the future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const formattedDate = `${(futureDate.getMonth() + 1).toString().padStart(2, '0')}/${futureDate.getDate().toString().padStart(2, '0')}/${futureDate.getFullYear()}`;

    cy.do(expirationDateField.fillIn(formattedDate));
    return formattedDate;
  },

  verifyExpirationDateFieldCleared() {
    cy.expect(expirationDateField.has({ value: '' }));
  },

  verifyUserHasExpiredMessage() {
    cy.expect(HTML(including('User has expired')).exists());
  },

  clickResetExpirationDateButton() {
    cy.do(resetExpirationDateButton.click());
    cy.wait(500);
  },

  cancelResetExpirationDateModal() {
    cy.do(resetExpirationDateModal.find(Button('Cancel')).click());
    cy.wait(500);
    cy.expect(resetExpirationDateModal.absent());
    cy.wait(500);
  },

  verifyUserWillReactivateMessage() {
    cy.expect(HTML(including('User will reactivate after saving')).exists());
  },
};
