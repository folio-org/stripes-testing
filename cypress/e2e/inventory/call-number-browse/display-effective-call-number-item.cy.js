import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../support/constants';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

describe('Inventory', () => {
  describe('Effective Call Number', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `C9230.${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const instanceTitle = `AT_C9230_FolioInstance_${randomPostfix}`;
    const barcodeText = 'No barcode';
    const testData = {
      user: {},
    };
    const callNumberData = {
      callNumberPrefix: `Prefix${randomDigits}`,
      callNumber: `${randomDigits}K2 .M44`,
      callNumberSuffix: 'suff',
      copyNumber: 'c.1',
      volume: 'v.1',
      enumeration: 'v.72:no.6-7,10-12',
      chronology: '1986:July-Aug.,Oct.-Dec.',
    };

    const expectedEffectiveCallNumber = `${callNumberData.callNumberPrefix} ${callNumberData.callNumber} ${callNumberData.callNumberSuffix} ${callNumberData.volume} ${callNumberData.enumeration} ${callNumberData.chronology} ${callNumberData.copyNumber}`;

    before('Create data and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C9230_FolioInstance');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          testData.locationId = res.id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeId = res.id;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
              callNumber: callNumberData.callNumber,
              callNumberPrefix: callNumberData.callNumberPrefix,
              callNumberSuffix: callNumberData.callNumberSuffix,
            },
          ],
        }).then((instanceIds) => {
          testData.instanceId = instanceIds.instanceId;
          ItemRecordNew.createViaApi({
            holdingsId: instanceIds.holdingIds[0].id,
            materialTypeId: testData.materialTypeId,
            permanentLoanTypeId: testData.loanTypeId,
            volume: callNumberData.volume,
            enumeration: callNumberData.enumeration,
            chronology: callNumberData.chronology,
            copyNumber: callNumberData.copyNumber,
          });

          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
            testData.user = userProps;
          });
        });
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
    });

    it(
      'C9230 Display effective call number string on item record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C9230'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });

        // Navigate to the instance
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();

        // Step 1: Expand Holdings accordion
        InventoryInstance.openHoldings('');

        // Step 2: Click on the Item to open detail view
        InventoryInstance.openItemByBarcode(barcodeText);
        ItemRecordView.waitLoading();

        // Step 3: Verify the effective call number field
        ItemRecordView.verifyEffectiveCallNumber(expectedEffectiveCallNumber);
      },
    );
  });
});
