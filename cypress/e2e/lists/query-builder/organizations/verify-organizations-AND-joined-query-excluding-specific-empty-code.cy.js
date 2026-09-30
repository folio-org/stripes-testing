import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  organizationFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { ORGANIZATIONS_FIELDS } from '../../../../support/constants/query-builder/organizationsFields';
import { Lists } from '../../../../support/fragments/lists/lists';
import ListsFile, { organizationCsvHeaders } from '../../../../support/fragments/lists/lists-file';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import SelectOrganizationModal from '../../../../support/fragments/orders/modals/selectOrganizationModal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1525842';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const postfix = getRandomPostfix();
const orgDescriptionPrefix = `AT_${testCaseId}`;
const orgDescription = `${orgDescriptionPrefix}_Description_${postfix}`;
const testData = {
  northwindOrg: { id: '', code: `NWIND_${postfix}`, name: `Northwind Traders_${postfix}` },
  southwindOrg: { id: '', code: `SWIND_${postfix}`, name: `Southwind Enterprises_${postfix}` },
  eastCoastLogisticsOrg: {
    id: '',
    code: `ECLOG_${postfix}`,
    name: `East Coast Logistics_${postfix}`,
  },
  ebscoOrg: { id: '', code: `EBSCO_${postfix}`, name: `EBSCO Publishing_${postfix}` },
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Organizations', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        [
          testData.northwindOrg,
          testData.southwindOrg,
          testData.eastCoastLogisticsOrg,
          testData.ebscoOrg,
        ].forEach((org) => {
          Organizations.createOrganizationViaApi({
            ...NewOrganization.getDefaultOrganization(),
            name: org.name,
            code: org.code,
            status: 'Active',
            description: orgDescription,
          }).then((id) => {
            org.id = id;
          });
        });

        cy.createTempUser([Permissions.listsAll.gui, Permissions.uiOrganizationsView.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName);
        Lists.deleteDownloadedFile(listName);

        [
          testData.northwindOrg,
          testData.southwindOrg,
          testData.eastCoastLogisticsOrg,
          testData.ebscoOrg,
        ].forEach((org) => {
          if (org.id) {
            Organizations.deleteOrganizationViaApi(org.id);
          }
        });
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C1525842 User can run, save, and export an AND-joined query excluding specific Organization code and empty codes (athena)',
        { tags: ['extendedPath', 'athena', 'C1525842'] },
        () => {
          // Step 1: Create new list with Organizations record type, click "Build query" button
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.organizations);

          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryAndSaveDisabled(true);

          // Step 2: Build query: "Organization — Code" not equal to <Northwind Traders code>, click "+" to add a second condition row
          QueryModal.selectField(organizationFieldValues.code);
          QueryModal.verifySelectedField(organizationFieldValues.code);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.clickOrganizationLookup();
          SelectOrganizationModal.findOrganization(testData.northwindOrg.code);
          SelectOrganizationModal.verifyClosed();
          QueryModal.verifyQueryAreaContent(`(organization.code != ${testData.northwindOrg.code})`);
          QueryModal.addNewRow();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryAndSaveDisabled(true);

          // Step 3: Select "Organization — Code" not in [<Southwind Enterprises code>, <East Coast Logistics code>], click "+" to add a third condition row
          QueryModal.selectField(organizationFieldValues.code, 1);
          QueryModal.verifySelectedField(organizationFieldValues.code, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_IN, 1);
          QueryModal.clickOrganizationLookup(1);
          SelectOrganizationModal.selectOrganizations(
            [testData.southwindOrg.code, testData.eastCoastLogisticsOrg.code],
            'Code',
          );
          SelectOrganizationModal.save();
          SelectOrganizationModal.verifyClosed();
          QueryModal.verifyQueryAreaContent(
            `(organization.code != ${testData.northwindOrg.code}) AND (organization.code not in [${testData.southwindOrg.code}, ${testData.eastCoastLogisticsOrg.code}])`,
          );
          QueryModal.addNewRow(1);
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryAndSaveDisabled(true);

          // Step 4: Select "Organization — Code" field, then select operator "is null/empty"
          QueryModal.selectField(organizationFieldValues.code, 2);
          QueryModal.verifySelectedField(organizationFieldValues.code, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL, 2);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IS_NULL, 2);
          QueryModal.verifyOptionsInValueSelect(['True', 'False'], 2);
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryAndSaveDisabled(true);

          // Step 5: Select value "False"
          QueryModal.chooseValueSelect('False', 2, {
            exactMatch: false,
          });
          QueryModal.verifyQueryAreaContent(
            `(organization.code != ${testData.northwindOrg.code}) AND (organization.code not in [${testData.southwindOrg.code}, ${testData.eastCoastLogisticsOrg.code}]) AND (organization.code is null/empty False)`,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryAndSaveDisabled(true);

          // Step 5a: Add filter - "Organization — Description" field with contains operator, matching the shared prefix
          QueryModal.addNewRow(2);
          QueryModal.selectField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 3);
          QueryModal.verifySelectedField(ORGANIZATIONS_FIELDS.ORGANIZATION.DESCRIPTION, 3);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS, 3);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.CONTAINS, 3);
          QueryModal.fillInValueTextfield(orgDescription, 3);
          QueryModal.verifyQueryAreaContent(
            `(organization.code != ${testData.northwindOrg.code}) AND (organization.code not in [${testData.southwindOrg.code}, ${testData.eastCoastLogisticsOrg.code}]) AND (organization.code is null/empty False) AND (organization.description contains ${orgDescription})`,
          );

          // Step 6: Click "Test query"
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyColumnValueForRow(
            testData.ebscoOrg.code,
            organizationFieldValues.code,
            testData.ebscoOrg.code,
          );
          QueryModal.verifyResultFound(testData.northwindOrg.code, { isFound: false });
          QueryModal.verifyResultFound(testData.southwindOrg.code, { isFound: false });
          QueryModal.verifyResultFound(testData.eastCoastLogisticsOrg.code, { isFound: false });

          // Step 7: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.waitForCompilingAnimationToDisappear();

          // Step 8: Click "View updated list" link
          Lists.viewUpdatedList();

          // Verify displayed query
          Lists.verifyQuery(
            `organization.code != ${testData.northwindOrg.code}) AND (organization.code not in [${testData.southwindOrg.code}, ${testData.eastCoastLogisticsOrg.code}]) AND (organization.code is null/empty False) AND (organization.description contains ${orgDescription}`,
          );

          // Verify columns in result table
          Lists.verifyResultCellByIdentifier(
            testData.ebscoOrg.code,
            organizationFieldValues.code,
            testData.ebscoOrg.code,
          );
          Lists.verifyRecordValueAbsentInResultTable(testData.northwindOrg.code);
          Lists.verifyRecordValueAbsentInResultTable(testData.southwindOrg.code);
          Lists.verifyRecordValueAbsentInResultTable(testData.eastCoastLogisticsOrg.code);

          // Step 9: Click "Actions" > "Export selected columns (CSV)"
          Lists.openActions();
          Lists.exportListVisibleColumns();
          Lists.verifyExportCallouts(listName);

          // Step 10: Open the exported CSV file and inspect the Organization code column
          ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
            listName,
            organizationCsvHeaders.code,
            testData.ebscoOrg.code,
            [{ header: organizationCsvHeaders.code, value: testData.ebscoOrg.code }],
          );
          ListsFile.verifyCsvFileRowsRecordsNumber(listName, 1);
        },
      );
    });
  });
});
