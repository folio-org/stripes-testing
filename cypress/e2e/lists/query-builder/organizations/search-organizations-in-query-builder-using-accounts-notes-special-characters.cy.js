import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import {
  convertToCsvHeaders,
  organizationCsvHeaders,
} from '../../../../support/fragments/lists/lists-file';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';

const testCaseId = 'C1525843';
const listName1 = `AT_${testCaseId}_List1_${getRandomPostfix()}`;
const listName2 = `AT_${testCaseId}_List2_${getRandomPostfix()}`;
const randomSuffix = randomFourDigitNumber();
const notesContainsValue = `"library's ${randomSuffix} purchasing credentials -- username (texas) and pword (texas987)" per email from vendor 1/28/26/TOrtiz`;
const notesStartsWithValue = `NOTE<"library's ${randomSuffix} purchasing`;
const organizationAccountsCsvHeader = convertToCsvHeaders({
  ACCOUNTS_COLUMN: ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS_COLUMN,
}).ACCOUNTS_COLUMN;

const testData = {
  firstOrganization: {
    id: null,
    code: null,
    name: `AT_${testCaseId}_FirstOrganization_${getRandomPostfix()}`,
    account1: {
      name: `AT_${testCaseId}_FirstOrganization_Acc1_${getRandomPostfix()}`,
      accountNo: `ACC1_${getRandomPostfix()}`,
      description: 'First organization account 1',
      appSystemNo: `AS1_${getRandomPostfix()}`,
      paymentMethod: 'Cash',
      accountStatus: 'Active',
      contactInfo: 'acc1@firstorganization.test',
      libraryCode: 'LIB1',
      libraryEdiCode: 'EDI1',
      notes: `NOTE<${notesContainsValue}>`,
    },
    account2: {
      name: `AT_${testCaseId}_FirstOrganization_Acc2_${getRandomPostfix()}`,
      accountNo: `ACC2_${getRandomPostfix()}`,
      description: 'First organization account 2',
      appSystemNo: `AS2_${getRandomPostfix()}`,
      paymentMethod: 'Cash',
      accountStatus: 'Active',
      contactInfo: 'acc2@firstorganization.test',
      libraryCode: 'LIB2',
      libraryEdiCode: 'EDI2',
      notes: 'Confirmed renewal terms with vendor accounting contact for FY26.',
    },
  },
  secondOrganization: {
    id: null,
    code: null,
    name: `AT_${testCaseId}_SecondOrganization_${getRandomPostfix()}`,
    account1: {
      name: `AT_${testCaseId}_SecondOrganization_Acc1_${getRandomPostfix()}`,
      accountNo: `BACC1_${getRandomPostfix()}`,
      description: 'Second organization account 1',
      appSystemNo: `BAS1_${getRandomPostfix()}`,
      paymentMethod: 'Cash',
      accountStatus: 'Active',
      contactInfo: 'acc1@secondorganization.test',
      libraryCode: 'BLIB1',
      libraryEdiCode: 'BEDI1',
      notes: `Vendor discussion referenced "library's ${randomSuffix} purchasing cred`,
    },
    account2: {
      name: `AT_${testCaseId}_SecondOrganization_Acc2_${getRandomPostfix()}`,
      accountNo: `BACC2_${getRandomPostfix()}`,
      description: 'Second organization account 2',
      appSystemNo: `BAS2_${getRandomPostfix()}`,
      paymentMethod: 'Cash',
      accountStatus: 'Active',
      contactInfo: 'acc2@secondorganization.test',
      libraryCode: 'BLIB2',
      libraryEdiCode: 'BEDI2',
      notes:
        'entials -- username (texas) and pword (texas987)" per email from vendor 1/28/26/TOrtiz — unrelated internal follow-up, different vendor.',
    },
  },
  thirdOrganization: {
    id: null,
    code: null,
    name: `AT_${testCaseId}_ThirdOrganization_${getRandomPostfix()}`,
    account1: {
      name: `AT_${testCaseId}_ThirdOrganization_Acc1_${getRandomPostfix()}`,
      accountNo: `GACC1_${getRandomPostfix()}`,
      description: 'Third organization account 1',
      appSystemNo: `GAS1_${getRandomPostfix()}`,
      paymentMethod: 'Cash',
      accountStatus: 'Active',
      contactInfo: 'acc1@thirdorganization.test',
      libraryCode: 'GLIB1',
      libraryEdiCode: 'GEDI1',
      notes: 'Standard net-30 payment terms confirmed with accounting.',
    },
  },
};
let user;

const toApiAccount = (account) => ({
  name: account.name,
  accountNo: account.accountNo,
  description: account.description,
  appSystemNo: account.appSystemNo,
  paymentMethod: account.paymentMethod,
  contactInfo: account.contactInfo,
  libraryCode: account.libraryCode,
  libraryEdiCode: account.libraryEdiCode,
  notes: account.notes,
  accountStatus: account.accountStatus,
  acqUnitIds: [],
});

const toEmbeddedTableAccount = (account) => ({
  name: account.name,
  accountNumber: account.accountNo,
  description: account.description,
  accountingCode: account.appSystemNo,
  paymentMethod: account.paymentMethod,
  status: account.accountStatus,
  contactInfo: account.contactInfo,
  libraryCode: account.libraryCode,
  libraryEdiCode: account.libraryEdiCode,
  notes: account.notes,
});

const expectedFirstOrganizationAccounts = [
  toEmbeddedTableAccount(testData.firstOrganization.account1),
  toEmbeddedTableAccount(testData.firstOrganization.account2),
];

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: testData.firstOrganization.name,
          accounts: [
            toApiAccount(testData.firstOrganization.account1),
            toApiAccount(testData.firstOrganization.account2),
          ],
        }).then((id) => {
          testData.firstOrganization.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.firstOrganization.code = org.code;
          });
        });

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: testData.secondOrganization.name,
          accounts: [
            toApiAccount(testData.secondOrganization.account1),
            toApiAccount(testData.secondOrganization.account2),
          ],
        }).then((id) => {
          testData.secondOrganization.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.secondOrganization.code = org.code;
          });
        });

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: testData.thirdOrganization.name,
          accounts: [toApiAccount(testData.thirdOrganization.account1)],
        }).then((id) => {
          testData.thirdOrganization.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.thirdOrganization.code = org.code;
          });
        });

        cy.createTempUser([Permissions.listsAll.gui, Permissions.uiOrganizationsView.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName1);
        Lists.deleteListByNameViaApi(listName2);
        Lists.deleteDownloadedFile(listName1);

        if (testData.firstOrganization.id) {
          Organizations.deleteOrganizationViaApi(testData.firstOrganization.id);
        }
        if (testData.secondOrganization.id) {
          Organizations.deleteOrganizationViaApi(testData.secondOrganization.id);
        }
        if (testData.thirdOrganization.id) {
          Organizations.deleteOrganizationViaApi(testData.thirdOrganization.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      // The test will fail in Trillium until MODFQMMGR-1208 is deployed
      it(
        'C1525843 User can query Organizations by "contains" on repeatable "Organization — Accounts — Notes" field with special characters (athena)',
        { tags: ['extendedPath', 'athena', 'C1525843'] },
        () => {
          // Step 1: Create new list with Organizations record type and open "Build query"
          Lists.openNewListPane();
          Lists.setName(listName1);
          Lists.selectRecordType(Lists.recordTypes.organizations);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Select "Organization — Accounts — Notes" field, "contains" operator,
          // enter value with special characters preserved
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.NOTES);
          QueryModal.verifySelectedField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.NOTES);
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(notesContainsValue);
          QueryModal.verifyTextFieldValue(notesContainsValue);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryAndSaveDisabled();

          // Step 3: Click "Test query"
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS_COLUMN);
          QueryModal.verifyOrganizationAccountsEmbeddedTableInQueryModal(
            testData.firstOrganization.code,
            expectedFirstOrganizationAccounts,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.secondOrganization.code,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.thirdOrganization.code);

          // Step 4: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName1);
          Lists.waitForCompilingAnimationToDisappear();
          Lists.verifyRefreshCompleteCallout(1);

          // Step 5: Click "View updated list" link and inspect the result table
          Lists.viewUpdatedList();
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS_COLUMN);
          Lists.verifyEmbeddedTableInResultsRow(
            'organizationAccounts',
            testData.firstOrganization.code,
            expectedFirstOrganizationAccounts,
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.secondOrganization.code);
          Lists.verifyRecordValueAbsentInResultTable(testData.thirdOrganization.code);

          // Step 6: Actions > "Export selected columns (CSV)"
          Lists.openActions();
          Lists.exportListVisibleColumns();
          Lists.verifyListExportGeneratedCalloutMessage(listName1);
          Lists.verifyListExportedCalloutMessage(listName1);

          // Step 7: Open exported CSV and inspect its rows
          FileManager.convertCsvToJson(`${listName1}.csv`).then((rows) => {
            expect(rows).to.have.length(1);

            const firstOrganizationRow = rows.find(
              (row) => row[organizationCsvHeaders.code] === testData.firstOrganization.code,
            );

            expect(firstOrganizationRow, 'First organization row in exported CSV').to.be.an(
              'object',
            );

            // The "Accounts" cell is exported as a JSON-encoded string, not a parsed array.
            const firstOrganizationAccounts = JSON.parse(
              firstOrganizationRow[organizationAccountsCsvHeader],
            );
            const firstOrganizationAccountsNotes = firstOrganizationAccounts.map(
              (account) => account.notes,
            );

            expect(firstOrganizationAccountsNotes).to.include(
              testData.firstOrganization.account1.notes,
            );
            expect(firstOrganizationAccountsNotes).to.include(
              testData.firstOrganization.account2.notes,
            );

            const csvContent = JSON.stringify(rows);
            expect(csvContent).not.to.include(testData.secondOrganization.code);
            expect(csvContent).not.to.include(testData.thirdOrganization.code);
          });
          Lists.closeListDetailsPane();

          // Step 8: Create second list, query by "equals" using the full Note 1 text
          Lists.openNewListPane();
          Lists.setName(listName2);
          Lists.selectRecordType(Lists.recordTypes.organizations);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ACCOUNTS.NOTES);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.firstOrganization.account1.notes);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyOrganizationAccountsEmbeddedTableInQueryModal(
            testData.firstOrganization.code,
            expectedFirstOrganizationAccounts,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.secondOrganization.code,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.thirdOrganization.code);

          // Step 9: Change operator to "starts with", clear the value and enter the prefix
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(notesStartsWithValue);
          QueryModal.verifyTextFieldValue(notesStartsWithValue);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyOrganizationAccountsEmbeddedTableInQueryModal(
            testData.firstOrganization.code,
            expectedFirstOrganizationAccounts,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.secondOrganization.code,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.thirdOrganization.code);
        },
      );
    });
  });
});
