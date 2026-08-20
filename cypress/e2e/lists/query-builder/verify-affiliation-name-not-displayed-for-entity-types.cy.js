import Permissions from '../../../support/dictionary/permissions';
import QueryModal from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const listName = `AT_C736772_List_${getRandomPostfix()}`;
const recordTypes = [
  Lists.recordTypes.budgets,
  Lists.recordTypes.items,
  Lists.recordTypes.instances,
  Lists.recordTypes.holdings,
  Lists.recordTypes.fundWithLedger,
  Lists.recordTypes.invoiceLines,
  Lists.recordTypes.invoices,
  Lists.recordTypes.organizations,
  Lists.recordTypes.purchaseOrderLines,
  Lists.recordTypes.purchaseOrderLinesWithTitles,
  Lists.recordTypes.purchaseOrders,
  Lists.recordTypes.transactions,
  Lists.recordTypes.users,
  Lists.recordTypes.voucherLinesWithFund,
  Lists.recordTypes.voucherLinesWithInvoiceFundOrganization,
  Lists.recordTypes.vouchers,
];

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiOrganizationsViewEditDelete.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersDelete.gui,
        Permissions.uiFinanceViewEditDeleteFundBudget.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.loansAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C736772 Verify that the "Affiliation name" is not displayed for the entity types in non-ECS environments (athena)',
      { tags: ['extendedPath', 'athena', 'C736772'] },
      () => {
        // Step 1: Open new list pane, set name, select first record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(recordTypes[0]);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Search for the field "Affiliation name" and verify it is not found
        QueryModal.filterFieldSelectionList('Affiliation name');
        QueryModal.verifyFieldOptionAbsentInTheList();

        // Steps 3-32: Repeat for each remaining entity type
        recordTypes.slice(1).forEach((recordType) => {
          QueryModal.clickXButtton();
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.filterFieldSelectionList('Affiliation name');
          QueryModal.verifyFieldOptionAbsentInTheList();
        });
      },
    );
  });
});
