import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import AccessStatusTypes from '../../support/fragments/settings/eholdings/accessStatusTypes';
import { APPLICATION_NAMES } from '../../support/constants';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';

describe('eHoldings', () => {
  const randomPostfix = getRandomPostfix();
  const accessStatusTypeNamePrefix = `AT_C590793_AccessStatusType_${randomPostfix}`;
  const accessStatusTypeDescriptionPrefix = `AT_C590793_Description_${randomPostfix}`;
  const accessStatusTypesData = [
    {
      name: `${accessStatusTypeNamePrefix} One`,
      description: `${accessStatusTypeDescriptionPrefix} One`,
    },
    {
      name: `${accessStatusTypeNamePrefix} Two`,
      description: `${accessStatusTypeDescriptionPrefix} Two`,
    },
  ];

  const createdAccessStatusTypeIds = [];
  let user;

  before('Creating data', () => {
    cy.getAdminToken();
    cy.then(() => {
      accessStatusTypesData.forEach(({ name, description }) => {
        AccessStatusTypes.createAccessStatusTypeForDefaultKbViaApi(name, description).then((id) => {
          createdAccessStatusTypeIds.push(id);
        });
      });
    }).then(() => {
      cy.createTempUser([Permissions.uiSettingsEHoldingsAccessStatusTypesAll.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });
            SettingsPane.selectSettingsTab(APPLICATION_NAMES.EHOLDINGS);
          });
        },
      );
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    createdAccessStatusTypeIds.forEach((id) => {
      AccessStatusTypes.deleteAccessStatusTypeFromDefaultKbViaApi(id);
    });
  });

  it(
    'C590793 Delete access status types (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C590793'] },
    () => {
      AccessStatusTypes.openTab();
      AccessStatusTypes.checkTableHeaders();

      accessStatusTypesData.forEach(({ name, description }) => {
        AccessStatusTypes.verifyAccessStatusTypeShown({
          name,
          description,
          actions: [AccessStatusTypes.ICON_ACTIONS.EDIT, AccessStatusTypes.ICON_ACTIONS.TRASH],
        });
      });

      AccessStatusTypes.clickActionButtonForAccessStatusType(
        AccessStatusTypes.ICON_ACTIONS.TRASH,
        accessStatusTypesData[0].name,
        accessStatusTypesData[0].description,
      );
      AccessStatusTypes.confirmDeleteAccessStatusType();
      AccessStatusTypes.verifyAccessStatusTypeAbsent({
        name: accessStatusTypesData[0].name,
        description: accessStatusTypesData[0].description,
      });
      AccessStatusTypes.verifyAccessStatusTypeShown({
        name: accessStatusTypesData[1].name,
        description: accessStatusTypesData[1].description,
        actions: [AccessStatusTypes.ICON_ACTIONS.EDIT, AccessStatusTypes.ICON_ACTIONS.TRASH],
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EHOLDINGS);
      EHoldingSearch.switchToPackages();
      EHoldingsPackagesSearch.openAccessStatusTypesDropdown();
      EHoldingsPackagesSearch.checkAccessStatusTypeOptionAvailable(accessStatusTypesData[1].name);
      EHoldingsPackagesSearch.checkAccessStatusTypeOptionAvailable(
        accessStatusTypesData[0].name,
        false,
      );
    },
  );
});
