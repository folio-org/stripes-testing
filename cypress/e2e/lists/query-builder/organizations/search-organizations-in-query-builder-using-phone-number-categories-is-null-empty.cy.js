import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  enumOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import SettingsOrganizations from '../../../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';
import { ORGANIZATION_CATEGORIES } from '../../../../support/constants/organizations/organization';

const testCaseId = 'C1453674';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const orgDescription = `AT_${testCaseId}_Description_${getRandomPostfix()}`;
const orgConfigs = [
  { key: 'orgWithVendorCategory', nameSuffix: 'Vendor', hasCategory: true },
  { key: 'orgWithNoCategory', nameSuffix: 'NoCategory', hasCategory: false },
];
const testData = {
  orgWithVendorCategory: {},
  orgWithNoCategory: {},
  categoryIds: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        SettingsOrganizations.getCategoriesViaApi(
          `value=="${ORGANIZATION_CATEGORIES.PAYMENTS}"`,
        ).then((response) => {
          if (response.categories && response.categories.length > 0) {
            testData.categoryIds.vendor = response.categories[0].id;
          }
        });

        cy.then(() => {
          orgConfigs.forEach(({ key, nameSuffix, hasCategory }) => {
            const phoneNumber = `555-${getRandomPostfix()}`;
            const phoneNumbers = hasCategory
              ? [
                {
                  phoneNumber,
                  categories: [testData.categoryIds.vendor],
                  isPrimary: true,
                },
              ]
              : [{ phoneNumber, isPrimary: true }];

            testData[key].phoneNumber = phoneNumber;

            Organizations.createOrganizationViaApi({
              ...NewOrganization.getDefaultOrganization(),
              name: `AT_${testCaseId}_Org_${nameSuffix}_${getRandomPostfix()}`,
              description: orgDescription,
              phoneNumbers,
            }).then((id) => {
              testData[key].id = id;
              Organizations.getOrganizationByIdViaApi(id).then((org) => {
                testData[key].code = org.code;
              });
            });
          });
        });

        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.uiOrganizationsViewEditDelete.gui,
          Permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui,
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
        "C1453674 Search for 'Organizations' using Phone numbers - Categories - operator: is null/empty (athena)",
        { tags: ['extendedPath', 'athena', 'C1453674'] },
        () => {
          // Step 1: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click "Build query"
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organization — Phone numbers — Categories" field
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS.CATEGORIES);
          QueryModal.verifyQueryAreaContent('(organization.phone_numbers[*]->categories_names  )');

          // Step 4: Verify operators for Categories field
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 5: Select "is null/empty" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.verifyQueryAreaContent(
            '(organization.phone_numbers[*]->categories_names  is null/empty )',
          );

          // Step 6: Select "True" from value dropdown
          QueryModal.chooseValueSelect('True');

          // Add second row to narrow results to test data only
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(orgDescription, 1);

          // Step 7: Click "Test query"
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - no-category org shown, vendor-category org absent
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.PHONE_NUMBERS_COLUMN);
          QueryModal.verifyOrganizationPhoneNumbersEmbeddedTableInQueryModal(
            testData.orgWithNoCategory.code,
            { phoneNumber: testData.orgWithNoCategory.phoneNumber },
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.orgWithVendorCategory.code,
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
            testData.orgWithNoCategory.code,
            { phoneNumber: testData.orgWithNoCategory.phoneNumber },
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithVendorCategory.code);
        },
      );
    });
  });
});
