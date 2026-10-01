import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';

const testCaseId = 'C1453713';
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
    paymentMethod: 'Cash',
    status: 'Active',
    contactInfo: `${randomNDigitNumber(10)}`,
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
        "C1453713 Verify 'Organizations Accounts' field with all nested fields - 2 (athena)",
        { tags: ['extendedPath', 'athena', 'C1453713'] },
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

          // Step 4: Select "Organizations - Accounts - Contact info" option
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.CONTACT_INFO);
          QueryModal.verifyQueryAreaContent('');

          // Step 5: Verify operators list
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 6: Select "starts with" option
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);

          // Step 7: Fill in the "Value" input field with "09"
          const contactInfoMatch = testData.account.contactInfo.slice(0, 4);

          QueryModal.fillInValueTextfield(contactInfoMatch);

          // Step 8: Add new row for Library code filter
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.LIBRARY_CODE, 1);
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->contact_info starts with ${contactInfoMatch})`,
          );

          // Step 9: Select "contains" option
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);

          // Step 10: Fill in the "Value" input field with "25"
          QueryModal.fillInValueTextfield('25', 1);

          // Step 11: Add new row for Library EDI code filter
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.LIBRARY_EDI_CODE, 2);

          // Step 12: Select "equals" option
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);

          // Step 13: Fill in the "Value"
          QueryModal.fillInValueTextfield(testData.account.libraryEdiCode, 2);
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->contact_info starts with ${contactInfoMatch}) AND (organization.accounts[*]->library_code contains 25) AND (organization.accounts[*]->library_edi_code == ${testData.account.libraryEdiCode})`,
          );

          // Step 14: Add new row for Notes filter
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.NOTES, 3);

          // Step 15: Select "contains" option
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 3);

          // Step 16: Fill in the "Value" input field with "note"
          QueryModal.fillInValueTextfield('note', 3);
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->contact_info starts with ${contactInfoMatch}) AND (organization.accounts[*]->library_code contains 25) AND (organization.accounts[*]->library_edi_code == ${testData.account.libraryEdiCode}) AND (organization.accounts[*]->notes contains note)`,
          );

          // Step 17: Add new row for Status filter
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.STATUS, 4);

          // Step 18: Select "in" option and select "Active" value
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 4);
          QueryModal.chooseFromValueMultiselect('Active', 4, {
            exactMatch: true,
          });
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->contact_info starts with ${contactInfoMatch}) AND (organization.accounts[*]->library_code contains 25) AND (organization.accounts[*]->library_edi_code == ${testData.account.libraryEdiCode}) AND (organization.accounts[*]->notes contains note) AND (organization.accounts[*]->account_status in [Active])`,
          );

          // Step 19: Add new row for Acquisition unit names filter
          QueryModal.addNewRow();
          QueryModal.selectField(
            ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.ACQUISITIONS_UNIT_NAMES,
            5,
          );

          // Step 20: Select "is null/empty" option and select "True" value
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 5);
          QueryModal.chooseValueSelect('True', 5, {
            exactMatch: true,
          });
          QueryModal.verifyQueryAreaContent(
            `(organization.accounts[*]->contact_info starts with ${contactInfoMatch}) AND (organization.accounts[*]->library_code contains 25) AND (organization.accounts[*]->library_edi_code == ${testData.account.libraryEdiCode}) AND (organization.accounts[*]->notes contains note) AND (organization.accounts[*]->account_status in [Active]) AND (organization.accounts[*]->acq_unit is null/empty True)`,
          );

          // Step 21: Click on "Test query" button
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 22: Check the preview of found records
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

          // Step 23: Click on "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 24: Verify the result after the refresh is done
          Lists.waitForCompilingAnimationToDisappear();

          // Step 25: Click on "View updated list" link on the toast message
          Lists.viewUpdatedList();
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS_COLUMN);

          // Step 26: Click on "Actions" button and check the "Organizations -- Accounts" checkbox
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
