import Permissions from '../../../support/dictionary/permissions';
import QueryModal, { instanceFieldValues } from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const testData = {
  user: {},
  listName: `AT_C736770_List_${getRandomPostfix()}`,
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();
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
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      if (testData.user.userId) {
        Users.deleteViaApi(testData.user.userId);
      }
    });

    it(
      'C736770 Verify that the "Affiliation name" is not displayed for the entity types other than Instances, Holdings, Items on Central tenant (consortia) (athena)',
      { tags: ['extendedPathECS', 'athena', 'C736770'] },
      () => {
        // purchaseOrderLinesWithTitles embeds instance data, so Instance — Affiliation name appears
        const entityTypes = [
          { recordType: Lists.recordTypes.budgets, hasAffiliationNameField: false },
          { recordType: Lists.recordTypes.fundWithLedger, hasAffiliationNameField: false },
          { recordType: Lists.recordTypes.invoiceLines, hasAffiliationNameField: false },
          { recordType: Lists.recordTypes.invoices, hasAffiliationNameField: false },
          { recordType: Lists.recordTypes.organizations, hasAffiliationNameField: false },
          { recordType: Lists.recordTypes.purchaseOrderLines, hasAffiliationNameField: false },
          {
            recordType: Lists.recordTypes.purchaseOrderLinesWithTitles,
            hasAffiliationNameField: true,
          },
          { recordType: Lists.recordTypes.purchaseOrders, hasAffiliationNameField: false },
          { recordType: Lists.recordTypes.transactions, hasAffiliationNameField: false },
          { recordType: Lists.recordTypes.users, hasAffiliationNameField: false },
          { recordType: Lists.recordTypes.voucherLinesWithFund, hasAffiliationNameField: false },
          {
            recordType: Lists.recordTypes.voucherLinesWithInvoiceFundOrganization,
            hasAffiliationNameField: false,
          },
          { recordType: Lists.recordTypes.vouchers, hasAffiliationNameField: false },
        ];

        Lists.openNewListPane();
        Lists.setName(testData.listName);

        entityTypes.forEach(({ recordType, hasAffiliationNameField }, index) => {
          if (index > 0) QueryModal.clickXButtton();
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();
          if (hasAffiliationNameField) {
            QueryModal.verifyAllAvailableFieldOptions([instanceFieldValues.affiliationName]);
          } else {
            QueryModal.filterFieldSelectionList('Affiliation name');
            QueryModal.verifyFieldOptionAbsentInTheList();
          }
        });
      },
    );
  });
});
