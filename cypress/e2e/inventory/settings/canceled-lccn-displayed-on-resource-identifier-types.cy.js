import { Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import ResourceIdentifierTypes from '../../../support/fragments/settings/inventory/instances/resourceIdentifierTypes';

describe('Inventory', () => {
  describe('Settings', () => {
    let user;
    const testData = {
      payload: {
        name: 'Canceled LCCN',
        source: 'folio',
      },
    };

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.crudResourceIdentifierTypes.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C442825 "Cancelled LCCN" is displayed on "Resource identifier types" page (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C442825'] },
      () => {
        cy.visit(SettingsMenu.inventoryPath);
        ResourceIdentifierTypes.choose();
        ResourceIdentifierTypes.verifyLocalResourceIdentifierTypesInTheList(testData.payload);
      },
    );
  });
});
