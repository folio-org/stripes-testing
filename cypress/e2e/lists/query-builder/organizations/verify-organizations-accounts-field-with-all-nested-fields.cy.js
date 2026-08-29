import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';
import { ORGANIZATION_PAYMENT_METHODS } from '../../../../support/constants/organizations/organization';

const testCaseId = 'C1453711';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const testData = {
  organization: {
    id: null,
    code: null,
    name: `AT_${testCaseId}_Org_${getRandomPostfix()}`,
  },
  account: {
    name: `test account_${getRandomPostfix()}`,
    accountNo: `12345_${getRandomPostfix()}`,
    description: `account description_${getRandomPostfix()}`,
    accountingCode: `112233_${getRandomPostfix()}`,
    paymentMethod: ORGANIZATION_PAYMENT_METHODS.CASH,
    status: 'Active',
    contactInfo: `094062672_${getRandomPostfix()}`,
    libraryCode: `25_${getRandomPostfix()}`,
    libraryEdiCode: `254_${getRandomPostfix()}`,
    notes: `account notes_${getRandomPostfix()}`,
  },
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        // Create organization with account
        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: testData.organization.name,
          accounts: [
            {
              name: testData.account.name,
              accountNo: testData.account.accountNo,
              description: testData.account.description,
              appSystemNo: testData.account.accountingCode,
              paymentMethod: testData.account.paymentMethod,
              contactInfo: testData.account.contactInfo,
              libraryCode: testData.account.libraryCode,
              libraryEdiCode: testData.account.libraryEdiCode,
              notes: testData.account.notes,
              accountStatus: testData.account.status,
              acqUnitIds: [],
            },
          ],
        }).then((id) => {
          testData.organization.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.organization.code = org.code;
          });
        });

        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.uiOrganizationsViewEditDelete.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName);

        if (testData.organization?.id) {
          Organizations.deleteOrganizationViaApi(testData.organization.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453711 Verify 'Organizations Accounts' field with all nested fields - 1 (athena)",
        { tags: ['extendedPath', 'athena', 'C1453711'] },
        () => {
          // Step 1: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click on "Build query" button
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Verify field options exist for all account nested fields
          QueryModal.verifyFieldOptionExists([
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.NAME,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.ACCOUNT_NUMBER,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.DESCRIPTION,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.ACCOUNTING_CODE,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.PAYMENT_METHOD,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.STATUS,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.CONTACT_INFO,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.LIBRARY_CODE,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.LIBRARY_EDI_CODE,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.NOTES,
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.ACQUISITIONS_UNIT_NAMES,
          ]);

          // Step 4: Select "Organizations - Accounts - Name" option
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.NAME);
          QueryModal.verifyQueryAreaContent('');

          // Step 5: Verify operators list
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 6: Select "equals" option
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

          // Step 7: Fill in the "Value" input field with account name
          QueryModal.fillInValueTextfield(testData.account.name);

          // Step 8: Add new row for Account number filter
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.ACCOUNT_NUMBER, 1);
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->name == ${testData.account.name})`,
          );

          // Step 9: Select "starts with" option
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);

          // Step 10: Fill in the "Value" input field with account number prefix
          QueryModal.fillInValueTextfield('12', 1);

          // Step 11: Add new row for Description filter
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.DESCRIPTION, 2);

          // Step 12: Select "contains" option
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 2);

          // Step 13: Fill in the "Value" input field with description
          QueryModal.fillInValueTextfield('account', 2);
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->name == ${testData.account.name}) AND (organization.accounts[*]->account_no starts with 12) AND (organization.accounts[*]->description contains account)`,
          );

          // Step 14: Add new row for Accounting code filter
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.ACCOUNTING_CODE, 3);

          // Step 15: Select "equals" option
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 3);

          // Step 16: Fill in the "Value" input field with accounting code
          QueryModal.fillInValueTextfield(testData.account.accountingCode, 3);
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->name == ${testData.account.name}) AND (organization.accounts[*]->account_no starts with 12) AND (organization.accounts[*]->description contains account) AND (organization.accounts[*]->app_system_no == ${testData.account.accountingCode})`,
          );

          // Step 17: Add new row for Payment method filter
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.PAYMENT_METHOD, 4);

          // Step 18: Select "in" option and select "Cash" value
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 4);
          QueryModal.chooseFromValueMultiselect(testData.account.paymentMethod, 4, {
            exactMatch: true,
          });
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->name == ${testData.account.name}) AND (organization.accounts[*]->account_no starts with 12) AND (organization.accounts[*]->description contains account) AND (organization.accounts[*]->app_system_no == ${testData.account.accountingCode}) AND (organization.accounts[*]->payment_method in [${testData.account.paymentMethod}])`,
          );

          // Step 19: Click on "Test query" button
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 20: Check the preview of found records
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS_COLUMN);
          QueryModal.verifyOrganizationAccountsEmbeddedTableInQueryModal(
            testData.organization.code,
            {
              name: testData.account.name,
              accountNumber: testData.account.accountNo,
              description: testData.account.description,
              accountingCode: testData.account.accountingCode,
              paymentMethod: testData.account.paymentMethod,
              status: testData.account.status,
              contactInfo: testData.account.contactInfo,
              libraryCode: testData.account.libraryCode,
              libraryEdiCode: testData.account.libraryEdiCode,
              notes: testData.account.notes,
            },
          );

          // Step 21: Click on "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 22: Verify the result after the refresh is done
          Lists.waitForCompilingAnimationToDisappear();

          // Step 23: Click on "View updated list" link on the toast message
          Lists.viewUpdatedList();
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS_COLUMN);

          // Step 24: Click on "Actions" button and check the "Organizations -- Accounts" checkbox
          Lists.openActions();
          Lists.selectResultColumn(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS_COLUMN);
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS_COLUMN);
          Lists.verifyEmbeddedTableInResultsRow(
            'organizationAccounts',
            testData.organization.code,
            {
              name: testData.account.name,
              accountNumber: testData.account.accountNo,
              description: testData.account.description,
              accountingCode: testData.account.accountingCode,
              paymentMethod: testData.account.paymentMethod,
              status: testData.account.status,
              contactInfo: testData.account.contactInfo,
              libraryCode: testData.account.libraryCode,
              libraryEdiCode: testData.account.libraryEdiCode,
              notes: testData.account.notes,
            },
          );
        },
      );
    });
  });
});
