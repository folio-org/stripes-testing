import {
  ITEM_STATUS_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  INSTITUTION_NAMES,
  CAMPUS_NAMES,
  LIBRARY_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
} from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';

const relationshipIds = {};
const marcInstance = { title: `AT_C13784_MarcInstance_${getRandomPostfix()}` };
const marcHoldingsFile = {
  marc: 'marcHoldingForC13784.mrc',
  fileNameImported: `testMarcHoldingsFileC13784.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC13784.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};
const itemData = {
  barcode: `barcode_${getRandomPostfix()}`,
  materialType: 'book',
  copyNumber: `Item copy number ${getRandomPostfix()}`,
  enumeration: `Enumeration ${getRandomPostfix()}`,
  chronology: `Chronology ${getRandomPostfix()}`,
  volume: `Volume ${getRandomPostfix()}`,
  permanentLoanType: 'Can circulate',
  electronicAccess: [],
};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('Create test data and configure behavior', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        true,
        'Source record storage and Inventory',
        'persistent',
        '200',
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

      cy.then(() => {
        // Populate electronic access array with dynamic relationship IDs
        itemData.electronicAccess = [
          {
            uri: 'http://example.com/resource/item',
            linkText: 'Resource Link item',
            materialsSpecification: 'Resource Materials item',
            publicNote: 'Resource Note',
            relationshipId: relationshipIds.resource,
          },
          {
            uri: 'http://example.com/version/item',
            linkText: 'Version Link item',
            materialsSpecification: 'Version Materials item',
            publicNote: 'Version Note',
            relationshipId: relationshipIds.versionOfResource,
          },
          {
            uri: 'http://example.com/related/item',
            linkText: 'Related Link item',
            materialsSpecification: 'Related Materials item',
            publicNote: 'Related Note item',
            relationshipId: relationshipIds.relatedResource,
          },
          {
            uri: 'http://example.com/noinfo/item',
            linkText: 'No Info Link item',
            materialsSpecification: 'No Info Materials item',
            publicNote: 'No Info Note item',
            relationshipId: relationshipIds.noInformationProvided,
          },
          {
            uri: 'http://example.com/nodisplay/item',
            linkText: 'No Display Link item',
            materialsSpecification: 'No Display Materials item',
            publicNote: 'No Display Note item',
            relationshipId: relationshipIds.noDisplayConstantGenerated,
          },
          {
            uri: 'http://example.com/empty/item',
            linkText: 'Empty Value Link item',
            materialsSpecification: 'Empty Materials item',
            publicNote: 'Empty Note item',
            relationshipId: null,
          },
        ];
      });

      // Import MARC Bibliographic record
      cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceResponse) => {
        marcInstance.id = instanceResponse;

        cy.getInstanceById(marcInstance.id)
          .then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

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

              // Create item with electronic access
              cy.getDefaultMaterialType().then((res) => {
                const materialTypeId = res.id;
                cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                  (loanTypes) => {
                    const loanTypeId = loanTypes[0].id;

                    InventoryItems.createItemViaApi({
                      holdingsRecordId: marcInstance.holdingsId,
                      barcode: itemData.barcode,
                      materialType: { id: materialTypeId },
                      permanentLoanType: { id: loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      copyNumber: itemData.copyNumber,
                      enumeration: itemData.enumeration,
                      chronology: itemData.chronology,
                      volume: itemData.volume,
                      electronicAccess: itemData.electronicAccess,
                    }).then((item) => {
                      marcInstance.itemId = item.id;
                    });
                  },
                );
              });
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
      'C13784 SRS -- List records in marc21_withholdings format with start and end date (firebird)',
      { tags: ['criticalPath', 'firebird', 'C13784'] },
      () => {
        cy.getAdminToken();
        OaiPmh.listRecordsRequest('marc21_withholdings').then((response) => {
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
              i: itemData.materialType,
              j: itemData.volume,
              k: itemData.enumeration,
              l: itemData.chronology,
              m: itemData.barcode,
              n: itemData.copyNumber,
            },
          );
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '8' },
            {
              u: itemData.electronicAccess[4].uri,
              y: itemData.electronicAccess[4].linkText,
              3: itemData.electronicAccess[4].materialsSpecification,
              z: itemData.electronicAccess[4].publicNote,
            },
          );
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '0' },
            [
              {
                u: itemData.electronicAccess[0].uri,
                y: itemData.electronicAccess[0].linkText,
                3: itemData.electronicAccess[0].materialsSpecification,
                z: itemData.electronicAccess[0].publicNote,
              },
              {
                u: 'Resource_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
            ],
            2,
          );
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '1' },
            [
              {
                u: itemData.electronicAccess[1].uri,
                y: itemData.electronicAccess[1].linkText,
                3: itemData.electronicAccess[1].materialsSpecification,
                z: itemData.electronicAccess[1].publicNote,
              },
              {
                u: 'Version_of_resource_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
            ],
            2,
          );
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: '2' },
            [
              {
                u: itemData.electronicAccess[2].uri,
                y: itemData.electronicAccess[2].linkText,
                3: itemData.electronicAccess[2].materialsSpecification,
                z: itemData.electronicAccess[2].publicNote,
              },
              {
                u: 'Related_resource_URI_holding',
                y: 'Link text holding',
                3: 'Materials specified holding',
                z: 'Public note holding',
              },
            ],
            2,
          );
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            marcInstance.id,
            '856',
            { ind1: '4', ind2: ' ' },
            [
              {
                u: itemData.electronicAccess[3].uri,
                y: itemData.electronicAccess[3].linkText,
                3: itemData.electronicAccess[3].materialsSpecification,
                z: itemData.electronicAccess[3].publicNote,
              },
              {
                u: itemData.electronicAccess[5].uri,
                y: itemData.electronicAccess[5].linkText,
                3: itemData.electronicAccess[5].materialsSpecification,
                z: itemData.electronicAccess[5].publicNote,
              },
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
            ],
            4,
          );
        });
      },
    );
  });
});
