import { Permissions } from '../../support/dictionary';
import getRandomPostfix from '../../support/utils/stringTools';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersCard from '../../support/fragments/users/usersCard';
import DateTools from '../../support/utils/dateTools';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Fees&Fines', () => {
  describe('Manual Patron Blocks', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };

    before('Creating test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      cy.createTempUser([Permissions.uiUsersPatronBlocks.gui, Permissions.uiUsersView.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user.userId,
            testData.servicePoint.id,
          );
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        },
      );
    });

    after('Deleting test data', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      cy.getBlockApi(testData.user.userId).then((blocks) => {
        if (blocks[0]) {
          cy.deleteBlockApi(blocks[0].id);
        }
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C374700 Verify buttons layout editing manual Patron blocks (vega) (TaaS)',
      { tags: ['extendedPath', 'vega'] },
      () => {
        const testDescription = `test ${getRandomPostfix()} description filter`;
        const newTestDescription = `test ${getRandomPostfix()} changed description filter`;
        const tomorrowDate = DateTools.getFormattedDate(
          { date: DateTools.getTomorrowDay() },
          'YYYY-MM-DD',
        );

        // Go to the "Users" app => Fill in the search box with the name of active User's profile, for example: "Morty"
        UsersSearchPane.searchByUsername(testData.user.username);
        Users.verifyFirstNameOnUserDetailsPane(testData.user.firstName);
        // Click on the "Patron blocks" accordion to expand it and select "Create block" button
        UsersCard.openPatronBlocks();
        UsersCard.createPatronBlock();
        UsersCard.verifyNewBlockForm();
        UsersCard.fillDescription(testDescription);
        // Click on the "Cancel" button
        UsersCard.cancelNewBlock();
        // Select "Keep editing" button
        UsersCard.keepEditingNewBlockForm();
        // Click on the "Save & close" button
        UsersCard.saveAndClose();
        UsersCard.verifyCreatedPatronBlock(testDescription);
        // Click on the row with recently created "Patron block" on the "Patron blocks" accordion
        UsersCard.openPatronBlockByDescription(testDescription);
        UsersCard.verifyBlockInfo();
        // Fill in any empty input field with valid value
        UsersCard.fillDate(tomorrowDate);
        // Click on the "Cancel" button => Select "Close without saving" button
        UsersCard.cancelNewBlock();
        UsersCard.closeWithoutSavingBlockForm();
        UsersCard.verifyCreatedPatronBlock(testDescription);
        // Click on the row with recently created "Patron block" on the "Patron blocks" accordion
        UsersCard.openPatronBlockByDescription(testDescription);
        UsersCard.verifyBlockInfo();
        // Fill in the "Display description" input field with a NEW short description
        UsersCard.fillDescription(newTestDescription);
        // Click on the "Save & close" button
        UsersCard.saveAndClose();
        UsersCard.verifyCreatedPatronBlock(newTestDescription);
      },
    );
  });
});
