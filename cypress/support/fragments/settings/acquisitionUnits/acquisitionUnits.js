import uuid from 'uuid';
import {
  Button,
  TextField,
  MultiColumnListCell,
  Checkbox,
  Modal,
  Pane,
  Section,
  HTML,
  including,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const auListPane = Pane({ id: 'pane-ac-units-list' });
const viewCheckbox = Checkbox('View');
const saveAUButton = Button({ id: 'save-ac-unit-button' });
const findUserButton = Button({ id: 'clickable-plugin-find-user' });
const userSearchModal = Modal('Select User');
const searchTextField = TextField({ type: 'search' });
const firstSearchResult = MultiColumnListCell({ row: 0, columnIndex: 0 });
const saveButton = Button('Save');
const trashButton = Button({ icon: 'trash' });
const assignedUsersSection = Section({ id: 'memberships' });
const actionsButton = Button('Actions');
const auPaneDetails = Section({ id: 'pane-ac-units-details' });
const checkboxAll = Checkbox();
const searchButton = Button('Search');
const nameTextField = TextField({ name: 'name' });

const getDefaultAcquisitionUnit = ({
  name,
  protectRead = false,
  protectUpdate = true,
  protectCreate = true,
  protectDelete = true,
} = {}) => ({
  protectRead,
  protectUpdate,
  protectCreate,
  protectDelete,
  name: name || `autotest_acq_unit_${getRandomPostfix()}`,
  id: uuid(),
});

export default {
  defaultAcquisitionUnit: {
    name: `AU_${getRandomPostfix()}`,
  },
  getDefaultAcquisitionUnit,
  waitLoading: () => {
    cy.expect(auListPane.exists());
  },

  newAcquisitionUnit: () => {
    cy.do(Button('New').click());
  },

  fillInInfo(AUName) {
    cy.do([nameTextField.fillIn(AUName), viewCheckbox.click(), saveAUButton.click()]);
    this.assignAdmin();
    cy.wait(4000);
  },

  fillInAUInfo: (name) => {
    cy.do([nameTextField.fillIn(name), viewCheckbox.click(), saveAUButton.click()]);
    // need to wait,while page will be loaded after save
    cy.wait(6000);
  },

  assignUser: (userName) => {
    cy.do([
      findUserButton.click(),
      userSearchModal.find(searchTextField).fillIn(userName),
      searchButton.click(),
    ]);
    cy.wait(4000);
    cy.do([
      userSearchModal.find(firstSearchResult).find(checkboxAll).click(),
      userSearchModal.find(saveButton).click(),
    ]);
    cy.wait(4000);
  },

  assignAdmin: () => {
    cy.do([
      findUserButton.click(),
      userSearchModal.find(searchTextField).fillIn(Cypress.env('diku_login')),
      searchButton.click(),
      firstSearchResult.find(checkboxAll).click(),
      userSearchModal.find(saveButton).click(),
    ]);
    cy.wait(4000);
  },

  unAssignUser: (userName, AUName) => {
    cy.do(auListPane.find(Button(AUName)).click());
    cy.contains('div[class*="mclCell-"]', userName)
      .parent('div[class*="mclRow-"]')
      .find('button[icon="trash"]')
      .click();
    cy.wait(2000);
  },

  unAssignAdmin: (AUName) => {
    cy.do([
      auListPane.find(Button(AUName)).click(),
      assignedUsersSection
        .find(MultiColumnListCell({ row: 0, columnIndex: 2 }))
        .find(trashButton)
        .click(),
    ]);
  },

  delete: (AUName) => {
    cy.do([
      auListPane.find(Button(AUName)).click(),
      actionsButton.click(),
      Button('Delete').click(),
      Button('Confirm').click(),
    ]);
  },

  edit: (AUName) => {
    cy.do(auListPane.find(Button(AUName)).click());
    cy.expect(auPaneDetails.find(assignedUsersSection).exists());
    // //Need to wait,while data of Acquisition Unit will be loaded
    cy.wait(5000);
    cy.do(actionsButton.click());
    // //Need to wait,while wright link of Edit button will be loaded
    cy.wait(5000);
    cy.do(Button('Edit').click());
  },

  editAU: () => {
    cy.wait(5000);
    cy.do(actionsButton.click());
    // //Need to wait,while wright link of Edit button will be loaded
    cy.wait(5000);
    cy.do(Button('Edit').click());
  },

  selectAU: (AUName) => {
    cy.do(auListPane.find(Button(AUName)).click());
    cy.expect(auPaneDetails.find(assignedUsersSection).exists());
    // //Need to wait,while data of Acquisition Unit will be loaded
    cy.wait(5000);
  },

  selectViewCheckbox: () => {
    cy.expect(assignedUsersSection.exists());
    cy.do([viewCheckbox.click(), saveAUButton.click()]);
    cy.expect(auPaneDetails.find(assignedUsersSection).exists());
  },

  selectEditCheckbox: () => {
    cy.expect(assignedUsersSection.exists());
    cy.do([Checkbox('Edit').click(), saveAUButton.click()]);
    cy.expect(auPaneDetails.find(assignedUsersSection).exists());
  },

  getAcquisitionUnitViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'acquisitions-units/units',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  createAcquisitionUnitViaApi(acqUnit) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'acquisitions-units/units',
        body: acqUnit,
      })
      .then(({ body }) => body);
  },
  deleteAcquisitionUnitViaApi(acqUnitId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `acquisitions-units/units/${acqUnitId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  assignUserViaApi(userId, acquisitionsUnitId) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'acquisitions-units/memberships',
        body: {
          acquisitionsUnitId,
          userId,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body.id;
      });
  },
  unAssignUserViaApi(userId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `acquisitions-units/memberships/${userId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  clickActionsButton: () => {
    cy.do(actionsButton.click());
  },

  checkDeleteButtonDisabled: (isDisabled = true) => {
    cy.expect(Button(including('Delete')).has({ disabled: isDisabled, visible: true }));
  },

  clickDeleteOption: () => {
    cy.do(Button('Delete').click());
  },

  clickCancelInDeleteModal: () => {
    cy.do(Modal('Delete acquisition unit').find(Button('Cancel')).click());
  },

  clickConfirmInDeleteModal: () => {
    cy.do(Modal('Delete acquisition unit').find(Button('Confirm')).click());
  },

  checkAcquisitionUnitDeleted: (auName) => {
    cy.expect(auListPane.find(Button(auName)).absent());
  },

  checkDeleteModalAppears: () => {
    cy.expect(Modal('Delete acquisition unit').exists());
  },

  checkNoAssignedUsers: () => {
    cy.expect(assignedUsersSection.find(HTML('The list contains no items')).exists());
  },

  verifyNewButtonAbsent: () => {
    cy.expect(Button('New').absent());
  },

  verifyActionsButtonAbsent: () => {
    cy.expect(actionsButton.absent());
  },

  verifyAssignUsersButtonAbsent: () => {
    cy.expect(findUserButton.absent());
  },

  verifyDeleteIconAbsent: () => {
    cy.expect(assignedUsersSection.find(trashButton).absent());
  },

  collapseAll: () => {
    cy.do(Button('Collapse all').click());
  },

  expandAll: () => {
    cy.do(Button('Expand all').click());
  },

  verifyCollapseExpandAll: (isCollapsed = true) => {
    if (isCollapsed) {
      cy.expect([Button('Expand all').exists(), Button('Collapse all').absent()]);
    } else {
      cy.expect([Button('Collapse all').exists(), Button('Expand all').absent()]);
    }
  },
};
