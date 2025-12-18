import { MultiColumnListCell } from '../../../../interactors';
import {
  APPLICATION_NAMES,
  INSTANCE_SOURCE_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe(
    'Holdings',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let firstUser;
      let secondUser;
      let instanceTitle;
      let recordsData;
      let instanceHRID;

      beforeEach('Create test data and login', () => {
        instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;

        recordsData = {
          instanceTitle,
          permanentLocationOption: 'Online (E) ',
          permanentLocationValue: LOCATION_NAMES.ONLINE_UI,
          source: INSTANCE_SOURCE_NAMES.FOLIO,
        };

        cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
          firstUser = userProperties;
        });

        cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
          secondUser = userProperties;

          cy.login(secondUser.username, secondUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken().then(() => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
            (instance) => {
              cy.wait(5000);
              cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
          Users.deleteViaApi(firstUser.userId);
          Users.deleteViaApi(secondUser.userId);
        });
      });

      it(
        'C1294 Create a Holdings record as another user than the one that created the Instance (folijet)',
        { tags: ['smoke', 'folijet', 'shiftLeft', 'C1294', 'eurekaPhase1'] },
        () => {
          const InventoryNewInstance = InventoryInstances.addNewInventory();
          InventoryNewInstance.fillRequiredValues(recordsData.instanceTitle);
          InventoryNewInstance.clickSaveAndCloseButton();

          cy.wait(2000);
          InventorySearchAndFilter.searchInstanceByTitle(recordsData.instanceTitle);
          cy.expect(MultiColumnListCell({ row: 0, content: recordsData.instanceTitle }).exists());

          // login as a different user
          cy.login(firstUser.username, firstUser.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.searchInstanceByTitle(recordsData.instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHRID = initialInstanceHrId;
          });
          InventoryInstance.createHoldingsRecord(recordsData.permanentLocationOption);

          InventoryInstance.openHoldingView();
          HoldingsRecordView.checkSource(recordsData.source);
          HoldingsRecordView.checkPermanentLocation(recordsData.permanentLocationValue);
        },
      );
    },
  );
});
