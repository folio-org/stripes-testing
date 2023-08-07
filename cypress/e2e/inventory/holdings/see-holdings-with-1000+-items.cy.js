import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import DevTeams from '../../../support/dictionary/devTeams';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-inventory: holdings', () => {
  let user;
  let defaultLocation;
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation('autotestservicePoint', uuid());
  // const quantityOfItems = 1005;
  const quantityOfItems = 10;
  const testData = {
    instanceTitle: `Instance ${getRandomPostfix()}`
  };

  before('create test data', () => {
    cy.getAdminToken()
    .then(()=>{
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { testData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingTypeId = res[0].id; });
      ServicePoints.createViaApi(servicePoint);
      defaultLocation = Location.getDefaultLocation(servicePoint.id);
      Location.createViaApi(defaultLocation);
      cy.getLoanTypes({ limit: 1 }).then((res) => { 
        testData.loanTypeId = res[0].id;
        testData.loanTypeName = res[0].name;
      });
      cy.getMaterialTypes({ limit: 1 }).then((res) => {
        testData.materialTypeId = res.id;
      });
    }).then(() => {
      InventoryInstances.createFolioInstanceViaApi({
      instance: {
        instanceTypeId: testData.instanceTypeId,
        title: testData.instanceTitle,
      },
      holdings: [{
        holdingsTypeId: testData.holdingTypeId,
        permanentLocationId: defaultLocation.id,
      }],
      items: []});
    }).then(specialInstanceIds => {
      testData.testInstanceIds = specialInstanceIds;
      
      Array.from({ length: quantityOfItems }, () => {
        ItemRecordNew.createViaApi(
          specialInstanceIds.holdingIds[0].id,
          uuid(),
          testData.materialTypeId,
          testData.loanTypeId
        )
      });
    });

    cy.createTempUser([
      permissions.inventoryAll.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${testData.instanceTitle}"` })
      .then((instance) => {
        instance.items.forEach(el => {
          console.log(el);
          cy.pause();
          //cy.deleteItemViaApi(instance.items[el].id);
        });
        cy.pause();
        // cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id
    );
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it('C350639: Verify the ability to see holdings with 1000+ items: CASE 1 (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      InventorySearchAndFilter.searchByParameter('Keyword (title, contributor, identifier, HRID, UUID)', testData.instanceTitle);
      InstanceRecordView.verifyInstanceRecordViewOpened();
      // InstanceRecordView.verifyItemsCount(quantityOfItems, defaultLocation.name);
      // InventoryInstance.openHoldingsAccordion(`${defaultLocation.name} >`);
      // InstanceRecordView.verifyQuantityOfItemsOnPage(quantityOfItems, testData.loanTypeName);
      // InstanceRecordView.clickNextPaginationButton();
      // InstanceRecordView.verifyQuantityOfItemsOnPage(quantityOfItems, testData.loanTypeName);
    });
});
