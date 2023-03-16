import permissions from '../../../support/dictionary/permissions';

describe('ui-data-import', () => {
  let firstUser;
  let secondUser;

  before('create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        firstUser = userProperties;
      });

    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportCanViewOnly.gui
    ])
      .then(userProperties => {
        secondUser = userProperties;
      });
  });

  //   after(() => {
  //     Users.deleteViaApi(firstUser.userId);
  //     Users.deleteViaApi(secondUser.userId);
  //   });

  it('C368009  (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {

    });
});
