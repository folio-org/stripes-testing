import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import permissions from '../../../support/dictionary/permissions';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import DevTeams from '../../../support/dictionary/devTeams';
import { INSTANCE_SOURCE_NAMES, LOCATION_NAMES } from '../../../support/constants';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';


describe('ui-inventory: holdings', () => {
  let user;
  let defaultLocation;
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation('autotest basic checkin', uuid());
  const numberOfItems = 1001;
  const testData = {
    instanceTitle: `Instance ${getRandomPostfix()}`,
  };

  before(() => {
    cy.getAdminToken()
    .then(()=>{
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { testData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingTypeId = res[0].id; });
      ServicePoints.createViaApi(servicePoint);
      defaultLocation = Location.getDefaultLocation(servicePoint.id);
      console.log(defaultLocation);
      cy.pause();
      Location.createViaApi(defaultLocation);
      cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanTypeId = res[0].id; });
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

      Array.from({ length: numberOfItems }, () => {
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

  it('C350639: Verify the ability to see holdings with 1000+ items: CASE 1 (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      InventorySearchAndFilter.searchByParameter('Keyword (title, contributor, identifier, HRID, UUID)', testData.instanceTitle);
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.getAssignedHRID().then(initialInstanceHrId => { testData.instanceHrid = initialInstanceHrId; });
      InstanceRecordView.verifyItemsCount(numberOfItems);

    });
});
