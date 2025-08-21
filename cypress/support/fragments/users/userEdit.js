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
const externalUrlButton = Button({ dataTestID: 'externalURL' });
const deletePictureButton = Button({ dataTestID: 'delete' });
const keepEditingBtn = Button('Keep editing');
const closeWithoutSavingButton = Button('Close without saving');
const saveExternalLinkBtn = updateProfilePictureModal.find(
  Button({ id: 'save-external-link-btn' }),
);
const selectRequestType = Select({ id: 'type' });
const selectReadingRoomAccess = Select({ id: 'reading-room-access-select' });
const profilePictureCard = Image({ alt: 'Profile picture' });

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
      userPermissionsAccordion.exists(),
      servicePointsAccordion.exists(),
    ]);
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
      userPermissionsAccordion.exists(),
      servicePointsAccordion.exists(),
    ]);
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
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
    cy.do(saveAndCloseBtn.click());
    cy.expect(rootPane.absent());
  },

  clickCloseWithoutSavingIfModalExists() {
    cy.do(cancelButton.click());
    cy.get('body').then(($body) => {
      if ($body.find('[class^=modal-]').length > 0) {
        cy.do(areYouSureForm.find(closeWithoutSavingButton).click());
      }
    });
  },

  saveEditedUser() {
    cy.intercept('PUT', '/users/*').as('updateUser');
    this.saveAndClose();
    cy.wait('@updateUser', { timeout: 100000 });
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

  enterValidValueToCreateViaUi: (userData, patronGroup) => {
    return cy
      .do([
        TextField({ id: 'adduser_lastname' }).fillIn(userData.personal.lastName),
        Select({ id: 'adduser_group' }).choose(patronGroup),
        Modal({ id: 'recalculate_expirationdate_modal' }).find(Button('Set')).click(),
        TextField({ name: 'barcode' }).fillIn(userData.barcode),
        TextField({ name: 'username' }).fillIn(userData.username),
        TextField({ id: 'adduser_email' }).fillIn(userData.personal.email),
        saveAndCloseBtn.click(),
      ])
      .then(() => {
        cy.intercept('/users').as('user');
        return cy.wait('@user', { timeout: 80000 }).then((xhr) => xhr.response.body.id);
      });
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

  verifyUserPermissionsAccordion() {
    cy.expect(permissionsAccordion.exists());
    cy.expect(permissionsAccordion.has({ open: false }));
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
};
