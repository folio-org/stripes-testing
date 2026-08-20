import Permissions from '../../../../support/dictionary/permissions';
import { USERS_WITH_MANUAL_BLOCKS_FIELDS } from '../../../../support/constants/query-builder/usersWithManualBlocksFields';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import { APPLICATION_NAMES } from '../../../../support/constants';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const listName = `AT_C1282798_List_${getRandomPostfix()}`;
const patronBlockDescription = `AT_C1282798_descripion_${getRandomPostfix()}`;
const searchValue = patronBlockDescription.slice(0, 29);

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Composite Entity Types', () => {
      before('Create test user and setup patron block', () => {
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiUsersView.gui,
          Permissions.uiUsersPatronBlocks.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: Users.waitLoading,
          });
          UsersSearchPane.waitLoading();
          UsersSearchPane.searchByKeywords(user.username);
          UsersCard.waitLoading();
          UsersCard.openPatronBlocks();
          UsersCard.createPatronBlock();
          UsersCard.fillDescription(patronBlockDescription);
          UsersCard.saveAndClose();
          UsersCard.verifyCreatedPatronBlock(patronBlockDescription);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
          Lists.waitLoading();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        Lists.deleteListByNameViaApi(listName);
      });

      it(
        'C1282798 Users with manual blocks - deleted manual blocks (athena)',
        { tags: ['criticalPath', 'athena', 'C1282798'] },
        () => {
          // Step 1: Click "New" button, select "Users with manual blocks" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.usersWithManualBlocks);
          Lists.verifySaveButtonIsActive();

          // Step 2: Click "Build query" button
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Verify Field dropdown shows correct sources
          QueryModal.verifyAllAvailableFieldOptions([
            ...Object.values(USERS_WITH_MANUAL_BLOCKS_FIELDS.USER),
            ...Object.values(USERS_WITH_MANUAL_BLOCKS_FIELDS.PATRON_GROUP),
            ...Object.values(USERS_WITH_MANUAL_BLOCKS_FIELDS.MANUAL_BLOCKS),
            ...Object.values(USERS_WITH_MANUAL_BLOCKS_FIELDS.MANUAL_BLOCKS_CREATED_BY),
            ...Object.values(USERS_WITH_MANUAL_BLOCKS_FIELDS.MANUAL_BLOCKS_UPDATED_BY),
          ]);

          // Step 4: Build query with description
          QueryModal.selectField(USERS_WITH_MANUAL_BLOCKS_FIELDS.MANUAL_BLOCKS.DESCRIPTION);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(searchValue);
          QueryModal.testQuery();

          // Step 5: Verify query returns user with the description
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyPreviewOfRecordsMatched(1);
          Lists.verifyResultCellContains(
            0,
            USERS_WITH_MANUAL_BLOCKS_FIELDS.MANUAL_BLOCKS.DESCRIPTION,
            patronBlockDescription,
          );

          // Step 6: Click "Run query and save"
          Lists.runQueryAndSave();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.waitForCompilingToComplete();
          Lists.verifyRecordWithContent(patronBlockDescription);
          Lists.closeListDetailsPane();

          // Step 7: Navigate to Users app, delete the patron block, return to Lists app, open the list
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersCard.waitLoading();
          UsersCard.openPatronBlocks();
          UsersCard.openPatronBlockByDescription(patronBlockDescription);
          UsersCard.deletePatronBlock();
          UsersCard.waitLoading();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
          Lists.waitLoading();
          Lists.openList(listName);
          Lists.verifyResultCellContains(0, USERS_WITH_MANUAL_BLOCKS_FIELDS.USER.ACTIVE, 'Deleted');

          // Step 8: Click Actions → Refresh list, verify the record is no longer in the result set
          Lists.openActions();
          Lists.refreshList();
          Lists.waitForCompilingToComplete();
          Lists.verifyRecordsNumber('No');
        },
      );
    });
  });
});
