import CapabilitySets from '../../../support/dictionary/capabilitySets';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const testData = {
      instanceTitle: `AT_C1464271_FolioInstance_${getRandomPostfix()}`,
      copyNumber: `AT_C1464271_CopyNumber_${getRandomPostfix()}`,
    };

    let user;
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.location = location;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        }).then(({ instanceId: createdInstanceId }) => {
          instanceId = createdInstanceId;
        });

        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.assignCapabilitiesToExistingUser(user.userId, [], [CapabilitySets.uiInventory]);

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C1464271 Enter key in textbox on Holdings create form triggers "Save & close" (promin)',
      { tags: ['extendedPath', 'promin', 'C1464271'] },
      () => {
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Add holdings form opens, Permanent location required (Save & close disabled)
        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.checkButtonsEnabled({
          saveAndClose: false,
          saveAndKeep: null,
          close: true,
        });

        // Step 2: select Permanent location, fill Copy number, cursor stays in the field
        HoldingsRecordEdit.changePermanentLocation(testData.location.name);
        HoldingsRecordEdit.checkButtonsEnabled({
          saveAndClose: true,
          saveAndKeep: null,
          close: true,
        });
        HoldingsRecordEdit.fillCallNumberValues({ copyNumber: testData.copyNumber });
        HoldingsRecordEdit.verifyCallNumberValues({ copyNumber: testData.copyNumber });

        // Step 3: Enter in Copy number - holdings record is saved and closed, back on the
        // Instance detail view with the new holdings visible
        HoldingsRecordEdit.pressEnterInCopyNumberField();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.checkHoldingsTableContent({ name: testData.location.name, records: [] });
      },
    );
  });
});
