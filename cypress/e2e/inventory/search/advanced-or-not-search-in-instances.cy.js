import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import GenerateIdentifierCode from '../../../support/utils/generateIdentifierCode';
import { LOCATION_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory -> Advanced search', () => {
  let user;
  const testData = {
    defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
    advSearchOption: 'Advanced search',
    instanceTitle: `C422016 Clarinet concerto no. 1, op. 73_${getRandomPostfix()}`,
    holdingsTitle: 'Roma council. Adv search title 002',
    callNumber: `YCN${getRandomPostfix()}`,
    itemBarcode: uuid(),
    identifierValue: GenerateIdentifierCode.getRandomIdentifierCode(),
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
        cy.getIdentifierTypes({ query: 'name="OCLC"' }).then((identifier) => {
          testData.identifierTypeId = identifier.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
            identifiers: [
              {
                identifierTypeId: testData.identifierTypeId,
                value: testData,
              },
            ],
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationsId,
              callNumber: testData.callNumber,
              shelvingTitle: testData.holdingsTitle,
            },
          ],
          items: [
            {
              barcode: testData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          testData.testInstanceIds = specialInstanceIds;
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${specialInstanceIds}"`,
          }).then((instance) => {
            testData.instanceHRID = instance.hrid;
            testData.instanceHridForSearching = instance.hrid.replace(/[^\d]/g, '');
          });
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
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    });
  });

  it(
    'C422016 Search Instances using advanced search with "OR", "NOT" operators (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
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
      InventoryInstances.fillAdvSearchRow(
        1,
        testData.instanceHridForSearching,
        'Contains any',
        'Instance HRID',
        'OR',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.instanceHridForSearching,
        'Contains any',
        'Instance HRID',
        'OR',
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
      InventorySearchAndFilter.verifySearchResult([testData.instanceTitle, testData.holdingsTitle]);

      InventoryInstances.clickAdvSearchButton();
      InventoryInstances.checkAdvSearchModalValues(
        0,
        'Roma council. Adv search',
        'Starts with',
        'Title (all)',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.instanceHridForSearching,
        'Contains any',
        'Instance HRID',
        'OR',
      );
      InventoryInstances.closeAdvancedSearchModal();
      InventoryInstances.resetAllFilters();
      InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
      InventorySearchAndFilter.verifySearchFieldIsEmpty();

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
        `(OCoLC)${testData.identifierValue}`,
        'Exact phrase',
        'Identifier (all)',
      );
      InventoryInstances.checkAdvSearchModalValues(
        0,
        `(OCoLC)${testData.identifierValue}`,
        'Exact phrase',
        'Identifier (all)',
      );
      InventoryInstances.fillAdvSearchRow(
        1,
        testData.callNumber,
        'Contains all',
        'Effective call number (item), shelving order',
        'NOT',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.callNumber,
        'Contains all',
        'Effective call number (item), shelving order',
        'NOT',
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
      InventorySearchAndFilter.verifySearchResult([testData.instanceTitle]);
    },
  );
});
