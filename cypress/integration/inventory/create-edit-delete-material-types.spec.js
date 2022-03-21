import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-inventory: Create, edit, delete material types', () => {
  let userId = '';
  beforeEach(() => {
    cy.createTempUser(permissions.uiCreateEditDeleteMaterialTypes.gui).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdingsPath);
    });
  });

  it('C505 Settings (Inventory): Create, edit, delete material types', { tags: [TestTypes.smoke] }, () => {


  });
});

