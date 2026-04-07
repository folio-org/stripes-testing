import uuid from 'uuid';

import {
  Button,
  Callout,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  HTML,
  including,
  Link,
  TextArea,
  TextField,
} from '../../../../../../interactors';
import SettingsPane, { rootPane } from '../../settingsPane';
import LocationDetails from '../locations/locationDetails';
import AddressesConfig from '../addressesConfig';
import { randomFourDigitNumber } from '../../../../utils/stringTools';

const addButton = Button('New');
const deleteAddressButton = Button({ id: including('clickable-delete-addresses') });
const deleteAddressModal = Modal('Delete address');
const cancelButtonInDeleteAdressModal = deleteAddressModal.find(Button('Cancel'));
const deleteButtonInDeleteAdressModal = deleteAddressModal.find(Button('Delete'));
const deleteCalloutMessage = ['The address', 'was successfully', 'deleted'];

export default {
  ...SettingsPane,
  rootPane,
  waitLoading() {
    cy.expect(Pane('Addresses').exists());
  },
  clickNewButton() {
    cy.do(Button({ id: 'clickable-add-addresses' }).click());
  },
  fillInAddressName(name) {
    cy.do(TextField({ name: 'items[0].name' }).fillIn(name));
  },
  fillInAddressDetails(address) {
    cy.do(TextArea({ name: 'items[0].address' }).fillIn(address));
  },
  saveNewAddress() {
    cy.do(Button({ id: 'clickable-save-addresses-0' }).click());
    cy.wait(500);
  },
  createAddressViaUi({ name, address }) {
    this.clickNewButton();
    this.fillInAddressName(name);
    this.fillInAddressDetails(address);
    this.saveNewAddress();
  },
  verifyAddressInList(name) {
    cy.expect(MultiColumnListRow(including(name)).exists());
  },
  clickEditButtonForAddress(name) {
    cy.do(
      MultiColumnListRow(including(name), { isContainer: false })
        .find(Button({ icon: 'edit' }))
        .click(),
    );
  },
  fillInEditAddressName(newName) {
    cy.get('input[name$=".name"]').clear().type(newName);
  },
  fillInEditAddressDetails(newAddress) {
    cy.get('textarea[name$=".address"]').clear().type(newAddress);
  },
  clickCancelEditButton() {
    cy.do(Button({ id: including('clickable-cancel-addresses') }).click());
  },
  clickSaveEditButton() {
    cy.do(Button({ id: including('clickable-save-addresses') }).click());
    cy.wait(500);
  },
  verifyAddressIsInEditMode() {
    cy.get('input[name$=".name"]').should('be.visible');
  },
  verifyAddressIsNotInEditMode() {
    cy.get('input[name$=".name"]').should('not.exist');
  },
  openLastUpdated(name) {
    cy.do(
      MultiColumnListRow({ content: including(name), isContainer: true })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .find(Link({ href: including('/users/view') }))
        .click(),
    );
  },
  checkNoActionButtons() {
    cy.expect(addButton.absent());
    LocationDetails.checkActionButtonAbsent();
  },
  verifyNoPermissionWarning() {
    cy.expect(HTML("You don't have permission to view this app/record").exists());
  },
  clickDeleteButtonForAddressValue(addressValue) {
    cy.do(
      MultiColumnListRow(including(addressValue), { isContainer: false })
        .find(deleteAddressButton)
        .click(),
    );
  },
  verifyDeleteModalDisplayed() {
    cy.expect(deleteAddressModal.exists());
    cy.expect(cancelButtonInDeleteAdressModal.has({ disabled: false }));
    cy.expect(deleteButtonInDeleteAdressModal.has({ disabled: false }));
  },
  verifyDeleteModalIsNotDisplayed() {
    cy.expect(deleteAddressModal.absent());
  },
  clickDeleteButtonInDeleteModal() {
    cy.do(deleteButtonInDeleteAdressModal.click());
  },
  clickCancelButtonInDeleteModal() {
    cy.do(cancelButtonInDeleteAdressModal.click());
  },
  verifyCalloutForAddressDeletionAppears() {
    cy.expect(Callout({ textContent: including(deleteCalloutMessage[0]) }).exists());
    cy.expect(Callout({ textContent: including(deleteCalloutMessage[1]) }).exists());
    cy.expect(Callout({ textContent: including(deleteCalloutMessage[2]) }).exists());
  },
  addressRowWithValueIsAbsent(addressValue) {
    cy.expect(MultiColumnListRow(including(addressValue)).absent());
  },
  setAddress(config) {
    return AddressesConfig.createAddressViaApi(config);
  },
  createAddressViaApi(config) {
    return AddressesConfig.createAddressViaApi(config);
  },
  deleteAddressViaApi(config) {
    return AddressesConfig.deleteAddressViaApi(config);
  },
  generateAddressConfig({
    name = `autotest_address_name_${randomFourDigitNumber()}`,
    address = `autotest_address_value_${randomFourDigitNumber()}`,
  } = {}) {
    return {
      name,
      address,
      id: uuid(),
    };
  },
};
