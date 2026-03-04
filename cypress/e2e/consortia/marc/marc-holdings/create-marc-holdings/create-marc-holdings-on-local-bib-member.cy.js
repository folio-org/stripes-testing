import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ItemRecordNew from '../../../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../../../support/fragments/inventory/search/browseCallNumber';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../../../support/constants';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';
import Location from '../../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          user: {},
          marcTitle: `AT_C788740_MarcBibInstance_${randomPostfix}`,
          tag035: '035',
          tag852: '852',
          callNumberValue: `AT_C788740_CallNunmber_${randomPostfix}`,
          tag035Value: '788740123123',
        };
        const userPermissions = {
          central: [Permissions.uiInventoryViewInstances.gui],
          college: [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          ],
          university: [
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
          ],
        };

        let createdInstanceId;
        const locations = {};
        const servicePoints = {
          [Affiliations.Consortia]: ServicePoints.getDefaultServicePointWithPickUpLocation(),
          [Affiliations.College]: ServicePoints.getDefaultServicePointWithPickUpLocation(),
          [Affiliations.University]: ServicePoints.getDefaultServicePointWithPickUpLocation(),
        };
        let loanTypeName;
        let materialTypeName;

        before('Create test data', () => {
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
          })
            .then(() => {
              cy.setTenant(Affiliations.College);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C788740');

              cy.getLoanTypes({ limit: 1 }).then((res) => {
                loanTypeName = res[0].name;
              });
              cy.getBookMaterialType().then((res) => {
                materialTypeName = res.name;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser(userPermissions.college).then((userProperties) => {
                testData.user = userProperties;

                ServicePoints.createViaApi(servicePoints[Affiliations.College]);
                locations[Affiliations.College] = Location.getDefaultLocation(
                  servicePoints[Affiliations.College].id,
                );
                Locations.createViaApi(locations[Affiliations.College]);

                cy.resetTenant();
                cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions.central);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                ServicePoints.createViaApi(servicePoints[Affiliations.Consortia]);
                locations[Affiliations.Consortia] = Location.getDefaultLocation(
                  servicePoints[Affiliations.Consortia].id,
                );
                Locations.createViaApi(locations[Affiliations.Consortia]);

                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(
                  testData.user.userId,
                  userPermissions.university,
                );
                ServicePoints.createViaApi(servicePoints[Affiliations.University]);
                locations[Affiliations.University] = Location.getDefaultLocation(
                  servicePoints[Affiliations.University].id,
                );
                Locations.createViaApi(locations[Affiliations.University]);
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createSimpleMarcBibViaAPI(testData.marcTitle).then((instanceId) => {
                createdInstanceId = instanceId;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C788740');
          Users.deleteViaApi(testData.user.userId);
          [Affiliations.University, Affiliations.College, Affiliations.Consortia].forEach(
            (tenant) => {
              cy.withinTenant(tenant, () => {
                ServicePoints.deleteViaApi(servicePoints[tenant].id);
                Locations.deleteViaApi(locations[tenant]);
              });
            },
          );
        });

        it(
          'C788740 Create MARC holdings record on Local MARC bib from Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C788740'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.goToMarcHoldingRecordAdding();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.toggleHoldingsLocationModal();
            QuickMarcEditor.verifyInstitutionFoundInHoldingsLocationModal(
              locations[Affiliations.College].institutionName,
            );
            QuickMarcEditor.verifyInstitutionFoundInHoldingsLocationModal(
              locations[Affiliations.Consortia].institutionName,
              false,
            );
            QuickMarcEditor.verifyInstitutionFoundInHoldingsLocationModal(
              locations[Affiliations.University].institutionName,
              false,
            );
            QuickMarcEditor.toggleHoldingsLocationModal(false);

            QuickMarcEditor.updateExistingField(
              testData.tag852,
              `$b ${locations[Affiliations.College].code} $h ${testData.callNumberValue}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag852,
              `$b ${locations[Affiliations.College].code} $h ${testData.callNumberValue}`,
            );

            QuickMarcEditor.addEmptyFields(4);
            QuickMarcEditor.checkEmptyFieldAdded(5);
            QuickMarcEditor.addValuesToExistingField(
              4,
              testData.tag035,
              `$a ${testData.tag035Value}`,
            );
            QuickMarcEditor.checkContentByTag(testData.tag035, `$a ${testData.tag035Value}`);

            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveHoldings();
            HoldingsRecordView.checkCallNumber(testData.callNumberValue);
            HoldingsRecordView.checkPermanentLocation(locations[Affiliations.College].name);
            HoldingsRecordView.checkFormerHoldingsId(testData.tag035Value);

            HoldingsRecordView.close();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.addItem();
            ItemRecordNew.fillItemRecordFields({
              materialType: materialTypeName,
              loanType: loanTypeName,
            });
            ItemRecordNew.saveAndClose();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.checkBrowseOptionSelected(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberValue);
            InventorySearchAndFilter.browseSearch(testData.callNumberValue);
            BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberValue);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            InventoryInstances.waitContentLoading();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.checkBrowseOptionSelected(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.browseSearch(testData.callNumberValue);
            BrowseCallNumber.checkNonExactSearchResult(testData.callNumberValue);
          },
        );
      });
    });
  });
});
