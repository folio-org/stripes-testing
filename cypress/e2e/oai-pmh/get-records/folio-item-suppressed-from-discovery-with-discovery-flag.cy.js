import {
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const folioInstance = {
  title: `AT_C375195_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};
const electronicAccessHoldings = {
  uri: 'http://holdings-url.com',
  linkText: 'Holdings Link Text',
  materialsSpecified: 'materials holdings',
  urlPublicNote: 'Holdings URL public note',
};
const electronicAccessItem = {
  relationshipType: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
  uri: 'http://item-url.com',
  linkText: 'Item Link Text',
  materialsSpecified: 'item materials specified',
  urlPublicNote: 'item url public note',
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

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: folioInstance.title,
            },
          }).then((createdInstanceData) => {
            folioInstance.id = createdInstanceData.instanceId;

            cy.getLocations({ limit: 1 }).then((res) => {
              const locationId = res.id;

              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                const sourceId = folioSource.id;

                UrlRelationship.getViaApi({
                  query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
                }).then((relationships) => {
                  const resourceRelationshipId = relationships[0].id;

                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: folioInstance.id,
                    permanentLocationId: locationId,
                    sourceId,
                    discoverySuppress: false,
                    electronicAccess: [
                      {
                        relationshipId: resourceRelationshipId,
                        uri: electronicAccessHoldings.uri,
                        linkText: electronicAccessHoldings.linkText,
                        materialsSpecification: electronicAccessHoldings.materialsSpecified,
                        publicNote: electronicAccessHoldings.urlPublicNote,
                      },
                    ],
                  }).then((holding) => {
                    folioInstance.holdingId = holding.id;

                    cy.login(user.username, user.password, {
                      path: TopMenu.inventoryPath,
                      waiter: InventorySearchAndFilter.waitLoading,
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375195 GetRecord: Verify Item FOLIO suppressed from discovery in case Transfer suppressed records with discovery flag value (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375195', 'nonParallel'] },
      () => {
        // Step 1: Click on the "Add item" button in the "Holdings" accordion
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.addItem();

        // Step 2: Mark as active the "Suppress from discovery" checkbox on the "Administrative data" accordion
        ItemRecordNew.markAsSuppressedFromDiscovery();

        // Step 3: Select Material type, Permanent loan type, add electronic access, and save
        ItemRecordNew.fillItemRecordFields({
          barcode: folioInstance.itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });
        ItemRecordNew.addElectronicAccessFields(electronicAccessItem);
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 4: Send OAI-PMH GetRecord request and verify response
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          // Verify FOLIO record is retrieved and 999 field contains "t" subfield set to "0"
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { t: '0', i: folioInstance.id },
          );

          // Verify 952 field (item/holdings data) has "t" subfield set to 1
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            { t: '1' },
          );

          // Verify not suppressed holdings 856 field has "t" subfield set to 0
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            { t: '0', u: electronicAccessHoldings.uri },
          );

          // Verify suppressed item 856 field has "t" subfield set to 1
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            { t: '1', u: electronicAccessItem.uri },
          );
        });
      },
    );
  });
});
