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

const testCaseId = 'C1453663';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const cityMatch = `Portsland${getRandomPostfix()}`;
const searchValue = 'ports';
const testData = {
  orgWithAddress: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();
        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_${testCaseId}_Org_${getRandomPostfix()}`,
          addresses: [{ city: cityMatch }],
        }).then((id) => {
          testData.orgWithAddress.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithAddress.code = org.code;
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
        if (testData.orgWithAddress?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithAddress.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453663 Search for 'Organizations' using Addresses - City - operator: contains (athena)",
        { tags: ['extendedPath', 'athena', 'C1453663'] },
        () => {
          // Step 1-2: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organizations - Addresses - City" field and verify operators
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES.CITY);

          // Step 4: Click on "Select operator" dropdown in "Operator" column
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 5: Select "contains" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);

          // Step 6: Fill in the value to match (partial match)
          QueryModal.fillInValueTextfield(searchValue);

          // Step 7: Run test query
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - org with matching city IS shown
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);
          QueryModal.verifyOrganizationAddressesEmbeddedTableInQueryModal(
            testData.orgWithAddress.code,
            {
              city: cityMatch,
            },
          );

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
          Lists.verifyEmbeddedTableInResultsRow(
            'organizationAddresses',
            testData.orgWithAddress.code,
            {
              city: cityMatch,
            },
          );
        },
      );
    });
  });
});
