import {
  CALL_NUMBER_TYPE_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  LOCATION_NAMES,
  CAMPUS_NAMES,
  INSTITUTION_NAMES,
  LIBRARY_NAMES,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import getRandomPostfix from '../../../support/utils/stringTools';

let folioInstanceId;
let locationId;
let sourceId;
let callNumberTypeId;
let resourceRelationshipId;
const folioInstance = {
  title: `AT_C375973_FolioInstance_${getRandomPostfix()}`,
};
const holdingsData = {
  callNumber: 'Holdings call number',
  callNumberPrefix: 'Holdings call number prefix',
  callNumberSuffix: 'Holdings call number suffix',
  callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
};
const locationData = {
  institution: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
  campus: CAMPUS_NAMES.CITY_CAMPUS,
  library: LIBRARY_NAMES.DATALOGISK_INSTITUT,
  location: LOCATION_NAMES.MAIN_LIBRARY_UI,
};
const electronicAccessData = {
  uri: 'https://example.com/resource',
  linkText: 'Link text',
  materialsSpecified: 'Materials specified',
  publicNote: 'Public note',
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

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: folioInstance.title,
          },
        }).then((createdInstanceData) => {
          folioInstanceId = createdInstanceData.instanceId;
        });
      });

      cy.getLocations({ query: `name="${locationData.location}"` }).then((locations) => {
        locationId = locations.id;
      });

      InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
        sourceId = folioSource.id;
      });

      InventoryInstances.getCallNumberTypes({
        query: `name=="${holdingsData.callNumberType}"`,
      }).then((callNumberTypes) => {
        callNumberTypeId = callNumberTypes[0].id;
      });

      UrlRelationship.getViaApi({
        query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
      }).then((relationships) => {
        resourceRelationshipId = relationships[0].id;

        InventoryHoldings.createHoldingRecordViaApi({
          instanceId: folioInstanceId,
          permanentLocationId: locationId,
          sourceId,
          discoverySuppress: false,
          callNumber: holdingsData.callNumber,
          callNumberPrefix: holdingsData.callNumberPrefix,
          callNumberSuffix: holdingsData.callNumberSuffix,
          callNumberTypeId,
          electronicAccess: [
            {
              relationshipId: resourceRelationshipId,
              uri: electronicAccessData.uri,
              linkText: electronicAccessData.linkText,
              materialsSpecification: electronicAccessData.materialsSpecified,
              publicNote: electronicAccessData.publicNote,
            },
          ],
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstanceId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375973 GetRecords: FOLIO instances with Holdings are harvested (marc21_withholdings) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375973', 'nonParallel'] },
      () => {
        // Send OAI-PMH GetRecord request with marc21_withholdings and verify response
        OaiPmh.getRecordRequest(folioInstanceId, 'marc21_withholdings').then((response) => {
          // Verify 999 field with instance UUID
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: folioInstanceId },
          );

          // Verify 245 field with instance title
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '245',
            { ind1: '0', ind2: '0' },
            { a: folioInstance.title },
          );

          // Verify 952 field with holdings effective location fields
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.institution,
              b: locationData.campus,
              c: locationData.library,
              d: locationData.location,
              e: holdingsData.callNumber,
              f: holdingsData.callNumberPrefix,
              g: holdingsData.callNumberSuffix,
              h: holdingsData.callNumberType,
            },
          );

          // Verify 856 field with electronic access data
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '856',
            { ind1: '4', ind2: '0' },
            {
              u: electronicAccessData.uri,
              y: electronicAccessData.linkText,
              3: electronicAccessData.materialsSpecified,
              z: electronicAccessData.publicNote,
            },
          );

          // Verify OAI-PMH record header
          OaiPmh.verifyOaiPmhRecordHeader(response, folioInstanceId, false, true);
        });
      },
    );
  });
});
