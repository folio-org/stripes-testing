import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';


describe('ui-data-import', () => {
  let user;

  before('login', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrganizationsView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
  });

  it('C376975 Order field mapping profile: Check fund and expense class mappings (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      
    });
});
