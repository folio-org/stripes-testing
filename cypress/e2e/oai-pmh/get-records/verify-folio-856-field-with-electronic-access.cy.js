import {
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  LOCATION_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const testData = {
  folioInstance: {
    title: `AT_C388514_FolioInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  createdRelationships: [],
  instanceElectronicAccess: [
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.COMPONENT_PART_OF_RESOURCE,
      uri: 'http://instance-component-part-of-resource.com',
      expectedInd1: '4',
      expectedInd2: '3',
    },
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_COMPONENT_PART_OF_RESOURCE,
      uri: 'http://instance-version-of-component-part-of-resource.com',
      expectedInd1: '4',
      expectedInd2: '4',
    },
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
      uri: 'http://instance-resource.com',
      expectedInd1: '4',
      expectedInd2: '0',
    },
  ],
  holdingsElectronicAccess: [
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.COMPONENT_PART_OF_RESOURCE,
      uri: 'http://holdings-component-part-of-resource.com',
      expectedInd1: '4',
      expectedInd2: '3',
    },
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_COMPONENT_PART_OF_RESOURCE,
      uri: 'http://holdings-version-of-component-part-of-resource.com',
      expectedInd1: '4',
      expectedInd2: '4',
    },
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
      uri: 'http://holdings-version-of-resource.com',
      expectedInd1: '4',
      expectedInd2: '1',
    },
  ],
  itemElectronicAccess: [
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.COMPONENT_PART_OF_RESOURCE,
      uri: 'http://item-component-part-of-resource.com',
      expectedInd1: '4',
      expectedInd2: '3',
    },
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_COMPONENT_PART_OF_RESOURCE,
      uri: 'http://item-version-of-component-part-of-resource.com',
      expectedInd1: '4',
      expectedInd2: '4',
    },
    {
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
      uri: 'http://item-related-resource.com',
      expectedInd1: '4',
      expectedInd2: '2',
    },
  ],
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      // Get all existing URL relationships and create missing ones
      UrlRelationship.getViaApi().then((relationships) => {
        const relationshipMap = {};
        relationships.forEach((rel) => {
          relationshipMap[rel.name] = rel.id;
        });

        // List of all unique relationship names needed for the test
        const allElectronicAccess = [
          ...testData.instanceElectronicAccess,
          ...testData.holdingsElectronicAccess,
          ...testData.itemElectronicAccess,
        ];

        const uniqueRelationshipNames = [
          ...new Set(allElectronicAccess.map((ea) => ea.relationshipName)),
        ];

        // Create missing relationships
        uniqueRelationshipNames.forEach((name) => {
          if (!relationshipMap[name]) {
            const newRelationship = {
              name,
              source: 'local',
            };
            UrlRelationship.createViaApi(newRelationship).then((response) => {
              testData.createdRelationships.push(response);
            });
          }
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      if (testData.folioInstance.uuid) {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.folioInstance.uuid);
      }
      testData.createdRelationships.forEach((relationship) => {
        UrlRelationship.deleteViaApi(relationship.id);
      });
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C388514 GetRecord: Inventory - Verify populated "856" field for FOLIO during harvesting (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C388514', 'nonParallel'] },
      () => {
        // Step 1: Click "Actions" menu button in "Inventory" pane => click "New"
        InventoryInstances.addNewInventory();

        // Step 2: Fill in mandatory fields
        InventoryNewInstance.fillRequiredValues(testData.folioInstance.title);

        // Step 3-5: Add Instance electronic access (3 types)
        testData.instanceElectronicAccess.forEach((ea, index) => {
          InventoryNewInstance.addElectronicAccess({
            relationshipName: ea.relationshipName,
            uri: ea.uri,
            index,
          });
        });

        // Step 6: Click "Save & close" button
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();

        // Step 7: Copy to the clipboard Instance UUID from the address bar
        cy.getAdminToken();
        InventoryInstance.getAssignedHRID().then((hrid) => {
          InventoryInstances.getInstanceIdApi({ query: `hrid=="${hrid}"` }).then((instanceId) => {
            testData.folioInstance.uuid = instanceId;
          });
        });

        // Step 8-9: Send OAI-PMH GetRecord request with marc21 prefix and verify Instance electronic access
        cy.then(() => {
          OaiPmh.getRecordRequest(testData.folioInstance.uuid, 'marc21').then((response) => {
            // Verify 856 fields for Instance electronic access
            testData.instanceElectronicAccess.forEach((ea) => {
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: ea.expectedInd1, ind2: ea.expectedInd2 },
                { u: ea.uri },
              );
            });
            OaiPmh.verifyOaiPmhRecordHeader(response, testData.folioInstance.uuid, false, true);
          });

          // Step 10: Click on "Actions" menu button => Select "Add holdings" option
          cy.getUserToken(user.username, user.password);
          InventoryInstance.pressAddHoldingsButton();
          HoldingsRecordEdit.waitLoading();

          // Step 11: Select any Permanent location
          HoldingsRecordEdit.changePermanentLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);

          // Step 12-14: Add Holdings electronic access (3 types)
          testData.holdingsElectronicAccess.forEach((ea, index) => {
            HoldingsRecordEdit.addElectronicAccessFields({
              relationshipName: ea.relationshipName,
              uri: ea.uri,
              index,
            });
          });

          // Step 15: Click "Save & close" button
          HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
          InventoryInstance.waitLoading();
          InventoryInstance.checkIsHoldingsCreated();

          // Step 16-17: Send OAI-PMH GetRecord request with marc21_withholdings and verify Holdings electronic access
          cy.getAdminToken();
          OaiPmh.getRecordRequest(testData.folioInstance.uuid, 'marc21_withholdings').then(
            (response) => {
              // Verify 856 fields with ind2="3" (Instance + Holdings: 2 fields)
              OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '3' },
                [
                  { u: 'http://instance-component-part-of-resource.com' },
                  { u: 'http://holdings-component-part-of-resource.com' },
                ],
                2,
              );

              // Verify 856 fields with ind2="4" (Instance + Holdings: 2 fields)
              OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '4' },
                [
                  { u: 'http://instance-version-of-component-part-of-resource.com' },
                  { u: 'http://holdings-version-of-component-part-of-resource.com' },
                ],
                2,
              );

              // Verify 856 field with ind2="0" (Instance only: 1 field)
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '0' },
                { u: 'http://instance-resource.com' },
              );

              // Verify 856 field with ind2="1" (Holdings only: 1 field)
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '1' },
                { u: 'http://holdings-version-of-resource.com' },
              );
            },
          );

          // Step 18: From the Browser: Click "Add item" button
          cy.getUserToken(user.username, user.password);
          InventoryInstance.addItem();

          // Step 19: Populate mandatory fields ("Material type*", "Permanent loan type*")
          ItemRecordNew.fillItemRecordFields({
            materialType: MATERIAL_TYPE_NAMES.BOOK,
            loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          });

          // Step 20-22: Add Item electronic access (3 types)
          testData.itemElectronicAccess.forEach((ea, index) => {
            ItemRecordNew.addElectronicAccessFields({
              relationshipType: ea.relationshipName,
              uri: ea.uri,
              rowNumber: index + 1,
            });
          });

          // Step 23: Click the "Save & close" button
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.waitLoading();

          // Step 24-25: Send final GetRecord request and verify all electronic access (Instance + Holdings + Item)
          cy.getAdminToken();
          OaiPmh.getRecordRequest(testData.folioInstance.uuid, 'marc21_withholdings').then(
            (response) => {
              // Verify 856 fields with ind2="3" (Instance + Holdings + Item: 3 fields)
              OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '3' },
                [
                  { u: 'http://instance-component-part-of-resource.com' },
                  { u: 'http://item-component-part-of-resource.com' },
                  { u: 'http://holdings-component-part-of-resource.com' },
                ],
                3,
              );

              // Verify 856 fields with ind2="4" (Instance + Holdings + Item: 3 fields)
              OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '4' },
                [
                  { u: 'http://instance-version-of-component-part-of-resource.com' },
                  { u: 'http://item-version-of-component-part-of-resource.com' },
                  { u: 'http://holdings-version-of-component-part-of-resource.com' },
                ],
                3,
              );

              // Verify 856 field with ind2="0" (Instance only: 1 field)
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '0' },
                { u: 'http://instance-resource.com' },
              );

              // Verify 856 field with ind2="1" (Holdings only: 1 field)
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '1' },
                { u: 'http://holdings-version-of-resource.com' },
              );

              // Verify 856 field with ind2="2" (Item only: 1 field)
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '856',
                { ind1: '4', ind2: '2' },
                { u: 'http://item-related-resource.com' },
              );
              OaiPmh.verifyOaiPmhRecordHeader(response, testData.folioInstance.uuid, false, true);
            },
          );
        });
      },
    );
  });
});
