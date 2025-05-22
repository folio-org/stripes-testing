import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import GenerateIdentifierCode from '../../../support/utils/generateIdentifierCode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
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
        },
      ],
    };

    let partialInstanceHrid;
    let fullInstanceHrid;

    before('Creating data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('C422016');
          InventoryInstances.deleteInstanceByTitleViaApi('Adv search title 002');
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
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
          }).then((specialInstanceIds) => {
            testData.instances[1].testInstanceIds = specialInstanceIds;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instances[0].testInstanceIds.instanceId);
        InventoryInstance.deleteInstanceViaApi(testData.instances[1].testInstanceIds.instanceId);
      });
    });

    it(
      'C422016 Search Instances using advanced search with "OR", "NOT" operators (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C422016', 'eurekaPhase1'] },
      () => {
        cy.then(() => {
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${testData.instances[0].testInstanceIds.instanceId}"`,
          }).then((instance0) => {
            partialInstanceHrid = instance0.hrid.replace(/[^\d]/g, '');
            cy.getInstance({
              limit: 1,
              expandAll: true,
              query: `"id"=="${testData.instances[1].testInstanceIds.instanceId}"`,
            }).then((instance1) => {
              fullInstanceHrid = instance1.hrid;
            });
          });
        }).then(() => {
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
            partialInstanceHrid,
            'Contains any',
            'Instance HRID',
            'OR',
          );
          InventoryInstances.checkAdvSearchModalValues(
            1,
            partialInstanceHrid,
            'Contains any',
            'Instance HRID',
            'OR',
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          InventoryInstances.checkAdvSearchModalAbsence();
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
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
            partialInstanceHrid,
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
              'Keyword (title, contributor)',
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
            fullInstanceHrid,
            'Contains all',
            'Instance HRID',
            'NOT',
          );
          InventoryInstances.checkAdvSearchModalValues(
            1,
            fullInstanceHrid,
            'Contains all',
            'Instance HRID',
            'NOT',
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          InventoryInstances.checkAdvSearchModalAbsence();
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
          InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
          InventorySearchAndFilter.verifySearchResult(testData.instances[0].title);
          InventorySearchAndFilter.checkRowsCount(1);
        });
      },
    );
  });
});
