import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import SettingsOrganizations from '../../../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';
import { ORGANIZATION_CATEGORIES } from '../../../../support/constants/organizations/organization';

const testCaseId = 'C1453682';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const testData = {
  organization: {
    id: null,
    code: null,
    name: `AT_${testCaseId}_Org_${getRandomPostfix()}`,
  },
  url: {
    value: 'https://www.usgs.gov',
    description: `Test URL description_${getRandomPostfix()}`,
    category: ORGANIZATION_CATEGORIES.PAYMENTS,
  },
  categoryId: null,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        // Get Payments category via API
        SettingsOrganizations.getCategoriesViaApi(
          `value=="${ORGANIZATION_CATEGORIES.PAYMENTS}"`,
        ).then((response) => {
          if (response.categories && response.categories.length > 0) {
            testData.categoryId = response.categories[0].id;
          }
        });

        cy.then(() => {
          // Create organization with URL
          Organizations.createOrganizationViaApi({
            ...NewOrganization.getDefaultOrganization(),
            name: testData.organization.name,
            urls: [
              {
                value: testData.url.value,
                description: testData.url.description,
                categories: [testData.categoryId],
              },
            ],
          }).then((id) => {
            testData.organization.id = id;
            Organizations.getOrganizationByIdViaApi(id).then((org) => {
              testData.organization.code = org.code;
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

        if (testData.organization?.id) {
          Organizations.deleteOrganizationViaApi(testData.organization.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453682 Verify 'Organizations URL' field with all nested fields (athena)",
        { tags: ['extendedPath', 'athena', 'C1453682'] },
        () => {
          // Step 1: Click on "New" button and create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click on "Build query" button
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Click "Select field" dropdown and search for "Organizations - URLs"
          // Verify subtitles appear (URL, Description, Categories, Notes)
          QueryModal.verifyFieldOptionExists([
            ORGANIZATIONS_FIELDS.ORGANIZATION.URLS.URL,
            ORGANIZATIONS_FIELDS.ORGANIZATION.URLS.DESCRIPTION,
            ORGANIZATIONS_FIELDS.ORGANIZATION.URLS.CATEGORIES,
            ORGANIZATIONS_FIELDS.ORGANIZATION.URLS.NOTES,
          ]);

          // Step 4: Select "Organizations - URLs - URL" option
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.URLS.URL);

          // Step 5: Click on "Select operator" dropdown and verify operators list
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 6: Select "equals" option
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

          // Step 7: Fill in the "Value" input field with URL
          QueryModal.fillInValueTextfield(testData.url.value);
          QueryModal.verifyQueryAreaContent(
            `(organization.urls[*]->value == ${testData.url.value})`,
          );

          // Step 8: Click "+" button and select "Organizations - URLs - Description" option
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.URLS.DESCRIPTION, 1);

          // Step 9: Select "contains" option
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 1);

          // Step 10: Fill in the "Value" input field with description
          QueryModal.fillInValueTextfield(testData.url.description, 1);
          QueryModal.verifyQueryAreaContent(
            `(organization.urls[*]->value == ${testData.url.value}) AND (organization.urls[*]->description contains ${testData.url.description})`,
          );

          // Step 11: Click "+" button and select "Organizations - URLs - Categories" option
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.URLS.CATEGORIES, 2);

          // Step 12: Select "in" option
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 2);

          // Step 13: Select "Payments" option from the dropdown
          QueryModal.chooseFromValueMultiselect(testData.url.category, 2, {
            exactMatch: true,
          });
          QueryModal.verifyQueryAreaContent(
            `(organization.urls[*]->value == ${testData.url.value}) AND (organization.urls[*]->description contains ${testData.url.description}) AND (organization.urls[*]->categories_names in [${testData.url.category}])`,
          );

          // Step 14: Click on "Test query" button
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 15: Check the preview of found records
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.URLS_COLUMN);
          QueryModal.verifyOrganizationUrlsEmbeddedTableInQueryModal(testData.organization.code, {
            url: testData.url.value,
            description: testData.url.description,
            categories: testData.url.category,
          });

          // Step 16: Click on "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 17: Verify the result after the refresh is done
          Lists.waitForCompilingAnimationToDisappear();

          // Step 18: Click on "View updated list" link on the toast message
          Lists.viewUpdatedList();
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.URLS_COLUMN);

          // Step 19: Click on "Actions" button and check the "Organizations -- URLs" checkbox
          Lists.openActions();
          Lists.selectResultColumn(ORGANIZATIONS_FIELDS.ORGANIZATION.URLS_COLUMN);
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.URLS_COLUMN);
          Lists.verifyEmbeddedTableInResultsRow('organizationUrls', testData.organization.code, {
            url: testData.url.value,
            description: testData.url.description,
            categories: testData.url.category,
          });
        },
      );
    });
  });
});
