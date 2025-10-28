/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const randomPostfix = getRandomPostfix();
const csvFileName = `AT_C466267_instances_${randomPostfix}.csv`;
const mappingProfileName = `AT_C466267_MappingProfile_${randomPostfix}`;
const jobProfileName = `AT_C466267_JobProfile_${randomPostfix} export job profile`;
const folioInstanceTitle = `AT_C466267_FolioInstance_${randomPostfix}`;
const marcInstanceTitle = `AT_C466267_MarcInstance_${randomPostfix}`;
const contributorName = `Contributor_Personal_${randomPostfix}`;
const testData = {
  instances: {
    folio: {},
    marc: {},
  },
  relationshipIds: {},
  allUUIDs: [],
  isbnValue: '97801223456789C466267',
  field020Value: '9780123456789C466267',
  electronicAccessUris: {
    noDisplay: 'https://folio.org/display',
    noInfo: 'https://folio.org/noinfo',
    related: 'https://folio.org/related',
    resource: 'https://folio.org/resource',
    version: 'https://folio.org/version',
    marc40: 'https://example.com/marc-40',
    marc41: 'https://example.com/marc-41',
    marc42: 'https://example.com/marc-42',
    marc48: 'https://example.com/marc-48',
  },
};

const createMappingProfileBody = (relationshipIds, isbnIdentifierTypeId, contributorTypeId) => ({
  name: mappingProfileName,
  transformations: [
    {
      fieldId: 'instance.contributorname.personal.name',
      path: `$.instance.contributors[?(@.contributorNameTypeId=='${contributorTypeId}' && (!(@.primary) || @.primary == false))].name`,
      recordType: 'INSTANCE',
      transformation: '7001 $a',
      enabled: true,
    },
    {
      fieldId: 'instance.electronic.access.uri.no.display.constant.generated',
      path: `$.instance.electronicAccess[?(@.relationshipId=='${relationshipIds.NO_DISPLAY_CONSTANT_GENERATED}')].uri`,
      recordType: 'INSTANCE',
      transformation: '85648$u',
      enabled: true,
    },
    {
      fieldId: 'instance.electronic.access.uri.no.information.provided',
      path: `$.instance.electronicAccess[?(@.relationshipId=='${relationshipIds.NO_INFORMATION_PROVIDED}')].uri`,
      recordType: 'INSTANCE',
      transformation: '85641$u',
      enabled: true,
    },
    {
      fieldId: 'instance.electronic.access.uri.related.resource',
      path: `$.instance.electronicAccess[?(@.relationshipId=='${relationshipIds.RELATED_RESOURCE}')].uri`,
      recordType: 'INSTANCE',
      transformation: '85642$u',
      enabled: true,
    },
    {
      fieldId: 'instance.electronic.access.uri.resource',
      path: `$.instance.electronicAccess[?(@.relationshipId=='${relationshipIds.RESOURCE}')].uri`,
      recordType: 'INSTANCE',
      transformation: '85640$u',
      enabled: true,
    },
    {
      fieldId: 'instance.electronic.access.uri.version.of.resource',
      path: `$.instance.electronicAccess[?(@.relationshipId=='${relationshipIds.VERSION_OF_RESOURCE}')].uri`,
      recordType: 'INSTANCE',
      transformation: '85641$u',
      enabled: true,
    },
    {
      fieldId: 'instance.hrid',
      path: '$.instance.hrid',
      recordType: 'INSTANCE',
      transformation: '001  ',
      enabled: true,
    },
    {
      fieldId: 'instance.id',
      path: '$.instance.id',
      recordType: 'INSTANCE',
      transformation: '999ff$i',
      enabled: true,
    },
    {
      fieldId: 'instance.identifiers.isbn',
      path: `$.instance.identifiers[?(@.identifierTypeId=='${isbnIdentifierTypeId}')].value`,
      recordType: 'INSTANCE',
      transformation: '020  $a',
      enabled: true,
    },
    {
      fieldId: 'instance.title',
      path: '$.instance.title',
      recordType: 'INSTANCE',
      transformation: '24500$a',
      enabled: true,
    },
    {
      fieldId: 'instance.source',
      path: '$.instance.source',
      recordType: 'INSTANCE',
      transformation: '999  $a',
      enabled: true,
    },
  ],
  recordTypes: ['INSTANCE'],
  outputFormat: 'MARC',
  fieldsSuppression: '999,856',
  suppress999ff: true,
});

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          testData.instanceTypeId = types[0].id;
        });
        BrowseContributors.getContributorNameTypes({
          searchParams: { query: 'name=="Personal name"' },
        }).then((contributorTypes) => {
          testData.personalContributorTypeId = contributorTypes[0]?.id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name=="ISBN"' })
          .then((identifier) => {
            testData.isbnIdentifierTypeId = identifier.id;
          })
          .then(() => {
            const relationshipKeys = [
              'NO_DISPLAY_CONSTANT_GENERATED',
              'NO_INFORMATION_PROVIDED',
              'RELATED_RESOURCE',
              'RESOURCE',
              'VERSION_OF_RESOURCE',
            ];
            relationshipKeys.forEach((key) => {
              const name = ELECTRONIC_ACCESS_RELATIONSHIP_NAME[key];
              UrlRelationship.getViaApi({ query: `name=="${name}"` }).then((rels) => {
                if (rels && rels[0]) {
                  testData.relationshipIds[key] = rels[0].id;
                }
              });
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: folioInstanceTitle,
                contributors: [
                  {
                    name: contributorName,
                    contributorNameTypeId: testData.personalContributorTypeId,
                  },
                ],
                identifiers: [
                  {
                    identifierTypeId: testData.isbnIdentifierTypeId,
                    value: testData.isbnValue,
                    typeName: 'ISBN',
                  },
                ],
                electronicAccess: [
                  {
                    uri: testData.electronicAccessUris.noDisplay,
                    relationshipId: testData.relationshipIds.NO_DISPLAY_CONSTANT_GENERATED,
                  },
                  {
                    uri: testData.electronicAccessUris.noInfo,
                    relationshipId: testData.relationshipIds.NO_INFORMATION_PROVIDED,
                  },
                  {
                    uri: testData.electronicAccessUris.related,
                    relationshipId: testData.relationshipIds.RELATED_RESOURCE,
                  },
                  {
                    uri: testData.electronicAccessUris.resource,
                    relationshipId: testData.relationshipIds.RESOURCE,
                  },
                  {
                    uri: testData.electronicAccessUris.version,
                    relationshipId: testData.relationshipIds.VERSION_OF_RESOURCE,
                  },
                ],
              },
            }).then((createdInstanceData) => {
              testData.instances.folio.uuid = createdInstanceData.instanceId;

              cy.getInstanceById(createdInstanceData.instanceId).then((inst) => {
                testData.instances.folio.hrid = inst.hrid;
              });
            });
          });

        cy.then(() => {
          const marcFields = [
            { tag: '008', content: QuickMarcEditor.defaultValid008Values },
            { tag: '020', content: `$a ${testData.field020Value}`, indicators: ['\\', '\\'] },
            { tag: '245', content: `$a ${marcInstanceTitle}`, indicators: ['1', '0'] },
            { tag: '700', content: `$a ${contributorName}`, indicators: ['1', '\\'] },
            {
              tag: '856',
              content: `$u ${testData.electronicAccessUris.marc40}`,
              indicators: ['4', '0'],
            },
            {
              tag: '856',
              content: `$u ${testData.electronicAccessUris.marc41}`,
              indicators: ['4', '1'],
            },
            {
              tag: '856',
              content: `$u ${testData.electronicAccessUris.marc42}`,
              indicators: ['4', '2'],
            },
            {
              tag: '856',
              content: `$u ${testData.electronicAccessUris.marc48}`,
              indicators: ['4', '8'],
            },
          ];
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcFields).then(
            (marcInstanceId) => {
              testData.instances.marc.uuid = marcInstanceId;
              cy.getInstanceById(marcInstanceId).then((inst) => {
                testData.instances.marc.hrid = inst.hrid;
              });
            },
          );
        });

        cy.then(() => {
          const mappingProfile = createMappingProfileBody(
            testData.relationshipIds,
            testData.isbnIdentifierTypeId,
            testData.personalContributorTypeId,
          );
          cy.createDataExportCustomMappingProfile(mappingProfile).then((resp) => {
            testData.mappingProfileId = resp.id;
            ExportNewJobProfile.createNewJobProfileViaApi(
              jobProfileName,
              testData.mappingProfileId,
            ).then((jobResp) => {
              testData.jobProfileId = jobResp.body.id;
            });
          });
        });

        cy.then(() => {
          testData.allUUIDs = [testData.instances.folio.uuid, testData.instances.marc.uuid];
          FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.allUUIDs.join('\n'));
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      testData.allUUIDs.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });
      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.resultFileName);
    });

    it(
      'C466267 Exclude fields from Export with custom Instance profile (firebird)',
      { tags: ['extendedPath', 'firebird', 'C466267'] },
      () => {
        // Step 1: Trigger the data export by uploading the .csv file with Instance UUIDs
        ExportFileHelper.uploadFile(csvFileName);

        // Step 2: Run the custom job profile created in Preconditions (specify "instances" type and run)
        ExportFileHelper.exportWithDefaultJobProfile(
          csvFileName,
          `AT_C466267_JobProfile_${randomPostfix}`,
        );

        // Step 3: Wait for job completion and verify the export logs data
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = testData.allUUIDs.length;
          testData.resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            testData.resultFileName,
            totalRecordsCount,
            jobId,
            user.username,
            `AT_C466267_JobProfile_${randomPostfix}`,
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Download the generated .mrc file by clicking its name in the Logs table
          DataExportLogs.clickButtonWithText(testData.resultFileName);

          // Step 5-6: Verify MARC field transformations and suppression configuration applied
          ExportFileHelper.verifyFileIncludes(testData.resultFileName, [
            folioInstanceTitle,
            marcInstanceTitle,
            testData.isbnValue,
            testData.field020Value,
            testData.instances.folio.hrid,
            testData.instances.marc.hrid,
            contributorName,
          ]);
          ExportFileHelper.verifyFileIncludes(
            testData.resultFileName,
            [
              testData.instances.folio.uuid,
              testData.instances.marc.uuid,
              ...Object.values(testData.electronicAccessUris),
            ],
            false,
          );
        });
      },
    );
  });
});
