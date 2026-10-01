import { APPLICATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import ListsFile, { usersCsvHeaders } from '../../../support/fragments/lists/lists-file';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const todayDate = DateTools.getCurrentDate();

const testData = {
  user: {},
  listName: `AT_C983199_List_${randomFourDigitNumber()}`,
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: testData.user.userId,
          permissions: [Permissions.listsAll.gui, Permissions.uiOrdersView.gui],
        });

        cy.affiliateUserToTenant({
          tenantId: Affiliations.University,
          userId: testData.user.userId,
          permissions: [Permissions.listsAll.gui, Permissions.uiOrdersView.gui],
        });

        cy.login(testData.user.username, testData.user.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
        Lists.filtersWaitLoading();
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      Lists.deleteListByNameViaApi(testData.listName);
      cy.resetTenant();
      Lists.deleteDownloadedFile(testData.listName);
      if (testData.user.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C983199 [Users] Verify that it\'s possible to run queries using the "Users" ET in Member tenant and the exporting works fine (consortia) (athena)',
      { tags: ['extendedPathECS', 'athena', 'C983199'] },
      () => {
        // Step 1: Create new list with "Users" record type and open Query builder
        Lists.openNewListPane();
        Lists.setName(testData.listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Configure query: User — Active equals True AND User Created date equals today
        QueryModal.selectField(usersFieldValues.userActive);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userCreatedDate, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.pickDate(todayDate, 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled(true);
        QueryModal.testQuery();
        QueryModal.testQueryDisabled(true);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 3: Check preview of found records
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 4: Click "Run query & save"
        QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(testData.listName);

          // Step 5: Wait for refresh, then export all columns
          Lists.verifyRefreshCompleteCallout(recordCount);
          Lists.viewUpdatedList();
          Lists.verifyQueryValue('True', QUERY_OPERATIONS.EQUAL, 'list-column-user.active');
          Lists.openActions();
          Lists.exportList();
          Lists.verifyListExportGeneratedCalloutMessage(testData.listName);
          Lists.verifyListExportedCalloutMessage(testData.listName);

          // Step 6: Verify exported CSV — "User — Active" column contains "True" for the test user
          ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
            testData.listName,
            usersCsvHeaders.lastName,
            testData.user.lastName,
            [
              {
                header: usersCsvHeaders.userActive,
                value: true,
              },
            ],
          );
        });
      },
    );
  });
});
