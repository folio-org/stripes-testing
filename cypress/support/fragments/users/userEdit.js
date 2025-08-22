import { HTML, including } from '@interactors/html';
import { v4 as uuidv4 } from 'uuid';
import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  Image,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  Pane,
  RadioButton,
  RadioButtonGroup,
  SearchField,
  Section,
  Select,
  SelectionOption,
  TextArea,
  TextField,
  Spinner,
  ListItem,
  List,
  or,
  not,
} from '../../../../interactors';
import SelectUser from '../check-out-actions/selectUser';
import TopMenu from '../topMenu';
import defaultUser from './userDefaultObjects/defaultUser';

const rootPane = Pane('Edit');
const userDetailsPane = Pane({ id: 'pane-userdetails' });

const permissionsList = MultiColumnList({ id: '#list-permissions' });
const saveAndCloseBtn = Button('Save & close');
const actionsButton = Button('Actions');
const permissionsAccordion = Accordion({ id: 'permissions' });
const userInformationAccordion = Accordion('User information');
const affiliationsAccordion = Accordion('Affiliations');
const extendedInformationAccordion = Accordion('Extended information');
const contactInformationAccordion = Accordion('Contact information');
const customFieldsAccordion = Accordion('Custom fields');
const userPermissionsAccordion = Accordion('User permissions');
const servicePointsAccordion = Accordion('Service points');
const patronBlocksAccordion = Accordion('Patron blocks');
const proxySponsorAccordion = Accordion('Proxy/sponsor');
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
const userSearch = TextField('User search');
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
const lastNameField = TextField({ id: 'adduser_lastname' });
const firstNameField = TextField({ id: 'adduser_firstname' });
const emailField = TextField({ id: 'adduser_email' });
const userRoleDeleteIcon = Button({ id: including('clickable-remove-user-role') });
const profilePictureCard = Image({ alt: 'Profile picture' });
const externalUrlButton = Button({ dataTestID: 'externalURL' });
const deletePictureButton = Button({ dataTestID: 'delete' });
const keepEditingBtn = Button('Keep editing');
const closeWithoutSavingButton = Button('Close without saving');
const saveExternalLinkBtn = updateProfilePictureModal.find(
  Button({ id: 'save-external-link-btn' }),
);
const selectRequestType = Select({ id: 'type' });
const selectReadingRoomAccess = Select({ id: 'reading-room-access-select' });
const promoteUserModal = Modal('Keycloak user record');
const confirmButton = Button('Confirm');
const promoteUserModalText = 'This operation will create new record in Keycloak for';
const barcodeField = TextField({ id: 'adduser_barcode' });
const usernameField = TextField({ id: 'adduser_username' });
const addressSelect = Select({ id: 'adduser_group' });
const setExpirationDateButton = Button('Set');

let totalRows;

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
    cy.expect(rootPane.exists());
  },

  changeMiddleName(midName) {
    cy.do(TextField({ id: 'adduser_middlename' }).fillIn(midName));
  },

  changePreferredFirstName(prefName) {
    cy.do(TextField({ id: 'adduser_preferredname' }).fillIn(prefName));
  },

  changeUserType(type = 'Patron') {
    cy.do(Select({ id: 'type' }).choose(type));
  },

  changePreferredContact(contact = 'Email') {
    cy.do(Select({ id: 'adduser_preferredcontact' }).choose(contact));
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
    cy.do(Button({ id: 'clickable-save' }).click());
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
      cy.do(Button('Search').click());
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
    cy.do(Button('Search').click());
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

  addServicePoints(...points) {
    cy.do([
      Button({ id: 'accordion-toggle-button-servicePoints' }).click(),
      Button({ id: 'add-service-point-btn' }).click(),
    ]);

    points.forEach((point) => {
      cy.do(MultiColumnListRow({ content: point, isContainer: true }).find(Checkbox()).click());
    });

    cy.do(Modal().find(saveAndCloseBtn).click());
  },

  selectPreferableServicePoint(point) {
    cy.do(Select({ id: 'servicePointPreference' }).choose(point));
  },

  openServicePointsAccordion() {
    cy.do(Button({ id: 'accordion-toggle-button-servicePointsSection' }).click());
  },

  openReadingRoomAccessAccordion() {
    cy.do(readingRoomAccessAccordion.clickHeader());
    cy.expect(readingRoomAccessAccordion.find(MultiColumnList()).exists());
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
    cy.do([Button('Cancel').click(), Button('Close without saving').click()]);
  },

  cancelEdit() {
    cy.do(Button('Cancel').click());
  },

  saveAndClose() {
    cy.wait(1000);
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
    cy.do(saveAndCloseBtn.click());
    cy.expect(rootPane.absent());
  },

  saveEditedUser() {
    cy.intercept('PUT', '/users/*').as('updateUser');
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
      Button('Search').click(),
      MultiColumnList().click({ row: 0, column: 'Active' }),
      userDetailsPane.find(actionsButton).click(),
      Button({ id: 'clickable-edituser' }).click(),
      Button({ id: 'accordion-toggle-button-servicePoints' }).click(),
      Select({ id: 'servicePointPreference' }).choose('None'),
      Button({ id: 'clickable-save' }).click(),
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
      cy.okapiRequest({
        method: 'PUT',
        path: `service-points-users/${servicePointsUsers.body.servicePointsUsers[0].id}`,
        body: {
          userId,
          servicePointsIds: servicePointIds,
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

  chooseRequestType(requestType) {
    cy.do(selectRequestType.choose(requestType));
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

  editUsername(username) {
    cy.do(TextField({ id: 'adduser_username' }).fillIn(username));
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
    cy.do(Button('Search').click());
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
      selectRequestType.has({ content: including('Patron') }),
      selectRequestType.has({ content: including('Staff') }),
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

  fillRequiredFields: (userLastName, patronGroup, email, userType = null, userName = null) => {
    if (userType) cy.do(Select({ id: 'type' }).choose(userType));
    if (userName) cy.do(TextField({ id: 'adduser_username' }).fillIn(userName));
    cy.do([
      TextField({ id: 'adduser_lastname' }).fillIn(userLastName),
      Select({ id: 'adduser_group' }).choose(patronGroup),
      TextField({ id: 'adduser_email' }).fillIn(email),
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

  clickUserRolesAccordion(isExpanded = true) {
    cy.do(userRolesAccordion.clickHeader());
    cy.expect([
      userRolesAccordion.has({ open: isExpanded }),
      addRolesButton.exists(),
      unassignAllRolesButton.has({ disabled: or(true, false) }),
    ]);
  },

  verifyUserRolesAccordionEmpty() {
    cy.expect(userRolesAccordion.find(ListItem()).absent());
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
    cy.wait(1000);
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
    cy.wait(1000);
    cy.do(selectRolesModal.find(saveAndCloseBtn).click());
    cy.expect(selectRolesModal.absent());
  },

  verifyUserRoleNames(roleNames) {
    roleNames.forEach((roleName) => {
      cy.expect(
        userRolesAccordion
          .find(
            ListItem(including(roleName)).find(
              Button({ id: including('clickable-remove-user-role') }),
            ),
          )
          .exists(),
      );
    });
  },

  verifyUserRoleNamesOrdered(roleNames) {
    roleNames.forEach((roleName, index) => {
      cy.expect(
        userRolesAccordion
          .find(ListItem(including(roleName), { index }).find(userRoleDeleteIcon))
          .exists(),
      );
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
  },

  fillEmailAddress(email) {
    cy.do(emailField.fillIn(email));
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
};
