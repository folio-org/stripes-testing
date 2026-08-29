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

const testCaseId = 'C1453670';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const orgDescription = `AT_${testCaseId}_Description_${getRandomPostfix()}`;
const orgConfigs = [
  {
    key: 'orgWithPaymentCategory',
    nameSuffix: 'Payment',
    emailPrefix: 'payment',
    category: ORGANIZATION_CATEGORIES.PAYMENTS,
    storeEmail: true,
  },
  {
    key: 'orgWithShipmentsCategory',
    nameSuffix: 'Shipments',
    emailPrefix: 'shipments',
    category: ORGANIZATION_CATEGORIES.SHIPMENTS,
  },
  { key: 'orgWithNoCategory', nameSuffix: 'NoCategory', emailPrefix: 'nocategory', category: null },
];
const testData = {
  orgWithPaymentCategory: {},
  orgWithShipmentsCategory: {},
  orgWithNoCategory: {},
  categoryIds: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        cy.then(() => {
          [ORGANIZATION_CATEGORIES.PAYMENTS, ORGANIZATION_CATEGORIES.SHIPMENTS].forEach(
            (category) => {
              SettingsOrganizations.getCategoriesViaApi(`value=="${category}"`).then((response) => {
                if (response.categories && response.categories.length > 0) {
                  testData.categoryIds[category] = response.categories[0].id;
                }
              });
            },
          );
        }).then(() => {
          orgConfigs.forEach(({ key, nameSuffix, emailPrefix, category, storeEmail }) => {
            const emailValue = `${emailPrefix}_${getRandomPostfix()}@test.com`;
            const emailEntry = { value: emailValue, isPrimary: true };
            if (category) emailEntry.categories = [testData.categoryIds[category]];

            Organizations.createOrganizationViaApi({
              ...NewOrganization.getDefaultOrganization(),
              name: `AT_${testCaseId}_Org_${nameSuffix}_${getRandomPostfix()}`,
              description: orgDescription,
              emails: [emailEntry],
            }).then((id) => {
              testData[key].id = id;
              if (storeEmail) testData[key].email = emailValue;
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
        "C1453670 Search for 'Organizations' using Emails Categories - operator: equals (dropdown) (athena)",
        { tags: ['extendedPath', 'athena', 'C1453670'] },
        () => {
          // Step 1: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click "Build query"
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organization - Emails - Categories" field
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS.CATEGORIES);

          // Step 4: Verify operators list for Categories field
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);

          // Step 5: Select "equals" operator (single-select dropdown, unlike "in" which is multi-select)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

          // Step 6: Select "Payment" from single-select value dropdown
          QueryModal.chooseValueSelect(ORGANIZATION_CATEGORIES.PAYMENTS);

          // Add second row to narrow results to test data only
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(orgDescription, 1);

          // Step 7: Click "Test query"
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - Payment org shown, Shipments and no-category orgs absent
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.EMAILS_COLUMN);
          QueryModal.verifyOrganizationEmailsEmbeddedTableInQueryModal(
            testData.orgWithPaymentCategory.code,
            {
              email: testData.orgWithPaymentCategory.email,
              categories: ORGANIZATION_CATEGORIES.PAYMENTS,
            },
          );
          [testData.orgWithShipmentsCategory.code, testData.orgWithNoCategory.code].forEach(
            (code) => QueryModal.verifyRecordWithIdentifierAbsentInResultTable(code),
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
            testData.orgWithPaymentCategory.code,
            {
              email: testData.orgWithPaymentCategory.email,
              categories: ORGANIZATION_CATEGORIES.PAYMENTS,
            },
          );
          [testData.orgWithShipmentsCategory.code, testData.orgWithNoCategory.code].forEach(
            (code) => Lists.verifyRecordValueAbsentInResultTable(code),
          );
        },
      );
    });
  });
});
