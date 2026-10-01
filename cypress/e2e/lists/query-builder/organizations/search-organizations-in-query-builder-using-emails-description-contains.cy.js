import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';

const testCaseId = 'C1453669';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const prefix = randomFourDigitNumber();
const email = `${testCaseId}_email@test.com`;
const emailDescriptionMatch = `${prefix}_personal email`;
const emailDescriptionNoMatch = 'Monograph supplier';
const searchValue = `${prefix}_personal`;

const testData = {
  orgWithMatchDescription: {},
  orgWithNoMatchDescription: {},
  orgWithEmptyDescription: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_${testCaseId}_Org_Match_${getRandomPostfix()}`,
          emails: [
            {
              value: email,
              description: emailDescriptionMatch,
              isPrimary: true,
            },
          ],
        }).then((id) => {
          testData.orgWithMatchDescription.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithMatchDescription.code = org.code;
          });
        });

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_${testCaseId}_Org_NoMatch_${getRandomPostfix()}`,
          emails: [
            {
              value: `nomatch_${getRandomPostfix()}@test.com`,
              description: emailDescriptionNoMatch,
              isPrimary: true,
            },
          ],
        }).then((id) => {
          testData.orgWithNoMatchDescription.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithNoMatchDescription.code = org.code;
          });
        });

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_${testCaseId}_Org_Empty_${getRandomPostfix()}`,
          emails: [{ value: `empty_${getRandomPostfix()}@test.com`, isPrimary: true }],
        }).then((id) => {
          testData.orgWithEmptyDescription.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithEmptyDescription.code = org.code;
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

        if (testData.orgWithMatchDescription?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithMatchDescription.id);
        }
        if (testData.orgWithNoMatchDescription?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithNoMatchDescription.id);
        }
        if (testData.orgWithEmptyDescription?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithEmptyDescription.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453669 Search for 'Organizations' using Emails Description - operator: contains (athena)",
        { tags: ['extendedPath', 'athena', 'C1453669'] },
        () => {
          // Step 1: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click "Build query"
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organization - Emails - Description" field
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS.DESCRIPTION);

          // Step 4-5: Verify operators and select "contains"
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);

          // Step 6: Add value "personal" in Value field
          QueryModal.fillInValueTextfield(searchValue);

          // Step 7: Click "Test query"
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - matching org shown, non-matching and empty-description orgs absent
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS_COLUMN);
          QueryModal.verifyOrganizationEmailsEmbeddedTableInQueryModal(
            testData.orgWithMatchDescription.code,
            { email, description: emailDescriptionMatch },
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.orgWithNoMatchDescription.code,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.orgWithEmptyDescription.code,
          );

          // Step 9: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 10: Verify result after refresh
          Lists.waitForCompilingAnimationToDisappear();

          // Step 11: Click "View updated list"
          Lists.viewUpdatedList();
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS_COLUMN);
          Lists.verifySingleRecordNumber();

          // Step 12: Open Actions, check "Organizations -- Emails" column and verify
          Lists.openActions();
          Lists.selectResultColumn(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS_COLUMN);
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS_COLUMN);
          Lists.verifyEmbeddedTableInResultsRow(
            'organizationEmails',
            testData.orgWithMatchDescription.code,
            { email, description: emailDescriptionMatch },
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithNoMatchDescription.code);
          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithEmptyDescription.code);
        },
      );
    });
  });
});
