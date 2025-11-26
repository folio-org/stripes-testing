// cypress/e2e/orders/settings/prefixes-crud.cy.js
import {
  VENDOR_NAMES
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import Organizations from '../../../support/fragments/organizations/organizations';
import { PrefixSuffix } from '../../../support/fragments/settings/orders/newPrefixSuffix';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

const prefixName = `${randomNDigitNumber(5)}`;
const prefixDesc = `Test prefix description ${getRandomPostfix()}`;
const editedPrefixName = `${prefixName}ed`;
const editedPrefixDesc = `${prefixDesc}_edited`;
const orderNumber = randomNDigitNumber(5);
const order = {
  ...NewOrder.defaultOneTimeOrder,
  poNumber: `${editedPrefixName}${orderNumber}`,
  poNumberPrefix: editedPrefixName
};
let userData = {};

// Hierarchy: Orders › Settings › Prefixes
// Test ID: C15494
// Tags: extendedPath, thunderjet, C15494

describe('Orders', () => {
  describe('Settings', () => {
    describe('Prefixes', () => {
      before('Create test data', () => {
        cy.getAdminToken().then(() => {
          Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.AMAZON}"` }).then(
            (organization) => {
              order.vendor = organization.id;
            },
          ).then(() => {

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
                path: TopMenu.settingsOrdersPrefixesPath,
                waiter: PrefixSuffix.waitLoadingPrefixes,
              });
              cy.reload();
              PrefixSuffix.waitLoadingPrefixes();
            }, 20000);
          });
        });
      });

      after('Delete test data and user', () => {
        cy.getAdminToken();
        Orders.deleteOrderViaApi(order.id);
        Users.deleteViaApi(userData.userId);
        PrefixSuffix.deletePrefixByNameViaApi(prefixName);
        PrefixSuffix.deletePrefixByNameViaApi(editedPrefixName);
      });


      it('C15494 CRUD Prefixes (thunderjet)', { tags: ['extendedPath', 'thunderjet', 'C15494'] }, () => {
        // Step 1: Open Prefixes settings
        // Step 2: Create new prefix
        PrefixSuffix.createNewPrefix(prefixName, prefixDesc);
        PrefixSuffix.checkPrefixExists(prefixName);

        // Step 3: Edit prefix
        PrefixSuffix.editPrefix(prefixName, editedPrefixName, editedPrefixDesc);
        PrefixSuffix.checkPrefixExists(editedPrefixName);

        // Step 4: Assign prefix to order
        cy.wait(1000);
        Orders.createOrderViaApi(order).then((response) => {
          order.id = response.id;
        });
        cy.wait(1000);

        // Step 5: Try to delete prefix in use
        PrefixSuffix.deletePrefix(editedPrefixName);
        PrefixSuffix.checkDeletePrefixConfirmationModal(editedPrefixName);
        PrefixSuffix.confirmDeletePrefix();
        PrefixSuffix.checkCannotDeletePrefixModal(editedPrefixName);
        PrefixSuffix.closeCannotDeletePrefixModal();
        PrefixSuffix.checkPrefixExists(editedPrefixName);

        // Step 6: Delete order
        Orders.deleteOrderViaApi(order.id);
        cy.wait(1000);

        // Step 7: Delete prefix
        PrefixSuffix.deletePrefix(editedPrefixName);
        PrefixSuffix.checkDeletePrefixConfirmationModal(editedPrefixName);
        PrefixSuffix.confirmDeletePrefix();
        InteractorsTools.checkCalloutMessage(
          `The prefix ${editedPrefixName} was successfully deleted`,
        );
        PrefixSuffix.checkPrefixNotExists(editedPrefixName);
      });
    });
  });
});
