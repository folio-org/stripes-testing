import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { LOCATION_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory -> Advanced search', () => {
  let user;
  const instanceIds = [];
  const testData = {
    advSearchOption: 'Advanced search',
    instanceTitle1: `C400621 Instance title${getRandomPostfix()}`,
    instanceTitle2: `C400621 Instance title${getRandomPostfix()}`,
    instanceTitle3: `C400621 Instance title${getRandomPostfix()}`,
    instanceTitle4: `C400621 Instance title${getRandomPostfix()}`,
    barcode3: uuid(),
    barcode4: uuid(),
    administrativeNote2: 'Adv search adm note 006',
    administrativeNote4: 'Adm note NOT 6 006',
    holdingsNote: 'Adv search note 006',
    callNumber: `IYCN${getRandomPostfix()}`,
  };

  before('Creating data', () => {
    cy.getAdminToken()
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingsType) => {
          testData.holdingTypeId = holdingsType[0].id;
        });
        cy.getHoldingsNoteTypes({ limit: 1 }).then((holdingsNoteType) => {
          testData.holdingNoteTypeId = holdingsNoteType[0].id;
        });
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((locations) => {
          testData.locationsId = locations.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
      })
      .then(() => {
        // create first instance and holdings
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle1,
          },
          holdings: [
            {
              permanentLocationId: testData.locationsId,
              noteType: testData.holdingNoteTypeId,
              note: testData.holdingsNote,
            },
          ],
          items: [],
        }).then((specialInstanceIds) => {
          instanceIds.push(specialInstanceIds);
        });
        // create second instance and holdings
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle2,
          },
          holdings: [
            {
              permanentLocationId: testData.locationsId,
              noteType: testData.holdingNoteTypeId,
              note: testData.holdingsNote,
              administrativeNote: testData.administrativeNote2,
            },
          ],
          items: [],
        }).then((specialInstanceIds) => {
          instanceIds.push(specialInstanceIds);
        });
        // create third instance and holdings and item
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle3,
          },
          holdings: [
            {
              permanentLocationId: testData.locationsId,
              callNumber: testData.callNumber,
            },
          ],
          items: [
            {
              barcode: testData.barcode3,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        });
        // create forth instance and holdings and item
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle4,
          },
          holdings: [
            {
              permanentLocationId: testData.locationsId,
              callNumber: testData.callNumber,
              administrativeNote: 'Adm note NOT 6 006',
            },
          ],
          items: [
            {
              barcode: testData.barcode4,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        });
      });

    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.userProperties.userId);
      cy.wrap(
        instanceIds.holdingIds.forEach((holdingsId) => {
          cy.deleteHoldingRecordViaApi(holdingsId.id);
        }),
      ).then(() => {
        instanceIds.instanceId.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode3);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode4);
    });
  });

  it(
    'C400621 Search Holdings using advanced search with a combination of operators (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.switchToHoldings();
      InventoryInstances.clickAdvSearchButton();
      InventoryInstances.fillAdvSearchRow(
        0,
        testData.holdingsNote,
        'Exact phrase',
        'Holdings notes (all)',
      );
      InventoryInstances.checkAdvSearchModalValues(
        0,
        testData.holdingsNote,
        'Exact phrase',
        'Holdings notes (all)',
      );
      InventoryInstances.fillAdvSearchRow(
        1,
        testData.administrativeNote2,
        'Contains all',
        'Holdings administrative notes',
        'AND',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.administrativeNote2,
        'Contains all',
        'Holdings administrative notes',
        'AND',
      );
      InventoryInstances.fillAdvSearchRow(
        2,
        testData.callNumber,
        'Exact phrase',
        'Call number, normalized',
        'OR',
      );
      InventoryInstances.checkAdvSearchModalValues(
        2,
        testData.callNumber,
        'Exact phrase',
        'Call number, normalized',
        'OR',
      );
      InventoryInstances.fillAdvSearchRow(
        3,
        testData.administrativeNote4,
        'Starts with',
        'All',
        'NOT',
      );
      InventoryInstances.checkAdvSearchModalValues(
        3,
        testData.administrativeNote4,
        'Starts with',
        'All',
        'NOT',
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
      InventorySearchAndFilter.verifySearchResult([
        testData.instanceTitle2,
        testData.instanceTitle3,
      ]);
      InventorySearchAndFilter.checkRowsCount(2);
    },
  );
});
