import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue, getRandomLetters } from '../../../support/utils/stringTools';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const numberOfInventory = 26;
    const numberOfPrecedingResults = 5;
    const precedingCallNumberPrefix = 'aaacallnumberC380478';
    const callNumberPrefix = `YAUTO${getRandomLetters(7).toUpperCase()}C380478`;
    const callNumbers = Array.from(
      { length: numberOfInventory },
      (_, i) => `${callNumberPrefix}_${String(i).padStart(2, '0')}`,
    );
    const instanceTitle = getTestEntityValue('C380478_FolioInstance');
    const precedingCallNumbers = Array.from(
      { length: numberOfPrecedingResults },
      (_, i) => `${precedingCallNumberPrefix}_${i}`,
    );

    let instanceTypeId;
    let location;
    let holdingsTypeId;
    let loanTypeId;
    let materialTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C380478');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            location = res;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
            holdingsTypeId = holdingTypes[0].id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
            materialTypeId = matType.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: `${instanceTitle}_Preceding`,
            },
            holdings: precedingCallNumbers.map((callNumber) => ({
              holdingsTypeId,
              permanentLocationId: location.id,
              callNumber,
            })),
          }).then((createdInstanceData) => {
            precedingCallNumbers.forEach((_, i) => {
              ItemRecordNew.createViaApi({
                holdingsId: createdInstanceData.holdingIds[i].id,
                materialTypeId,
                permanentLoanTypeId: loanTypeId,
              });
            });
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instanceTitle,
            },
            holdings: callNumbers.map((callNumber) => ({
              holdingsTypeId,
              permanentLocationId: location.id,
              callNumber,
            })),
          }).then((createdInstanceData) => {
            callNumbers.forEach((_, i) => {
              ItemRecordNew.createViaApi({
                holdingsId: createdInstanceData.holdingIds[i].id,
                materialTypeId,
                permanentLoanTypeId: loanTypeId,
              });
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380478 Verify that "Browse call numbers" result list correctly displays preceding results before the one being searched (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C380478', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.selectBrowseCallNumbers();
        cy.getToken(user.username, user.password);
        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumber);
        });
        InventorySearchAndFilter.browseSearch(callNumbers[0]);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0]);
        BrowseSubjects.checkResultAndItsRow(5, callNumbers[0]);
        BrowseCallNumber.resultRowsIsInRequiredOder(callNumbers);
      },
    );
  });
});
