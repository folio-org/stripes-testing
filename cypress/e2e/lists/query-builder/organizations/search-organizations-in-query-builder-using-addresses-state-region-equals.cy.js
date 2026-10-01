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

const testCaseId = 'C1453664';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const stateRegionMatch = 'OR';
const stateRegionOther = 'OH';
const orgDescription = `AT_${testCaseId}_Description_${getRandomPostfix()}`;

const testData = {
  orgWithStateRegion: {},
  orgWithOtherStateRegion: {},
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
          description: orgDescription,
          addresses: [{ stateRegion: stateRegionMatch }],
        }).then((id) => {
          testData.orgWithStateRegion.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithStateRegion.code = org.code;
          });
        });

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_${testCaseId}_Org_Other_${getRandomPostfix()}`,
          description: orgDescription,
          addresses: [{ stateRegion: stateRegionOther }],
        }).then((id) => {
          testData.orgWithOtherStateRegion.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithOtherStateRegion.code = org.code;
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
        if (testData.orgWithStateRegion?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithStateRegion.id);
        }
        if (testData.orgWithOtherStateRegion?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithOtherStateRegion.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453664 Search for 'Organizations' using Addresses - State/region - operator: equals (athena)",
        { tags: ['extendedPath', 'athena', 'C1453664'] },
        () => {
          // Step 1-2: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organizations - Addresses - State/region" field and verify operators
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES.STATE_REGION);

          // Step 4: Click on "Select operator" dropdown in "Operator" column
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 5: Select "equals" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

          // Step 6: Fill in the value to match
          QueryModal.fillInValueTextfield(stateRegionMatch);

          // Step 6a: Add second filter - "Organization — Description" field with equals operator
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(orgDescription, 1);

          // Step 7: Run test query
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - org with matching state/region IS shown, org with other state/region is NOT shown
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);
          QueryModal.verifyOrganizationAddressesEmbeddedTableInQueryModal(
            testData.orgWithStateRegion.code,
            {
              stateRegion: stateRegionMatch,
            },
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.orgWithOtherStateRegion.code,
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
            testData.orgWithStateRegion.code,
            {
              stateRegion: stateRegionMatch,
            },
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithOtherStateRegion.code);
        },
      );
    });
  });
});
