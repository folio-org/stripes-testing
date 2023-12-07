import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import GenerateIdentifierCode from '../../../support/utils/generateIdentifierCode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory -> Advanced search', () => {
  const randomInstanceIdentifier = `${GenerateIdentifierCode.getRandomIdentifierCode()}123456987`;
  const testData = {
    defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
    advSearchOption: 'Advanced search',
    instances: [
      {
        title: `C422016 Clarinet concerto no. 1, op. 73 ${getRandomPostfix()}`,
        identifier: randomInstanceIdentifier,
      },
      {
        title: `Roma council. Adv search title 002 ${getRandomPostfix()}`,
        identifier: randomInstanceIdentifier,
        holdingsCallNumber: `YCN${getRandomPostfix()}`,
        itemBarcode: uuid(),
      },
    ],
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
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((locations) => {
          testData.locationsId = locations.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name="OCLC"' }).then((identifier) => {
          testData.identifierTypeId = identifier.id;
        });
      })
      .then(() => {
        // create the first instance
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instances[0].title,
            identifiers: [
              {
                identifierTypeId: testData.identifierTypeId,
                value: testData.instances[0].identifier,
              },
            ],
          },
          holdings: [],
          items: [],
        }).then((specialInstanceIds) => {
          testData.instances[0].testInstanceIds = specialInstanceIds;
        });
        // create the second instance
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instances[1].title,
            identifiers: [
              {
                identifierTypeId: testData.identifierTypeId,
                value: testData.instances[1].identifier,
              },
            ],
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationsId,
              callNumber: testData.instances[1].holdingsCallNumber,
            },
          ],
          items: [
            {
              barcode: testData.instances[1].itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          testData.instances[1].testInstanceIds = specialInstanceIds;
        });
      });

    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.instances[1].itemBarcode,
      );
      InventoryInstance.deleteInstanceViaApi(testData.instances[0].testInstanceIds.instanceId);
    });
  });

  it(
    'C422016 Search Instances using advanced search with "OR", "NOT" operators (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"id"=="${testData.instances[0].testInstanceIds.instanceId}"`,
      }).then((instance) => {
        const instanceHrid = instance.hrid.replace(/[^\d]/g, '');

        InventorySearchAndFilter.switchToInstance();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          'Roma council. Adv search',
          'Starts with',
          'Title (all)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          'Roma council. Adv search',
          'Starts with',
          'Title (all)',
        );
        InventoryInstances.fillAdvSearchRow(1, instanceHrid, 'Contains any', 'Instance HRID', 'OR');
        InventoryInstances.checkAdvSearchModalValues(
          1,
          instanceHrid,
          'Contains any',
          'Instance HRID',
          'OR',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        InventorySearchAndFilter.verifySearchResult(testData.instances[0].title);
        InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);
        InventorySearchAndFilter.checkRowsCount(2);

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkAdvSearchModalValues(
          0,
          'Roma council. Adv search',
          'Starts with',
          'Title (all)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          instanceHrid,
          'Contains any',
          'Instance HRID',
          'OR',
        );
        InventoryInstances.closeAdvancedSearchModal();
        InventoryInstances.resetAllFilters();
        InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
      });

      InventoryInstances.clickAdvSearchButton();
      cy.wrap([1, 2, 3, 4]).each((rowNumber) => {
        InventoryInstances.checkAdvSearchModalValues(
          rowNumber,
          '',
          'Contains all',
          'Keyword (title, contributor, identifier, HRID, UUID)',
          'AND',
        );
      });
      InventoryInstances.fillAdvSearchRow(
        0,
        testData.instances[0].identifier,
        'Exact phrase',
        'Identifier (all)',
      );
      InventoryInstances.checkAdvSearchModalValues(
        0,
        testData.instances[0].identifier,
        'Exact phrase',
        'Identifier (all)',
      );
      InventoryInstances.fillAdvSearchRow(
        1,
        testData.instances[1].holdingsCallNumber,
        'Contains all',
        'Effective call number (item), shelving order',
        'NOT',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.instances[1].holdingsCallNumber,
        'Contains all',
        'Effective call number (item), shelving order',
        'NOT',
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
      InventorySearchAndFilter.verifySearchResult(testData.instances[0].title);
      InventorySearchAndFilter.checkRowsCount(1);
    },
  );
});
