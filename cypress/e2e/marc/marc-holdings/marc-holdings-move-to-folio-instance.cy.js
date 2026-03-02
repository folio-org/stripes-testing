import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      marcBibTitle: `AT_C345405_MarcBibInstance_${randomPostfix}`,
      folioInstanceTitle: `AT_C345405_FolioInstance_${randomPostfix}`,
      tag004: '004',
    };

    const folioInstanceData = InventoryInstances.generateFolioInstances({
      count: 1,
      instanceTitlePrefix: testData.folioInstanceTitle,
      holdingsCount: 0,
      itemsCount: 0,
    });

    const waitForUiToStabilize = () => cy.wait(1000);

    const recordIds = [];
    let location;
    let folioInstanceHrid;

    before('Creating user, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"*autotest*" and name<>"AT_*")',
        }).then((loc) => {
          location = loc;
        });
      }).then(() => {
        cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
          recordIds.push(instanceId);
          cy.getInstanceById(instanceId).then((marcInstanceData) => {
            cy.createSimpleMarcHoldingsViaAPI(
              recordIds[0],
              marcInstanceData.hrid,
              location.code,
            ).then(() => {
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: folioInstanceData,
              }).then(() => {
                recordIds.push(folioInstanceData[0].instanceId);
                cy.getInstanceById(folioInstanceData[0].instanceId).then((instanceData) => {
                  folioInstanceHrid = instanceData.hrid;
                });

                cy.getAdminToken();
                cy.createTempUser([
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
                  Permissions.uiInventoryHoldingsMove.gui,
                ]).then((tempUser) => {
                  testData.tempUser = tempUser;

                  cy.login(tempUser.username, tempUser.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                    authRefresh: true,
                  });
                });
              });
            });
          });
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.tempUser.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.folioInstanceTitle);
    });

    it(
      'C345405 Move holdings record with Source = MARC to an instance record with source = FOLIO (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C345405'] },
      () => {
        InventoryInstances.searchByTitle(recordIds[0]);
        InventoryInstances.selectInstanceById(recordIds[0]);
        InventoryInstance.waitLoading();

        InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
          location.name,
          testData.folioInstanceTitle,
        );

        InteractorsTools.checkCalloutContainsMessage('');
        waitForUiToStabilize();
        InventoryInstancesMovement.verifyHoldingsMoved(location.name, '0');

        InventoryInstancesMovement.closeInLeftForm();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkTitle(testData.folioInstanceTitle);

        HoldingsRecordView.viewSource();
        InventoryViewSource.contains(`${testData.tag004}\t${folioInstanceHrid}`);
      },
    );
  });
});
