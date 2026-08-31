import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_STORES_UUID_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import SettingsOrganizations from '../../../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';
import { ORGANIZATION_CATEGORIES } from '../../../../support/constants/organizations/organization';

const testCaseId = 'C1453667';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const orgDescription = `AT_${testCaseId}_Description_${getRandomPostfix()}`;
const testData = {
  organizations: [
    { key: 'orgWithPaymentCategory', category: ORGANIZATION_CATEGORIES.PAYMENTS },
    { key: 'orgWithShipmentsCategory', category: ORGANIZATION_CATEGORIES.SHIPMENTS },
    { key: 'orgWithNoCategory', category: null },
  ],
  categoryIds: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        // Get categories via API
        const categoriesToFetch = [
          ORGANIZATION_CATEGORIES.PAYMENTS,
          ORGANIZATION_CATEGORIES.SHIPMENTS,
        ];

        categoriesToFetch.forEach((category) => {
          SettingsOrganizations.getCategoriesViaApi(`value=="${category}"`).then((response) => {
            if (response.categories && response.categories.length > 0) {
              testData.categoryIds[category] = response.categories[0].id;
            }
          });
        });

        cy.then(() => {
          // Create organizations with their respective categories
          testData.organizations.forEach((orgConfig) => {
            const categoryId = orgConfig.category ? testData.categoryIds[orgConfig.category] : null;
            const categoryDescriptor = orgConfig.category || 'NoCategory';

            Organizations.createOrganizationViaApi({
              ...NewOrganization.getDefaultOrganization(),
              name: `AT_${testCaseId}_Org_${categoryDescriptor}_${getRandomPostfix()}`,
              description: orgDescription,
              addresses: categoryId ? [{ categories: [categoryId] }] : [{}],
            }).then((id) => {
              testData[orgConfig.key] = { id };
              Organizations.getOrganizationByIdViaApi(id).then((org) => {
                testData[orgConfig.key].code = org.code;
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

        testData.organizations.forEach((orgConfig) => {
          if (testData[orgConfig.key]?.id) {
            Organizations.deleteOrganizationViaApi(testData[orgConfig.key].id);
          }
        });

        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453667 Search for 'Organizations' using Addresses - Categories - operator: IN (multi-select) (athena)",
        { tags: ['extendedPath', 'athena', 'C1453667'] },
        () => {
          // Step 1-2: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organizations - Addresses - Categories" field
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES.CATEGORIES);

          // Step 4: Verify operators list for Categories field
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);

          // Step 5: Select "IN" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);

          // Step 6: Select multiple categories in multi-select control
          QueryModal.chooseFromValueMultiselect(ORGANIZATION_CATEGORIES.PAYMENTS, 0, {
            exactMatch: true,
          });
          QueryModal.chooseFromValueMultiselect(ORGANIZATION_CATEGORIES.SHIPMENTS, 0, {
            exactMatch: true,
          });

          // Step 6a: Add second filter for Description equals
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(orgDescription, 1);

          // Step 7: Run test query
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - should show 2 records (org with Payment AND org with Shipments)
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);

          testData.organizations
            .filter((org) => org.category)
            .forEach((orgConfig) => {
              QueryModal.verifyOrganizationAddressesEmbeddedTableInQueryModal(
                testData[orgConfig.key].code,
                {
                  categories: [orgConfig.category],
                },
              );
            });

          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.orgWithNoCategory.code);

          // Step 9: Run query & save
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 10: Wait for compiling and verify refresh complete
          Lists.waitForCompilingAnimationToDisappear();

          // Step 11: Click "View updated list"
          Lists.viewUpdatedList();
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);

          // Step 12: Open Actions, check "Organizations -- Addresses" column and verify
          Lists.openActions();
          Lists.selectResultColumn(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);

          testData.organizations
            .filter((org) => org.category)
            .forEach((orgConfig) => {
              Lists.verifyEmbeddedTableInResultsRow(
                'organizationAddresses',
                testData[orgConfig.key].code,
                {
                  categories: [orgConfig.category],
                },
              );
            });

          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithNoCategory.code);
        },
      );
    });
  });
});
