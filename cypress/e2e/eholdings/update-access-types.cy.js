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
  const accessStatusTypeName = `AT_C590792_AccessStatusType_${randomPostfix}`;
  const accessStatusTypeDescription = `AT_C590792_Description_${randomPostfix}`;
  const updatedAccessStatusTypeName = `AT_C590792_AccessStatusType_Updated_${randomPostfix}`;
  const updatedAccessStatusTypeDescription = `AT_C590792_Description_Updated_${randomPostfix}`;

  const createdAccessStatusTypeIds = [];
  let user;

  before('Creating data', () => {
    cy.getAdminToken();
    cy.then(() => {
      AccessStatusTypes.createAccessStatusTypeForDefaultKbViaApi(
        accessStatusTypeName,
        accessStatusTypeDescription,
      ).then((id) => {
        createdAccessStatusTypeIds.push(id);
      });
    }).then(() => {
      cy.createTempUser([Permissions.uiSettingsEHoldingsAccessStatusTypesAll.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
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
    'C590792 Update access status types (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C590792'] },
    () => {
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.EHOLDINGS);
      AccessStatusTypes.openTab();
      AccessStatusTypes.checkTableHeaders();

      AccessStatusTypes.verifyAccessStatusTypeShown({
        name: accessStatusTypeName,
        description: accessStatusTypeDescription,
        actions: [AccessStatusTypes.ICON_ACTIONS.EDIT, AccessStatusTypes.ICON_ACTIONS.TRASH],
      });

      AccessStatusTypes.clickActionButtonForAccessStatusType(
        AccessStatusTypes.ICON_ACTIONS.EDIT,
        accessStatusTypeName,
        accessStatusTypeDescription,
      );
      AccessStatusTypes.fillInTextFields(
        updatedAccessStatusTypeName,
        updatedAccessStatusTypeDescription,
      );
      AccessStatusTypes.clickSave();

      AccessStatusTypes.verifyAccessStatusTypeShown({
        name: updatedAccessStatusTypeName,
        description: updatedAccessStatusTypeDescription,
        actions: [AccessStatusTypes.ICON_ACTIONS.EDIT, AccessStatusTypes.ICON_ACTIONS.TRASH],
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EHOLDINGS);
      EHoldingSearch.switchToPackages();
      EHoldingsPackagesSearch.openAccessStatusTypesDropdown();
      EHoldingsPackagesSearch.checkAccessStatusTypeOptionAvailable(updatedAccessStatusTypeName);
      EHoldingsPackagesSearch.checkAccessStatusTypeOptionAvailable(accessStatusTypeName, false);
    },
  );
});
