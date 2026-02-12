import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Groups from '../../../support/fragments/finance/groups/groups';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance: Groups', () => {
  const defaultGroup = { ...Groups.defaultUiGroup };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let userA;

  before(() => {
    cy.getAdminToken();

    cy.createTempUser([
      permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceCreateViewEditGroups.gui,
      permissions.uiFinanceViewEditDeleteGroups.gui,
    ]).then((userProperties) => {
      userA = userProperties;
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(userA.userId);
    Groups.deleteGroupViaApi(defaultGroup.id);

    AcquisitionUnits.getAcquisitionUnitViaApi({
      query: `"name"="${defaultAcquisitionUnit.name}"`,
    }).then((response) => {
      if (response.acquisitionsUnits && response.acquisitionsUnits.length > 0) {
        AcquisitionUnits.deleteAcquisitionUnitViaApi(response.acquisitionsUnits[0].id);
      }
    });
  });

  it(
    'C367938 Test acquisition unit restrictions for Group records (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C367938'] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignUser(userA.username);

      cy.login(userA.username, userA.password, {
        path: TopMenu.groupsPath,
        waiter: Groups.waitLoading,
      });

      Groups.createGroupWithAcquisitionUnitAndCaptureId(defaultGroup, defaultAcquisitionUnit.name);
      Groups.checkCreatedGroup(defaultGroup);

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.selectAU(defaultAcquisitionUnit.name);
      AcquisitionUnits.unAssignUser(userA.username, defaultAcquisitionUnit.name);

      cy.login(userA.username, userA.password, {
        path: TopMenu.groupsPath,
        waiter: Groups.waitLoading,
      });

      FinanceHelp.searchByName(defaultGroup.name);
      Groups.checkZeroSearchResultsHeader();

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.selectAU(defaultAcquisitionUnit.name);
      AcquisitionUnits.editAU();
      AcquisitionUnits.selectViewCheckbox();

      cy.login(userA.username, userA.password, {
        path: TopMenu.groupsPath,
        waiter: Groups.waitLoading,
      });

      FinanceHelp.searchByName(defaultGroup.name);
      Groups.checkCreatedInList(defaultGroup.name);

      Groups.selectGroup(defaultGroup.name);
      Groups.waitForGroupDetailsLoading();
      Groups.checkCreatedGroup(defaultGroup);
    },
  );
});
