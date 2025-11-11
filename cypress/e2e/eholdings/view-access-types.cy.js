import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import AccessStatusTypes from '../../support/fragments/settings/eholdings/accessStatusTypes';
import { APPLICATION_NAMES } from '../../support/constants';
import SettingsPane from '../../support/fragments/settings/settingsPane';

describe('eHoldings', () => {
  const randomPostfix = getRandomPostfix();
  const accessStatusTypeNamePrefix = `AT_C350958_AccessStatusType_${randomPostfix}`;
  const accessStatusTypeDescriptionPrefix = `AT_C350958_Description_${randomPostfix}`;
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
      cy.createTempUser([Permissions.uiSettingsEHoldingsViewAccessStatusTypes.gui]).then(
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
    'C350958 View access status types (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C350958'] },
    () => {
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.EHOLDINGS);
      AccessStatusTypes.openTab();
      AccessStatusTypes.checkTableHeaders(false);

      accessStatusTypesData.forEach(({ name, description }) => {
        AccessStatusTypes.verifyAccessStatusTypeShown({
          name,
          description,
          numberOfRecords: 0,
        });
      });
    },
  );
});
