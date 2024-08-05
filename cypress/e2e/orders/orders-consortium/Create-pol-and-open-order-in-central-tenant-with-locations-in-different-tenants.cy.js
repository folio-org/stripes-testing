import Permissions from '../../../support/dictionary/permissions';
import Arrays from '../../../support/utils/arrays';
import Users from '../../../support/fragments/users/users';
import ConsortiumManager, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { tenantNames } from '../../../support/dictionary/affiliations';

describe('Consortia', () => {
  describe('Orders(Consortium)', () => {
    let userData;
    const settingsList = Object.values(settingsItems);

    const chooseSettingItem = (setting, members) => {
      ConsortiumManager.chooseSettingsItem(setting);
      ConsortiumManager.verifyMembersSelected(members);
      ConsortiumManager.verifySelectMembersButton();
    };
    const verifyFoundMembersAndTotalSelected = (members, total) => {
      SelectMembers.verifyMembersFound(members);
      SelectMembers.verifyTotalSelected(total);
      SelectMembers.verifyAvailableTenants([tenantNames.central]);
    };
    const checkConsortiumManagerAfterSelectMembersSave = (setting, members) => {
      SelectMembers.saveAndClose();
      ConsortiumManager.waitLoading();
      ConsortiumManager.verifySettingPaneIsDisplayed();
      ConsortiumManager.verifySelectedSettingIsDisplayed(setting);
      ConsortiumManager.verifyMembersSelected(members);
      ConsortiumManager.verifySelectMembersButton();
    };

    before('Create users data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.consortiaSettingsConsortiumManagerView.gui]).then(
        (userProperties) => {
          userData = userProperties;
          cy.login(userData.username, userData.password);
        },
      );
    });

    after('Delete users data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C468195 ECS | Create POL and open order (in Central tenant) with locations in different tenants (consortia) (thunderjet)',
      { tags: ['smokeECS', 'thunderjet'] },
      () => {
        TopMenuNavigation.navigateToApp('Consortium manager');
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.verifyMembersSelected();
        ConsortiumManager.verifyPaneIncludesSettings(settingsList.sort());
        const randomSetting = Arrays.getRandomElement(settingsList);
        chooseSettingItem(randomSetting, 1);
        ConsortiumManager.clickSelectMembers();
        SelectMembers.changeSelectAllCheckbox('check');
        SelectMembers.verifyStatusOfSelectMembersModal(1);
        verifyFoundMembersAndTotalSelected(1, 1);
        SelectMembers.changeSelectAllCheckbox('uncheck');
        verifyFoundMembersAndTotalSelected(1, 0);
        checkConsortiumManagerAfterSelectMembersSave(randomSetting, 0);

        cy.logout();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp('Consortium manager');
        ConsortiumManager.verifyStatusOfConsortiumManager(0);
        ConsortiumManager.verifyMembersSelected(0);
        chooseSettingItem(randomSetting, 0);
        ConsortiumManager.clickSelectMembers();
        SelectMembers.verifyStatusOfSelectMembersModal(0);
        verifyFoundMembersAndTotalSelected(1, 0);
        checkConsortiumManagerAfterSelectMembersSave(randomSetting, 0);
      },
    );
  });
});
