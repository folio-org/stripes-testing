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

const testCaseId = 'C1453668';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const emailMatch = 'vendor@ebsco.con';
const emailNoMatch = 'info@proquest.org';
const searchValue = 'con';

const testData = {
  orgWithMatchEmail: {},
  orgWithNoMatchEmail: {},
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
          emails: [{ value: emailMatch, isPrimary: true }],
        }).then((id) => {
          testData.orgWithMatchEmail.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithMatchEmail.code = org.code;
          });
        });

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_${testCaseId}_Org_NoMatch_${getRandomPostfix()}`,
          emails: [{ value: emailNoMatch, isPrimary: true }],
        }).then((id) => {
          testData.orgWithNoMatchEmail.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithNoMatchEmail.code = org.code;
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
        cy.getUserToken(user.username, user.password);
        Lists.deleteListByNameViaApi(listName);
        cy.getAdminToken();
        if (testData.orgWithMatchEmail?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithMatchEmail.id);
        }
        if (testData.orgWithNoMatchEmail?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithNoMatchEmail.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453668 Search for 'Organizations' using Emails - Email - operator: contains (athena)",
        { tags: ['extendedPath', 'athena', 'C1453668'] },
        () => {
          // Step 1: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click "Build query"
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organizations - Emails - Email address" field
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS.EMAIL_ADDRESS);

          // Step 4-5: Verify operators and select "contains"
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);

          // Step 6: Add value "com" in Value field
          QueryModal.fillInValueTextfield(searchValue);

          // Step 7: Click "Test query"
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - matching org shown, non-matching org absent
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS_COLUMN);
          QueryModal.verifyOrganizationEmailsEmbeddedTableInQueryModal(
            testData.orgWithMatchEmail.code,
            { email: emailMatch },
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.orgWithNoMatchEmail.code,
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

          // Step 12: Open Actions, check "Organizations -- Emails" column and verify
          Lists.openActions();
          Lists.selectResultColumn(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS_COLUMN);
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS_COLUMN);
          Lists.verifyEmbeddedTableInResultsRow(
            'organizationEmails',
            testData.orgWithMatchEmail.code,
            { email: emailMatch },
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithNoMatchEmail.code);
        },
      );
    });
  });
});
