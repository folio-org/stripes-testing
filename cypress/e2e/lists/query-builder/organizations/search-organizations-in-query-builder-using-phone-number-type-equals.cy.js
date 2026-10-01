import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  enumOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';

const testCaseId = 'C1453673';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const orgDescription = `AT_${testCaseId}_Description_${getRandomPostfix()}`;
const orgConfigs = [
  { key: 'orgWithOfficeType', nameSuffix: 'Office', type: 'Office' },
  { key: 'orgWithMobileType', nameSuffix: 'Mobile', type: 'Mobile' },
  { key: 'orgWithNoType', nameSuffix: 'NoType', type: null },
];
const testData = {
  orgWithOfficeType: {},
  orgWithMobileType: {},
  orgWithNoType: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        orgConfigs.forEach(({ key, nameSuffix, type }) => {
          const phoneNumber = type ? `555-${getRandomPostfix()}` : undefined;
          const phoneNumbers = phoneNumber ? [{ phoneNumber, type, isPrimary: true }] : undefined;
          if (phoneNumber) testData[key].phoneNumber = phoneNumber;

          Organizations.createOrganizationViaApi({
            ...NewOrganization.getDefaultOrganization(),
            name: `AT_${testCaseId}_Org_${nameSuffix}_${getRandomPostfix()}`,
            description: orgDescription,
            ...(phoneNumbers && { phoneNumbers }),
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
        "C1453673 Search for 'Organizations' using Phone Numbers- Type - operator: equals (dropdown) (athena)",
        { tags: ['extendedPath', 'athena', 'C1453673'] },
        () => {
          // Step 1: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click "Build query"
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organization — Phone numbers — Type" field
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS.TYPE);

          // Step 4: Verify operators for Type field
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 5: Select "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

          // Step 6: Select Office type from value dropdown
          QueryModal.chooseValueSelect('Office');

          // Add second row to narrow results to test data only
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(orgDescription, 1);

          // Step 7: Click "Test query"
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - Office org shown, Mobile and no-type orgs absent
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS_COLUMN);
          QueryModal.verifyOrganizationPhoneNumbersEmbeddedTableInQueryModal(
            testData.orgWithOfficeType.code,
            { phoneNumber: testData.orgWithOfficeType.phoneNumber, type: 'Office' },
          );
          [testData.orgWithMobileType.code, testData.orgWithNoType.code].forEach((code) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(code);
          });

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
            testData.orgWithOfficeType.code,
            { phoneNumber: testData.orgWithOfficeType.phoneNumber, type: 'Office' },
          );
          [testData.orgWithMobileType.code, testData.orgWithNoType.code].forEach((code) => {
            Lists.verifyRecordValueAbsentInResultTable(code);
          });
        },
      );
    });
  });
});
