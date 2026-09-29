import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  enumOperators,
  organizationFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import SelectOrganizationModal from '../../../../support/fragments/orders/modals/selectOrganizationModal';
import SettingsOrganizations from '../../../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C451524';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const testData = {
  organizationTypeId: '',
  organizationTypeName: '',
  organizationId: '',
  organizationCode: '',
  organizationName: '',
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        const organizationType = {
          ...SettingsOrganizations.getDefaultOrganizationType(),
          name: `AT_${testCaseId}_Type_${getRandomPostfix()}`,
        };
        testData.organizationTypeName = organizationType.name;
        SettingsOrganizations.createTypesViaApi(organizationType);
        testData.organizationTypeId = organizationType.id;

        testData.organizationName = `AT_${testCaseId}_Org_${getRandomPostfix()}`;
        Organizations.createOrganizationViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: testData.organizationName,
          organizationTypes: [testData.organizationTypeId],
        }).then((id) => {
          testData.organizationId = id;
          Organizations.getOrganizationByIdViaApi(id).then((org) => {
            testData.organizationCode = org.code;
          });
        });

        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
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

        if (testData.organizationId) {
          Organizations.deleteOrganizationViaApi(testData.organizationId);
        }
        if (testData.organizationTypeId) {
          SettingsOrganizations.deleteOrganizationTypeViaApi(testData.organizationTypeId);
        }
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C451524 Verify that the Organizations with "Code", "Name" and "Type name" are queryable (athena)',
        { tags: ['criticalPath', 'athena', 'C451524'] },
        () => {
          // Step 1: Create new list with Organizations record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          // Step 2: Click "Build query" button
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 3: Build query: "Organization — Code" equals <code>
          QueryModal.selectField(organizationFieldValues.code);
          QueryModal.verifySelectedField(organizationFieldValues.code);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.clickOrganizationLookup();
          SelectOrganizationModal.findOrganization(testData.organizationCode);
          SelectOrganizationModal.verifyClosed();
          QueryModal.verifyQueryAreaContent(`(organization.code == ${testData.organizationCode})`);

          // AND "Organization — Type names" in <type name>
          QueryModal.addNewRow();
          QueryModal.selectField(organizationFieldValues.typeNames, 1);
          QueryModal.verifySelectedField(organizationFieldValues.typeNames, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.chooseFromValueMultiselect(testData.organizationTypeName, 1);
          QueryModal.verifySelectedMultiselectValue(testData.organizationTypeName, 1);
          QueryModal.verifyQueryAreaContent(
            `(organization.code == ${testData.organizationCode}) AND (organization.type_names in [${testData.organizationTypeName}])`,
          );

          // AND "Organization — Name" in <name>
          QueryModal.addNewRow(1);
          QueryModal.selectField(organizationFieldValues.name, 2);
          QueryModal.verifySelectedField(organizationFieldValues.name, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 2);
          QueryModal.clickOrganizationLookup(2);
          SelectOrganizationModal.selectOrganizations([testData.organizationName], 'Name');
          SelectOrganizationModal.save();
          SelectOrganizationModal.verifyClosed();
          QueryModal.verifyQueryAreaContent(
            `(organization.code == ${testData.organizationCode}) AND (organization.type_names in [${testData.organizationTypeName}]) AND (organization.name in [${testData.organizationName}])`,
          );

          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryAndSaveDisabled();

          // Step 4: Click "Select operator" dropdown for "Organization — Code" field and verify supported operators
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 5: Click "Test query" and verify "Organization — Code", "Organization — Name" and "Organization — Type names" columns are displayed
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyColumnValueForRow(
            testData.organizationCode,
            organizationFieldValues.code,
            testData.organizationCode,
          );
          QueryModal.verifyColumnValueForRow(
            testData.organizationCode,
            organizationFieldValues.name,
            testData.organizationName,
          );
          QueryModal.verifyColumnValueForRow(
            testData.organizationCode,
            organizationFieldValues.typeNames,
            testData.organizationTypeName,
          );

          // Step 6: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.waitForCompilingAnimationToDisappear();
          Lists.verifyRefreshCompleteCallout(1);

          // Step 7: Click "View updated list" link
          Lists.viewUpdatedList();

          // Verify displayed query and record amount match the query builder
          Lists.verifyQuery(
            `organization.code == ${testData.organizationCode}) AND (organization.type_names in [${testData.organizationTypeName}]) AND (organization.name in [${testData.organizationName}]`,
          );
          Lists.verifySingleRecordNumber();

          // Step 8: Verify "Organization — Code", "Organization — Name"  and "Organization — Type names" columns in result table
          Lists.verifyResultCellByIdentifier(
            testData.organizationCode,
            organizationFieldValues.code,
            testData.organizationCode,
          );
          Lists.verifyResultCellByIdentifier(
            testData.organizationCode,
            organizationFieldValues.name,
            testData.organizationName,
          );
          Lists.verifyResultCellByIdentifier(
            testData.organizationCode,
            organizationFieldValues.typeNames,
            testData.organizationTypeName,
          );
        },
      );
    });
  });
});
