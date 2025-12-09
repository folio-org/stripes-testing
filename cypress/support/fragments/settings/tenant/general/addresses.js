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
} from '../../../../../../interactors';
import SettingsPane, { rootPane } from '../../settingsPane';
import LocationDetails from '../locations/locationDetails';
import Configs from '../../configs';
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
  setAddress(body) {
    return Configs.createConfigViaApi({
      module: `TENANT_${randomFourDigitNumber()}`,
      configName: 'tenant.addresses',
      value: JSON.stringify(body),
    });
  },
  createAddressViaApi(config) {
    Configs.createConfigViaApi(config);
  },
  deleteAddressViaApi(config) {
    return Configs.deleteConfigViaApi(config);
  },
  generateAddressConfig({
    name = `autotest_address_name_${randomFourDigitNumber()}`,
    address = `autotest_address_value_${randomFourDigitNumber()}`,
  } = {}) {
    return {
      value: { name, address },
      scope: 'ui-tenant-settings.addresses.manage',
      key: `ADDRESS_${randomFourDigitNumber()}`,
      id: uuid(),
    };
  },
};
