import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import AccessStatusTypes from '../../support/fragments/settings/eholdings/accessStatusTypes';
import Credentials from '../../support/fragments/settings/eholdings/credentials';
import { APPLICATION_NAMES } from '../../support/constants';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';

describe('eHoldings', () => {
  const randomPostfix = getRandomPostfix();
  const accessStatusTypeNamePrefix = `AT_C590791_AccessStatusType_${randomPostfix}`;
  const accessStatusTypeDescriptionPrefix = `AT_C590791_Description_${randomPostfix}`;
  const createdAccessStatusTypeIds = [];
  const MAX_ACCESS_STATUS_TYPES = 15;
  let user;

  before('Creating data', () => {
    cy.getAdminToken();

    Credentials.getCredentialsViaApi().then((credentials) => {
      AccessStatusTypes.getAccessStatusTypesViaApi(credentials[0].id).then((types) => {
        const testTypes = types.filter((type) => type.attributes.name.includes('AT_C590791_AccessStatusType_'));
        testTypes.forEach((type) => {
          AccessStatusTypes.deleteAccessStatusTypeViaApi(credentials[0].id, type.id);
        });
      });
    });

    for (let i = 0; i < MAX_ACCESS_STATUS_TYPES - 1; i++) {
      const name = `${accessStatusTypeNamePrefix}_${i}`;
      const description = `${accessStatusTypeDescriptionPrefix}_${i}`;

      AccessStatusTypes.createAccessStatusTypeForDefaultKbViaApi(name, description).then((id) => {
        createdAccessStatusTypeIds.push(id);
      });
    }

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

  after('Delete test data', () => {
    cy.getAdminToken();
    if (user) {
      Users.deleteViaApi(user.userId);
    }
    createdAccessStatusTypeIds.forEach((id) => {
      AccessStatusTypes.deleteAccessStatusTypeFromDefaultKbViaApi(id);
    });
  });

  it.skip('C590791 Create access status types (spitfire)', { tags: [] }, () => {
    SettingsPane.selectSettingsTab(APPLICATION_NAMES.EHOLDINGS);
    AccessStatusTypes.openTab();
    AccessStatusTypes.checkTableHeaders();

    for (let i = 0; i < MAX_ACCESS_STATUS_TYPES - 1; i++) {
      AccessStatusTypes.verifyAccessStatusTypeShown({
        name: `${accessStatusTypeNamePrefix}_${i}`,
        description: `${accessStatusTypeDescriptionPrefix}_${i}`,
        actions: [AccessStatusTypes.ICON_ACTIONS.EDIT, AccessStatusTypes.ICON_ACTIONS.TRASH],
      });
    }

    AccessStatusTypes.clickNew();
    const lastName = `${accessStatusTypeNamePrefix}_${MAX_ACCESS_STATUS_TYPES - 1}`;
    const lastDescription = `${accessStatusTypeDescriptionPrefix}_${MAX_ACCESS_STATUS_TYPES - 1}`;
    AccessStatusTypes.fillInTextFields(lastName, lastDescription);
    AccessStatusTypes.clickSave();

    cy.getAdminToken().then(() => {
      Credentials.getCredentialsViaApi().then((credentials) => {
        AccessStatusTypes.getAccessStatusTypesViaApi(credentials[0].id).then((types) => {
          const createdType = types.find((type) => type.attributes.name === lastName);
          createdAccessStatusTypeIds.push(createdType.id);
        });
      });
    });

    AccessStatusTypes.verifyAccessStatusTypeShown({
      name: lastName,
      description: lastDescription,
      actions: [AccessStatusTypes.ICON_ACTIONS.EDIT, AccessStatusTypes.ICON_ACTIONS.TRASH],
    });

    AccessStatusTypes.verifyNewButtonDisabled();

    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EHOLDINGS);
    EHoldingSearch.switchToPackages();
    EHoldingsPackagesSearch.openAccessStatusTypesDropdown();

    EHoldingsPackagesSearch.checkAccessStatusTypeOptionAvailable(`${accessStatusTypeNamePrefix}_0`);
    EHoldingsPackagesSearch.checkAccessStatusTypeOptionAvailable(
      `${accessStatusTypeNamePrefix}_${MAX_ACCESS_STATUS_TYPES - 1}`,
    );
  });
});
