import { Permissions } from '../../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ClassificationBrowse from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      let user;

      before('Create user, login', () => {
        cy.createTempUser([
          Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password);
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C451641 View "Settings >> Inventory >> Classification browse" page (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C451641'] },
        () => {
          // 1 Go to "Settings" app >> "Inventory" tab
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
          ClassificationBrowse.checkPositionInNavigationList();

          // 2 Click on the "Classification browse" section
          cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
          ClassificationBrowse.openClassificationBrowse();
          cy.wait('@instanceClassifications').then(() => {
            ClassificationBrowse.checkClassificationBrowsePaneOpened();
            ClassificationBrowse.checkTableHeaders();
            ClassificationBrowse.checkDefaultClassificationBrowseInTable();
            ClassificationBrowse.checkInfoIconExists();

            // 3 Click on the info popover icon next to “Classification identifier types” column
            ClassificationBrowse.clickInfoIcon();
            ClassificationBrowse.checkPopoverMessage();
          });
        },
      );
    });
  });
});
