import permissions from '../../../support/dictionary/permissions';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import Invoices from '../../../support/fragments/invoices/invoices';
import TagsGeneral from '../../../support/fragments/settings/tags/tags-general';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import topMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('Inventory', () => {
  describe('Tags (Inventory)', () => {
    let userData;
    let servicePointId;
    const patronGroup = {
      name: getTestEntityValue('groupTags'),
    };

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
          servicePointId = servicePoint.id;
        });
        PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;
        });
        cy.createTempUser(
          [
            permissions.uiUserCanEnableDisableTags.gui,
            permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
          ],
          patronGroup.name,
        ).then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.tagsGeneralPath,
            waiter: TagsGeneral.waitLoading,
          });
        });
      });
    });

    after('Deleting created entities', () => {
      // Let's enable tags settings, in case the test fails,
      // to not break other tests in other threads
      cy.visit(SettingsMenu.tagsGeneralPath);
      TagsGeneral.waitLoading();
      TagsGeneral.changeEnableTagsStatus('enable');

      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
    });

    it(
      'C397329 Verify that permission: "Settings (Tags): Can enable or disable tags for all apps" works as expected (volaris)',
      { tags: ['criticalPath', 'volaris', 'C397329'] },
      () => {
        TagsGeneral.changeEnableTagsStatus('disable');
        topMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.waitLoading();
        Invoices.selectStatusFilter('Open');
        InvoiceView.selectFirstInvoice();
        InvoiceView.verifyTagsIsAbsent();

        topMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        TagsGeneral.waitLoading();
        TagsGeneral.changeEnableTagsStatus('enable');
        cy.visit(TopMenu.invoicesPath);
        Invoices.waitLoading();
        Invoices.selectStatusFilter('Open');
        InvoiceView.selectFirstInvoice();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
      },
    );
  });
});
