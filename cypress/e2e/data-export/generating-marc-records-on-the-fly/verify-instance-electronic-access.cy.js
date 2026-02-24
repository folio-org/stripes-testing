/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../support/constants';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let instanceTypeId;
let exportedFileName;
let csvFileName;
let testData;

const electronicAccessData = [
  {
    relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_DISPLAY_CONSTANT_GENERATED,
    uri: 'https://test1.example.com',
    linkText: 'Test Link 1',
    materialsSpecification: 'Materials 1',
    publicNote: 'Public Note 1',
    marcIndicators: { ind1: '4', ind2: '8' },
  },
  {
    relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.NO_INFORMATION_PROVIDED,
    uri: 'https://test2.example.com',
    linkText: 'Test Link 2',
    materialsSpecification: 'Materials 2',
    publicNote: 'Public Note 2',
    marcIndicators: { ind1: '4', ind2: ' ' },
  },
  {
    relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
    uri: 'https://test3.example.com',
    linkText: 'Test Link 3',
    materialsSpecification: 'Materials 3',
    publicNote: 'Public Note 3',
    marcIndicators: { ind1: '4', ind2: '2' },
  },
  {
    relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
    uri: 'https://test4.example.com',
    linkText: 'Test Link 4',
    materialsSpecification: 'Materials 4',
    publicNote: 'Public Note 4',
    marcIndicators: { ind1: '4', ind2: '0' },
  },
  {
    relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
    uri: 'https://test5.example.com',
    linkText: 'Test Link 5',
    materialsSpecification: 'Materials 5',
    publicNote: 'Public Note 5',
    marcIndicators: { ind1: '4', ind2: '1' },
  },
  {
    relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.COMPONENT_PART_OF_RESOURCE,
    uri: 'https://test6.example.com',
    linkText: 'Test Link 6',
    materialsSpecification: 'Materials 6',
    publicNote: 'Public Note 6',
    marcIndicators: { ind1: '4', ind2: '3' },
  },
  {
    relationship: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_COMPONENT_PART_OF_RESOURCE,
    uri: 'https://test7.example.com',
    linkText: 'Test Link 7',
    materialsSpecification: 'Materials 7',
    publicNote: 'Public Note 7',
    marcIndicators: { ind1: '4', ind2: '4' },
  },
];

describe(
  'Data Export',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Generating MARC records on the fly', () => {
      beforeEach('Create test data', () => {
        // Recreate variables with fresh values for each retry
        csvFileName = `AT_C15849_instanceUUIDs_${getRandomPostfix()}.csv`;
        testData = {
          instanceTitle: `AT_C15849_FolioInstance_${getRandomPostfix()}`,
          instanceHrid: '',
          instanceUuid: '',
          createdElectronicAccess: [],
          relationshipMap: {},
          createdRelationships: [],
        };
        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;

            UrlRelationship.getViaApi().then((relationships) => {
              const relationshipMap = {}; // { Resource: 'id-1252', ...}
              relationships.forEach((rel) => {
                relationshipMap[rel.name] = rel.id;
              });

              // Create missing relationship types
              const relationshipsToCreate = [
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.COMPONENT_PART_OF_RESOURCE,
                ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_COMPONENT_PART_OF_RESOURCE,
              ];

              relationshipsToCreate.forEach((name) => {
                if (!relationshipMap[name]) {
                  const newRelationship = {
                    name,
                    source: 'local',
                  };
                  UrlRelationship.createViaApi(newRelationship).then((response) => {
                    testData.createdRelationships.push(response);
                    relationshipMap[name] = response.id;
                    cy.wait(3000);
                  });
                }
              });

              // Store relationship mapping for later use in test
              testData.relationshipMap = relationshipMap;

              cy.then(() => {
                // Create instance with multiple electronic access entries
                const electronicAccessArray = [];

                // Add all entries from electronicAccessData using available relationships
                electronicAccessData.forEach((accessData) => {
                  if (relationshipMap[accessData.relationship]) {
                    electronicAccessArray.push({
                      relationshipId: relationshipMap[accessData.relationship],
                      uri: accessData.uri,
                      linkText: accessData.linkText,
                      materialsSpecification: accessData.materialsSpecification,
                      publicNote: accessData.publicNote,
                    });
                  }
                });

                // Create instance with electronic access
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: testData.instanceTitle,
                    electronicAccess: electronicAccessArray,
                  },
                }).then((createdInstanceData) => {
                  testData.instanceUuid = createdInstanceData.instanceId;
                  testData.createdElectronicAccess = electronicAccessArray;

                  cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                    testData.instanceHrid = instanceData.hrid;
                  });

                  FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceUuid);
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken();

        testData.createdRelationships.forEach((relationship) => {
          UrlRelationship.deleteViaApi(relationship.id);
        });

        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceUuid);
        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      });

      it(
        'C15849 Verify Instance electronic access (firebird)',
        { tags: ['extendedPath', 'firebird', 'C15849'] },
        () => {
          // Step 1: Go to the "Data export" app
          DataExportLogs.verifyDragAndDropAreaExists();
          DataExportLogs.verifyUploadFileButtonDisabled(false);
          DataExportLogs.verifyRunningAccordionExpanded();

          // Step 2: Trigger the data export by submitting .csv file with UUIDs of inventory instances
          ExportFile.uploadFile(csvFileName);

          // Step 3: Run the "Default instances export job profile" by clicking on it > Specify "Instances" type > Click on "Run" button
          ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
          cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const jobId = jobData.hrId;
            exportedFileName = `${csvFileName.replace('.csv', '')}-${jobId}.mrc`;

            DataExportResults.verifySuccessExportResultCells(
              exportedFileName,
              1,
              jobId,
              user.username,
              'Default instances',
            );
            cy.getUserToken(user.username, user.password);

            // Step 4: Download the recently created file with extension .mrc by clicking on file name
            DataExportLogs.clickButtonWithText(exportedFileName);

            // Step 5: Verify MARC 856 field mappings
            function verify856Field(record, accessData) {
              const allElectronicAccessFields = record.get('856');

              expect(allElectronicAccessFields).to.exist;
              expect(allElectronicAccessFields.length).to.be.greaterThan(0);

              const electronicAccessField = allElectronicAccessFields.find((field) => {
                const uriSubfield = field.subf.find((subfield) => subfield[0] === 'u');

                return uriSubfield && uriSubfield[1] === accessData.uri;
              });

              expect(electronicAccessField).to.exist;
              expect(electronicAccessField.ind1).to.eq(accessData.marcIndicators.ind1);
              expect(electronicAccessField.ind2).to.eq(accessData.marcIndicators.ind2);
              expect(electronicAccessField.subf[0][0]).to.eq('u');
              expect(electronicAccessField.subf[0][1]).to.eq(accessData.uri);
              expect(electronicAccessField.subf[1][0]).to.eq('y');
              expect(electronicAccessField.subf[1][1]).to.eq(accessData.linkText);
              expect(electronicAccessField.subf[2][0]).to.eq('z');
              expect(electronicAccessField.subf[2][1]).to.eq(accessData.publicNote);
              expect(electronicAccessField.subf[3][0]).to.eq('3');
              expect(electronicAccessField.subf[3][1]).to.eq(accessData.materialsSpecification);
            }

            const assertionsOnMarcFileContent = [
              {
                uuid: testData.instanceUuid,
                assertions: electronicAccessData.map((accessData) => {
                  return (record) => verify856Field(record, accessData);
                }),
              },
            ];

            parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 1);
          });
        },
      );
    });
  },
);
