import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

let instanceId = null;
let instanceTypeId;
let holdingsTypeId;
let locationId;
let locationName;
let loanTypeId;
let materialTypeId;
const { user, memberTenant } = parseSanityParameters();
const instanceName = `AT_C9287_FolioInstance_${getRandomPostfix()}`;
const itemBarcode = getRandomPostfix();

describe('Data Export', () => {
  describe('Search in Inventory', () => {
    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password)
        .then(() => {
          // Fetch user details
          cy.getUserDetailsByUsername(user.username).then((details) => {
            user.id = details.id;
            user.personal = details.personal;
            user.barcode = details.barcode;
          });

          // Defensive cleanup
          InventoryInstances.deleteInstanceByTitleViaApi(instanceName);

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            holdingsTypeId = holdingTypes[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locationData) => {
            locationId = locationData.id;
            locationName = locationData.name;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            loanTypeId = loanTypes[0].id;
          });
          cy.getDefaultMaterialType().then((materialType) => {
            materialTypeId = materialType.id;
          });
        })
        .then(() => {
          // Create test data
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instanceName,
              languages: ['ukr'],
            },
            holdings: [
              {
                holdingsTypeId,
                permanentLocationId: locationId,
              },
            ],
            items: [
              {
                barcode: itemBarcode,
                status: { name: 'Available' },
                permanentLoanType: { id: loanTypeId },
                materialType: { id: materialTypeId },
              },
            ],
          }).then((createdInstanceData) => {
            instanceId = createdInstanceData.instanceId;
          });
        });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password);
      cy.setTenant(memberTenant.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      FileManager.deleteFileFromDownloadsByMask(
        'QuickInstanceExport*',
        'SearchInstanceUUIDs*',
        'SearchInstanceCQLQuery*',
      );
    });

    it('C9287 Export CQL query (firebird)', { tags: ['dryRun', 'firebird', 'C9287'] }, () => {
      InventorySearchAndFilter.byLanguage('Ukrainian');
      InventorySearchAndFilter.searchByParameter(
        'Keyword (title, contributor, identifier, HRID, UUID)',
        instanceName,
      );
      InventorySearchAndFilter.byEffectiveLocation(locationName);
      cy.wait(3000);
      InventorySearchAndFilter.saveCQLQuery();
      FileManager.verifyFile(
        InventoryActions.verifySaveCQLQueryFileName,
        'SearchInstanceCQLQuery*',
        InventoryActions.verifySaveCQLQuery,
        [locationId, instanceName, 'ukr'],
      );
    });
  });
});
