import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import testTypes from '../../../support/dictionary/testTypes';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import DevTeams from '../../../support/dictionary/devTeams';
import DataImport from '../../../support/fragments/data_import/dataImport';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import { LOCATION_NAMES } from '../../../support/constants';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Holdings', () => {
  let user;
  const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
  const testData = {
    instanceTitle,
  };

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
          testData.locationId = res.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
            },
          ],
          items: [],
        });
      });

    cy.createTempUser([permissions.inventoryAll.gui, permissions.moduleDataImportEnabled.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      },
    );
  });

  afterEach(() => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` }).then(
      (instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      },
    );
    Users.deleteViaApi(user.userId);
  });

  it(
    'C397327 Verify that no error appears after switch from Holdings Edit screen to another app and back (folijet) (TaaS)',
    { tags: [testTypes.extendedPath, DevTeams.folijet] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.instanceTitle);
      InventorySearchAndFilter.selectViewHoldings();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.waitLoading();
      TopMenu.openDataImportApp();
      DataImport.waitLoading();
      TopMenu.openInventoryApp();
      HoldingsRecordEdit.waitLoading();
      HoldingsRecordEdit.verifyNoCalloutErrorMessage();
    },
  );
});
