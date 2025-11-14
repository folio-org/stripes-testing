import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { HOLDINGS_SOURCE_NAMES } from '../../../support/constants';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('Permissions', () => {
  describe('Permissions --> Inventory', () => {
    const testData = {
      marcBibTitle: `AT_C350966_MarcBibInstance_${getRandomPostfix()}`,
      actions: [
        { optionName: 'Edit', shouldExist: true },
        { optionName: 'Duplicate', shouldExist: true },
        { optionName: 'View source', shouldExist: true },
        { optionName: 'Delete', shouldExist: true },
        { optionName: 'Edit in quickMARC', shouldExist: false },
      ],
    };

    let recordId;
    let locationCode;

    before('Creating user, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.getLocations({
          limit: 1,
          query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          locationCode = location.code;
          cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
            recordId = instanceId;
            cy.getInstanceById(instanceId).then((instanceData) => {
              recordId = instanceData.id;
              cy.createSimpleMarcHoldingsViaAPI(instanceData.id, instanceData.hrid, location.code);
            });
          });
        });
      }).then(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.inventoryCRUDHoldings.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
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

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.tempUser.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
    });

    it(
      'C350966 quickMARC: View MARC holdings record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350966'] },
      () => {
        InventoryInstances.searchByTitle(recordId);
        InventoryInstances.selectInstanceById(recordId);
        InventoryInstance.waitInventoryLoading();

        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource(HOLDINGS_SOURCE_NAMES.MARC);
        HoldingsRecordView.validateOptionInActionsMenu(testData.actions);

        HoldingsRecordView.viewSource();
        InventoryViewSource.contains(`\t$b ${locationCode}`);
      },
    );
  });
});
