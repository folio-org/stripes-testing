// cypress/e2e/orders/settings/suffixes-crud.cy.js
import { VENDOR_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import Organizations from '../../../support/fragments/organizations/organizations';
import { PrefixSuffix } from '../../../support/fragments/settings/orders/newPrefixSuffix';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

const suffixName = `${randomNDigitNumber(5)}`;
const suffixDesc = `Test suffix description ${getRandomPostfix()}`;
const editedSuffixName = `${suffixName}ed`;
const editedSuffixDesc = `${suffixDesc}_edited`;
const orderNumber = randomNDigitNumber(5);
const order = {
  ...NewOrder.defaultOneTimeOrder,
  poNumber: `${orderNumber}${editedSuffixName}`,
  poNumberSuffix: editedSuffixName,
};
let userData = {};

// Hierarchy: Orders › Settings › Suffixes
// Test ID: C15495
// Tags: extendedPath, thunderjet, C15495

describe('Orders', () => {
  describe('Settings', () => {
    describe('Suffixes', () => {
      before('Create test data', () => {
        cy.getAdminToken().then(() => {
          Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.AMAZON}"` }).then((organization) => {
            order.vendor = organization.id;
          });
          cy.createTempUser([
            Permissions.uiSettingsOrdersCanViewAllSettings.gui,
            Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
            Permissions.uiOrdersView.gui,
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
            Permissions.uiOrdersDelete.gui,
          ]).then((user) => {
            userData = user;
            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.settingsOrdersSuffixesPath,
                waiter: PrefixSuffix.waitLoadingSuffixes,
              });
              cy.reload();
              PrefixSuffix.waitLoadingSuffixes();
            }, 20000);
          });
        });
      });

      after('Delete test data and user', () => {
        cy.getAdminToken();
        Orders.deleteOrderViaApi(order.id);
        Users.deleteViaApi(userData.userId);
        PrefixSuffix.deleteSuffixByNameViaApi(suffixName);
        PrefixSuffix.deleteSuffixByNameViaApi(editedSuffixName);
      });

      it('C15495 CRUD Suffixes (thunderjet)', { tags: ['extendedPath', 'thunderjet', 'C15495'] }, () => {
        // Step 1: Open Suffixes settings
        // Step 2: Create new suffix
        PrefixSuffix.createNewSuffix(suffixName, suffixDesc);
        PrefixSuffix.checkSuffixExists(suffixName);

        // Step 3: Edit suffix
        PrefixSuffix.editSuffix(suffixName, editedSuffixName, editedSuffixDesc);
        PrefixSuffix.checkSuffixExists(editedSuffixName);

        // Step 4: Assign suffix to order
        cy.wait(1000);
        Orders.createOrderViaApi(order).then((response) => {
          order.id = response.id;
        });
        cy.wait(1000);

        // Step 5: Try to delete suffix in use
        PrefixSuffix.deleteSuffix(editedSuffixName);
        PrefixSuffix.checkDeleteSuffixConfirmationModal(editedSuffixName);
        PrefixSuffix.confirmDeleteSuffix();
        PrefixSuffix.checkCannotDeleteSuffixModal(editedSuffixName);
        PrefixSuffix.closeCannotDeleteSuffixModal();
        PrefixSuffix.checkSuffixExists(editedSuffixName);

        // Step 6: Delete order
        Orders.deleteOrderViaApi(order.id);

        // Step 7: Delete suffix
        PrefixSuffix.deleteSuffix(editedSuffixName);
        PrefixSuffix.checkDeleteSuffixConfirmationModal(editedSuffixName);
        PrefixSuffix.confirmDeleteSuffix();
        InteractorsTools.checkCalloutMessage(`The suffix ${editedSuffixName} was successfully deleted`);
        PrefixSuffix.checkSuffixNotExists(editedSuffixName);
      });
    });
  });
});
