import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import UsersCard from '../../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let testUser;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password).then(() => {
        cy.createTempUser([]).then((userProperties) => {
          testUser = userProperties;

          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, testUser.userId);
        });
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password);
      cy.setTenant(memberTenant.id);
      Users.deleteViaApi(testUser.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    });

    it(
      'C359214 Verify expiration date updates in In-app approach (firebird)',
      { tags: ['dryRun', 'firebird', 'C359214'] },
      () => {
        const todayDate = new Date();
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillExpirationDate(todayDate);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();
        UsersSearchPane.searchByKeywords(testUser.username);
        UsersSearchPane.openUser(testUser.username);
        UsersCard.verifyExpirationDate(todayDate);
      },
    );
  });
});
