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

const testCaseId = 'C1453661';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const addrLine1Match = '123 Main Street';
const addrLine1Other = 'Saint Lukes';
const orgDescription = `AT_${testCaseId}_Description_${getRandomPostfix()}`;

const testData = {
  orgWithAddress: {},
  orgWithOtherAddress: {},
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
          addresses: [{ addressLine1: addrLine1Match }],
        }).then((id) => {
          testData.orgWithAddress.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithAddress.code = org.code;
          });
        });

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_${testCaseId}_Org_Other_${getRandomPostfix()}`,
          description: orgDescription,
          addresses: [{ addressLine1: addrLine1Other }],
        }).then((id) => {
          testData.orgWithOtherAddress.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithOtherAddress.code = org.code;
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
        if (testData.orgWithOtherAddress?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithOtherAddress.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453661 Search for 'Organizations' in the query builder using Addresses - Address line 1 field, operator: not equal to (athena)",
        { tags: ['extendedPath', 'athena', 'C1453661'] },
        () => {
          // Step 1-2: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organizations - Addresses - Address line 1" field and verify operators
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES.ADDRESS_LINE_1);

          // Step 4: Click on "Select operator" dropdown in "Operator" column
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 5: Select "not equal to" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);

          // Step 6: Fill in the value to exclude
          QueryModal.fillInValueTextfield(addrLine1Match);

          // Step 6a: Add second filter - "Organization — Description" field with equals operator
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(orgDescription, 1);

          // Step 7: Run test query
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - org with other address IS shown, org with matching address is NOT shown
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);
          QueryModal.verifyOrganizationAddressesEmbeddedTableInQueryModal(
            testData.orgWithOtherAddress.code,
            {
              addressLine1: addrLine1Other,
            },
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.orgWithAddress.code);

          // Step 9: Run query & save
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 10: Click "View updated list"
          Lists.waitForCompilingAnimationToDisappear();
          Lists.viewUpdatedList();
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);

          // Step 11: Open Actions, check "Organizations -- Addresses" column and verify
          Lists.openActions();
          Lists.selectResultColumn(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);
          Lists.verifyResultColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);
          Lists.verifyEmbeddedTableInResultsRow(
            'organizationAddresses',
            testData.orgWithOtherAddress.code,
            {
              addressLine1: addrLine1Other,
            },
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithAddress.code);
        },
      );
    });
  });
});
