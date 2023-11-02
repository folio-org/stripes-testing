import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { getTestEntityValue } from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import TagsGeneral from '../../support/fragments/settings/tags/tags-general';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('Permissions Tags', () => {
  let userData;
  let servicePointId;
  const patronGroup = {
    name: getTestEntityValue('groupTags'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
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
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C397329 Verify that permission: "Settings (Tags): Can enable or disable tags for all apps" works as expected (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      TagsGeneral.changeEnableTagsStatus('disable');
      cy.visit(TopMenu.invoicesPath);
      Invoices.waitLoading();
      Invoices.selectStatusFilter('Open');
      InvoiceView.selectFirstInvoice();
      InvoiceView.verifyTagsIsAbsent();

      cy.visit(SettingsMenu.tagsGeneralPath);
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
