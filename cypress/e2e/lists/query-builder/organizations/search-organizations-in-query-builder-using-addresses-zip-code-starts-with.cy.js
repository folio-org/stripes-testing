import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';

const testCaseId = 'C1453665';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const zipCodeExact = `${randomNDigitNumber(9)}`;
const zipCodeMatch = zipCodeExact.substring(0, 3);
const zipCodeNoMatch = '12345';
const orgDescription = `AT_${testCaseId}_Description_${getRandomPostfix()}`;

const testData = {
  orgWithZipCodeMatch: {},
  orgWithZipCodeNoMatch: {},
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
          addresses: [{ zipCode: zipCodeExact }],
        }).then((id) => {
          testData.orgWithZipCodeMatch.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithZipCodeMatch.code = org.code;
          });
        });

        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_${testCaseId}_Org_NoMatch_${getRandomPostfix()}`,
          description: orgDescription,
          addresses: [{ zipCode: zipCodeNoMatch }],
        }).then((id) => {
          testData.orgWithZipCodeNoMatch.id = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.orgWithZipCodeNoMatch.code = org.code;
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
        if (testData.orgWithZipCodeMatch?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithZipCodeMatch.id);
        }
        if (testData.orgWithZipCodeNoMatch?.id) {
          Organizations.deleteOrganizationViaApi(testData.orgWithZipCodeNoMatch.id);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        "C1453665 Search for 'Organizations' using Addresses - Zip code - operator: starts with (athena)",
        { tags: ['extendedPath', 'athena', 'C1453665'] },
        () => {
          // Step 1-2: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organizations - Addresses - Zip code" field
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES.ZIP_CODE);

          // Step 4: Verify operators list for Zip code field
          QueryModal.verifyOperatorsList(STRING_OPERATORS);

          // Step 5: Select "starts with" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);

          // Step 6: Fill in value "97201"
          QueryModal.fillInValueTextfield(zipCodeMatch);

          // Step 6a: Add second filter for Description equals
          QueryModal.addNewRow();
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(orgDescription, 1);

          // Step 7: Run test query
          QueryModal.testQuery();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Verify preview - org with zip 97201 IS shown, org with zip 12345 is NOT shown
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.verifyColumnDisplayed(ORGANIZATIONS_FIELDS.ORGANIZATION.ADDRESSES_COLUMN);
          QueryModal.verifyOrganizationAddressesEmbeddedTableInQueryModal(
            testData.orgWithZipCodeMatch.code,
            {
              zipCode: zipCodeExact,
            },
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.orgWithZipCodeNoMatch.code,
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
            testData.orgWithZipCodeMatch.code,
            {
              zipCode: zipCodeExact,
            },
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.orgWithZipCodeNoMatch.code);
        },
      );
    });
  });
});
