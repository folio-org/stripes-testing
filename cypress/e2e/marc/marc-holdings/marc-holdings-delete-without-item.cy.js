import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      marcBibTitle: `AT_C345403_MarcBibInstance_${getRandomPostfix()}`,
    };

    let recordId;
    let location;

    before('Creating user, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
          (loc) => {
            location = loc;
          },
        );
      }).then(() => {
        cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
          recordId = instanceId;
          cy.getInstanceById(instanceId).then((instanceData) => {
            cy.createSimpleMarcHoldingsViaAPI(recordId, instanceData.hrid, location.code).then(
              () => {
                cy.getAdminToken();
                cy.createTempUser([
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
                ]).then((tempUser) => {
                  testData.tempUser = tempUser;

                  cy.login(tempUser.username, tempUser.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                    authRefresh: true,
                  });
                });
              },
            );
          });
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.tempUser.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
    });

    it(
      'C345403 Delete holdings without item (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C345403'] },
      () => {
        InventoryInstances.searchByTitle(recordId);
        InventoryInstances.selectInstanceById(recordId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();

        HoldingsRecordView.delete();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.verifyHoldingsAbsent(location.name);
      },
    );
  });
});
