import { Permissions } from '../../../../support/dictionary';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {};

      before('Create test data', () => {
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422105 User cannot create new "MARC bib" record without "quickMARC: Create a new MARC bibliographic record" permission (spitfire) (TaaS)',
        {
          tags: ['extendedPath', 'spitfire', 'C422105'],
        },
        () => {
          // Open "Inventory" app
          InventoryInstances.waitContentLoading();
          // Click on "Actions" button in second pane
          // Expanded menu does NOT include following option:
          // "+New MARC Bib Record"
          InstanceRecordView.validateOptionInActionsMenu('New MARC bib record', false);
        },
      );
    });
  });
});
