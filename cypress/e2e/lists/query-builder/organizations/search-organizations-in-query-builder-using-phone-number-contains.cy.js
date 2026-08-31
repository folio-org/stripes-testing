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

const testCaseId = 'C1453672';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const prefix = String(randomFourDigitNumber());
const phoneMatch = `${prefix}-0100`;
const phoneNoMatch = '212-8899';

const orgConfigs = [
  { key: 'orgWithMatchPhone', nameSuffix: 'Match', phoneNumber: phoneMatch },
  { key: 'orgWithNoMatchPhone', nameSuffix: 'NoMatch', phoneNumber: phoneNoMatch },
];
const testData = {
  orgWithMatchPhone: {},
  orgWithNoMatchPhone: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        orgConfigs.forEach(({ key, nameSuffix, phoneNumber }) => {
          Organizations.createOrganizationViaApi({
            ...NewOrganization.getDefaultOrganization(),
            name: `AT_${testCaseId}_Org_${nameSuffix}_${getRandomPostfix()}`,
            phoneNumbers: [{ phoneNumber, isPrimary: true }],
          }).then((id) => {
            testData[key].id = id;
            Organizations.getOrganizationByIdViaApi(id).then((org) => {
              testData[key].code = org.code;
            });
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

        orgConfigs.forEach(({ key }) => {
          if (testData[key]?.id) {
            Organizations.deleteOrganizationViaApi(testData[key].id);
          }
        });

        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453672 Search for 'Organizations' using Phone number - operator: contains (athena)",
        { tags: ['extendedPath', 'athena', 'C1453672'] },
        () => {
          // Step 1: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click "Build query"
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organization - Phone numbers - Phone number" field
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS.PHONE_NUMBER);

          // Step 4-5: Verify operators and select "contains"
          QueryModal.verifyOperatorsList(STRING_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);

          // Step 6: Add value "555" in Value field
          QueryModal.fillInValueTextfield(prefix);

          // Step 7: Click "Test query"
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - matching org shown, non-matching org absent
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS_COLUMN);
          QueryModal.verifyOrganizationPhoneNumbersEmbeddedTableInQueryModal(
            testData.orgWithMatchPhone.code,
            { phoneNumber: phoneMatch },
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.orgWithNoMatchPhone.code,
          );

          // Step 9: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 10: Verify result after refresh
          Lists.waitForCompilingAnimationToDisappear();

          // Step 11: Click "View updated list"
          Lists.viewUpdatedList();
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS_COLUMN);

          // Step 12: Open Actions, check "Organizations -- Phone numbers" column and verify
          Lists.openActions();
          Lists.selectResultColumn(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS_COLUMN);
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS_COLUMN);
          Lists.verifyEmbeddedTableInResultsRow(
            'organizationPhoneNumbers',
            testData.orgWithMatchPhone.code,
            { phoneNumber: phoneMatch },
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithNoMatchPhone.code);
        },
      );
    });
  });
});
