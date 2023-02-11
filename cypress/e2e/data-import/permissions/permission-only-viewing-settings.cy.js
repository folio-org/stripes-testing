import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';

describe('ui-data-import:', () => {
  let user;

  before('create user', () => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {

      });

    cy.createTempUser([
      permissions.settingsDataImportCanViewOnly.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.settingsPath, waiter: SettingsPane.waitLoading });
      });
  });

  //   after(() => {

  //   });

  it('C353645 Checking the Data import UI permission for only viewing settings (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {

    });
});
