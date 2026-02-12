import {
  DEFAULT_JOB_PROFILE_NAMES,
  LOCATION_NAMES,
  INSTITUTION_NAMES,
  CAMPUS_NAMES,
  LIBRARY_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
} from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';

const relationshipIds = {};
const marcInstance = { title: `AT_C375964_MarcInstance_${getRandomPostfix()}` };
const marcHoldingsFile = {
  marc: 'marcHoldingForC375964.mrc',
  fileNameImported: `testMarcHoldingsFileC375964.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC375964.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('Create test data and configure behavior', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      // Fetch electronic access relationship IDs
      const relationshipQueries = [
        { key: 'resource', name: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE },
        { key: 'versionOfResource', name: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE },
        { key: 'relatedResource', name: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE },
        {
          key: 'noInformationProvided',
          name: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
        },
        {
          key: 'noDisplayConstantGenerated',
          name: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_DISPLAY_CONSTANT_GENERATED,
        },
      ];

      relationshipQueries.forEach(({ key, name }) => {
        UrlRelationship.getViaApi({ query: `name=="${name}"` }).then((relationships) => {
          relationshipIds[key] = relationships[0].id;
        });
      });

      cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
        marcInstance.id = instanceId;

        cy.getInstanceById(marcInstance.id)
          .then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;
            marcInstance.title = instanceData.title;

            // Edit MARC holdings file with instance HRID
            DataImport.editMarcFile(
              marcHoldingsFile.marc,
              marcHoldingsFile.editedFileName,
              ['oo10000000000'],
              [marcInstance.hrid],
            );
          })
          .then(() => {
            // Import MARC Holdings record
            DataImport.uploadFileViaApi(
              marcHoldingsFile.editedFileName,
              marcHoldingsFile.fileNameImported,
              marcHoldingsFile.jobProfileToRun,
            ).then((response) => {
              marcInstance.holdingsId = response[0].holding.id;
            });
          });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
    });

    it(
      'C375964 GetRecord: Verify harvesting SRS with holdings (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375964'] },
      () => {
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
              b: CAMPUS_NAMES.CITY_CAMPUS,
              c: LIBRARY_NAMES.DATALOGISK_INSTITUT,
              d: LOCATION_NAMES.MAIN_LIBRARY_UI,
              e: 'Holdings call number',
              f: 'Holdings call number prefix',
              g: 'Holdings call number suffix',
              h: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
            },
          );

          const expectedElectronicAccessFields = [
            {
              indicators: { ind1: '4', ind2: '0' },
              subfields: {
                u: 'Resource_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
            },
            {
              indicators: { ind1: '4', ind2: '1' },
              subfields: {
                u: 'Version_of_resource_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
            },
            {
              indicators: { ind1: '4', ind2: '2' },
              subfields: {
                u: 'Related_resource_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
            },
          ];

          expectedElectronicAccessFields.forEach((field) => {
            OaiPmh.verifyMarcField(
              response,
              marcInstance.id,
              '856',
              field.indicators,
              field.subfields,
            );
          });

          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            [
              {
                u: 'empty_value_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
              {
                u: 'No_display_constant_generated_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
              {
                u: 'No_information_provided_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
            ],
            3,
          );
        });
      },
    );
  });
});
