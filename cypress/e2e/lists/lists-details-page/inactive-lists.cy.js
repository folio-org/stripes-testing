import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists details page', () => {
    let userData = {};
    const inactiveListData = {
      name: `AT_C411840_Inactive_${getTestEntityValue('list')}`,
      description: `AT_C411840_Inactive_${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: false,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.loansAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });

      Lists.createViaApi(inactiveListData).then((body) => {
        inactiveListData.id = body.id;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteViaApi(inactiveListData.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411840 Inactive lists (corsair)',
      { tags: ['extendedPath', 'corsair', 'C411840'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.selectInactiveLists();
        Lists.openList(inactiveListData.name);
        Lists.verifyRecordsNumber('No');

        Lists.openActions();
        Lists.verifyRefreshListButtonIsDisabled();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonIsActive();
        Lists.verifyExportListVisibleColumnsButtonIsDisabled();
        Lists.verifyExportListButtonIsDisabled();

        Lists.clickOnListInformationAccordion();
        Lists.clickOnListInformationAccordion();
        Lists.verifyListNameLabel(inactiveListData.name);
        Lists.verifyListDescriptionLabel(inactiveListData.description);
        Lists.verifyStatusLabel('Inactive');

        Lists.clickOnQueryAccordion();
        Lists.clickOnQueryAccordion();
        Lists.verifyRecordsNumber('No');
        Lists.verifyListsPaneIsEmpty();

        Lists.closeListDetailsPane();
      },
    );
  });
});
