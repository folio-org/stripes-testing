import uuid from 'uuid';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import HoldingsTypes from '../../../support/fragments/settings/inventory/holdings/holdingsTypes';
import { parseSanityParameters } from '../../../support/utils/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const { user, memberTenant } = parseSanityParameters();

    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(5);
    const resourceTypeBody = {
      code: `C347902type${randomLetters}`,
      id: uuid(),
      name: `AT_C347902_type ${randomPostfix}`,
      source: 'local',
    };
    const existingCallNumber = `AT_C347902_CN_${randomPostfix}`;
    const instance = {
      title: `AT_C347902_FolioInstance_${randomPostfix}`,
    };

    before('navigate to inventory', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();

      cy.then(() => {
        cy.createInstanceType(resourceTypeBody).then((type) => {
          instance.instanceTypeId = type.id;
        });
        HoldingsTypes.createViaApi({
          name: `AT_C347902_HoldingsType ${randomPostfix}`,
          source: 'local',
        }).then((response) => {
          instance.holdingTypeId = response.body.id;
        });
        cy.createLoanType({
          name: `type_C347902_${getRandomPostfix()}`,
        }).then((loanType) => {
          instance.loanTypeId = loanType.id;
        });
        MaterialTypes.createMaterialTypeViaApi({
          name: `AT_C347902_MaterialType ${randomPostfix}`,
        }).then(({ body }) => {
          instance.materialTypeId = body.id;
        });
        instance.servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
        ServicePoints.createViaApi(instance.servicePoint);
        instance.defaultLocation = Location.getDefaultLocation(instance.servicePoint.id);
        Location.createViaApi(instance.defaultLocation);
      })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instance.instanceTypeId,
              title: instance.title,
            },
            holdings: [
              {
                holdingsTypeId: instance.holdingTypeId,
                permanentLocationId: instance.defaultLocation.id,
              },
            ],
          }).then((instanceIds) => {
            instance.id = instanceIds.instanceId;
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[0].id,
              materialTypeId: instance.materialTypeId,
              permanentLoanTypeId: instance.loanTypeId,
              itemLevelCallNumber: existingCallNumber,
            });
          });
        })
        .then(() => {
          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          cy.allure().logCommandSteps();
        });
    });

    after('Delete data', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();

      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      cy.wait(1000);

      Location.deleteInstitutionCampusLibraryLocationViaApi(
        instance.defaultLocation.institutionId,
        instance.defaultLocation.campusId,
        instance.defaultLocation.libraryId,
        instance.defaultLocation.id,
      );
      ServicePoints.deleteViaApi(instance.servicePoint.id);
      HoldingsTypes.deleteViaApi(instance.holdingTypeId);
      cy.deleteLoanType(instance.loanTypeId);
      MaterialTypes.deleteViaApi(instance.materialTypeId);
      cy.deleteInstanceType(instance.instanceTypeId, true);
    });

    it(
      'C347902 Verify Browse call numbers form (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C347902'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.verifyActionButtonNotExistsInBrowseMode();
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventorySearchAndFilter.verifyResetAllButtonDisabled();
        InventorySearchAndFilter.verifySearchButtonDisabled();

        InventorySearchAndFilter.verifyBrowseOptions();

        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.showsOnlyEffectiveLocation();
        BrowseCallNumber.waitForCallNumberToAppear(existingCallNumber);
        InventorySearchAndFilter.fillInBrowseSearch(existingCallNumber);
        InventorySearchAndFilter.verifySearchButtonDisabled(false);
        InventorySearchAndFilter.verifyResetAllButtonDisabled(false);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: existingCallNumber }],
        });
        InventorySearchAndFilter.validateSearchTableHeaders();
      },
    );
  });
});
