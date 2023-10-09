import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import UserEdit from '../../../support/fragments/users/userEdit';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';

describe('Tags', () => {
  let userData;
  const patronGroup = {
    name: getTestEntityValue('groupTags'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    itemBarcode: generateItemBarcode(),
  };
  const instanceData = {
    title: getTestEntityValue('InstanceTags'),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
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
          instanceData.instanceId = specialInstanceIds.instanceId;
          instanceData.holdingId = specialInstanceIds.holdingIds[0].id;
          instanceData.itemId = specialInstanceIds.holdingIds[0].itemIds[0];
        });
      })
      .then(() => {
        PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;
        });
        cy.createTempUser(
          [permissions.uiTagsPermissionAll.gui, permissions.inventoryAll.gui],
          patronGroup.name,
        ).then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );
        });
      });
  });

  beforeEach('Login', () => {
    cy.login(userData.username, userData.password);
    cy.visit(TopMenu.inventoryPath);
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C196770 Assign tags to a Holdings record (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.byKeywords(instanceData.title);
      InventoryInstance.openHoldingView();
      HoldingsRecordEdit.openTags();
      HoldingsRecordEdit.addTag(tagName);

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.filterByTag(tagName);
      InventoryInstance.openHoldingView();
      HoldingsRecordEdit.openTags();
      JobProfileView.removeTag(tagName);

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.resetAll();
      InventorySearchAndFilter.verifyTagIsAbsent(tagName);
    },
  );

  it(
    'C367961 Verify that user can add more than 1 tag to "Holdings" record with source "Folio" (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      const tags = Array(5)
        .fill('')
        .map((_, index) => `tag${index + 1}${getRandomStringCode(5)}`.toLowerCase());
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.byKeywords(instanceData.title);
      InventoryInstance.openHoldingView();
      HoldingsRecordEdit.openTags();
      cy.wrap(tags).each((tag) => {
        cy.wait(2000);
        HoldingsRecordEdit.addTag(tag);
      });

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToHoldings();
      InventoryInstance.openHoldingView();
      HoldingsRecordEdit.openTags();
      cy.wrap(tags).each((tag) => {
        cy.wait(2000);
        JobProfileView.removeTag(tag);
      });
    },
  );

  it(
    'C196771 Assign tags to an Item record (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', testData.itemBarcode);
      HoldingsRecordEdit.openTags();
      HoldingsRecordEdit.addTag(tagName);

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.filterByTag(tagName);
      InventoryInstance.openHoldings(['']);
      InventoryInstance.openItemByBarcode(testData.itemBarcode);
      HoldingsRecordEdit.openTags();
      JobProfileView.removeTag(tagName);

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.resetAll();
      InventorySearchAndFilter.verifyTagIsAbsent(tagName);
    },
  );
});
