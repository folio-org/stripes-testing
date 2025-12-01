/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES, NOTE_TYPES } from '../../../support/constants';
import Affiliations, { tenantNames, tenantCodes } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import InstanceNoteTypes from '../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import SubjectSources from '../../../support/fragments/settings/inventory/instances/subjectSources';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verify001FieldValue,
} from '../../../support/utils/parseMrcFileContent';
import DateTools from '../../../support/utils/dateTools';

let user;
let exportedFileName;
let instanceTypeId;
let natureOfContentName;
const recordsCount = 5;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
];
const instances = [
  {
    title: `AT_C407648_Local_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'folio',
  },
  {
    title: `AT_C407648_Local_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'marc',
  },
  {
    title: `AT_C407648_Shared_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
  },
  {
    title: `AT_C407648_Shared_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
  },
];
const newInstanceTitle = `AT_C407648_NewLocal_FolioInstance_${getRandomPostfix()}`;
const instanceUUIDsFileName = `AT_C407648_instanceUUIDs_${getRandomPostfix()}.csv`;
const testData = {
  newInstance: {},
};

function createInstance(instance) {
  cy.withinTenant(instance.affiliation, () => {
    if (instance.type === 'folio') {
      const retrievedData = {};

      cy.getInstanceIdentifierTypes()
        .then(() => {
          const identifierTypes = Cypress.env('identifierTypes');
          retrievedData.isbnTypeId = identifierTypes.find((type) => type.name === 'ISBN')?.id;
          retrievedData.issnTypeId = identifierTypes.find((type) => type.name === 'ISSN')?.id;
          retrievedData.asinTypeId = identifierTypes.find((type) => type.name === 'ASIN')?.id;
          retrievedData.codenTypeId = identifierTypes.find((type) => type.name === 'CODEN')?.id;
          retrievedData.lccnTypeId = identifierTypes.find((type) => type.name === 'LCCN')?.id;
          retrievedData.reportNumberTypeId = identifierTypes.find(
            (type) => type.name === 'Report number',
          )?.id;
          retrievedData.systemControlNumberTypeId = identifierTypes.find(
            (type) => type.name === 'System control number',
          )?.id;
          retrievedData.cancelledSystemControlNumberTypeId = identifierTypes.find(
            (type) => type.name === 'Cancelled system control number',
          )?.id;
          retrievedData.publisherDistributorNumberTypeId = identifierTypes.find(
            (type) => type.name === 'Publisher or distributor number',
          )?.id;
        })
        .then(() => {
          return BrowseContributors.getContributorNameTypes({
            searchParams: { limit: 100 },
          }).then((contributorNameTypes) => {
            retrievedData.personalNameTypeId = contributorNameTypes.find(
              (type) => type.name === 'Personal name',
            )?.id;
            retrievedData.corporateNameTypeId = contributorNameTypes.find(
              (type) => type.name === 'Corporate name',
            )?.id;
            retrievedData.meetingNameTypeId = contributorNameTypes.find(
              (type) => type.name === 'Meeting name',
            )?.id;
          });
        })
        .then(() => {
          return InstanceNoteTypes.getInstanceNoteTypesViaApi({
            searchParams: { query: `name=="${NOTE_TYPES.GENERAL}"` },
          }).then((response) => {
            retrievedData.generalNoteTypeId = response.instanceNoteTypes[0]?.id;
          });
        })
        .then(() => {
          return UrlRelationship.getViaApi().then((relationships) => {
            retrievedData.resourceRelationship = relationships.find(
              (rel) => rel.name === 'Resource',
            );
          });
        })
        .then(() => {
          return cy
            .getSubjectTypesViaApi({ limit: 1, query: 'source="folio"' })
            .then((subjectTypes) => {
              retrievedData.subjectTypeId = subjectTypes[0]?.id;
            });
        })
        .then(() => {
          return SubjectSources.getSubjectSourcesViaApi({ limit: 1 }).then((subjectSources) => {
            retrievedData.subjectSourceId = subjectSources[0]?.id;
          });
        })
        .then(() => {
          return NatureOfContent.getViaApi({ limit: 1, query: 'name=="biography"' }).then(
            ({ natureOfContentTerms }) => {
              const natureContent4 = natureOfContentTerms[0];
              retrievedData.natureOfContentId = natureContent4?.id;
              natureOfContentName = natureContent4?.name;
            },
          );
        })
        .then(() => {
          return cy.getAlternativeTitlesTypes({ limit: 100 }).then((titleTypes) => {
            retrievedData.uniformTitleType = titleTypes.find(
              (type) => type.name === 'Uniform title',
            );
            retrievedData.variantTitleType = titleTypes.find(
              (type) => type.name === 'Variant title',
            );
            retrievedData.formerTitleType = titleTypes.find((type) => type.name === 'Former title');
          });
        })
        .then(() => {
          // Retrieve modeOfIssuanceId by name 'multipart monograph'
          return cy.getModesOfIssuance({ query: 'name=="multipart monograph"' });
        })
        .then((modeOfIssuance) => {
          // Create FOLIO instance with comprehensive fields for Step 13 mapping verification
          const instanceData = {
            instanceTypeId,
            title: instance.title,
            identifiers: [
              { identifierTypeId: retrievedData.isbnTypeId, value: '978-0-12345-678-9' },
              { identifierTypeId: retrievedData.issnTypeId, value: '1234-5678' },
              { identifierTypeId: retrievedData.asinTypeId, value: 'B000123456' },
              { identifierTypeId: retrievedData.codenTypeId, value: 'ABCD1234' },
              { identifierTypeId: retrievedData.lccnTypeId, value: '2025123456' },
              { identifierTypeId: retrievedData.reportNumberTypeId, value: 'RN-2025-001' },
              { identifierTypeId: retrievedData.systemControlNumberTypeId, value: 'SCN-987654' },
              {
                identifierTypeId: retrievedData.cancelledSystemControlNumberTypeId,
                value: 'CSC-54321',
              },
              {
                identifierTypeId: retrievedData.publisherDistributorNumberTypeId,
                value: 'PDN-112233',
              },
            ],
            contributors: [
              {
                contributorNameTypeId: retrievedData.personalNameTypeId,
                name: 'Test Author',
                primary: true,
              },
              {
                contributorNameTypeId: retrievedData.corporateNameTypeId,
                name: 'Test Corporate Name',
                primary: false,
              },
              {
                contributorNameTypeId: retrievedData.meetingNameTypeId,
                name: 'Test Meeting Name',
                primary: false,
              },
            ],
            editions: ['First edition'],
            publication: [
              {
                publisher: 'Test Publisher',
                place: 'Test Place',
                dateOfPublication: '2023',
              },
            ],
            physicalDescriptions: ['300 pages'],
            publicationFrequency: ['Annual'],
            publicationRange: ['2020-2023'],
            notes: [
              {
                instanceNoteTypeId: retrievedData.generalNoteTypeId,
                note: 'Test general note',
                staffOnly: false,
              },
            ],
            series: [{ value: 'Test Series' }],
            subjects: [
              {
                value: 'Test Subject',
                sourceId: retrievedData.subjectSourceId,
                typeId: retrievedData.subjectTypeId,
              },
            ],
            alternativeTitles: [
              {
                alternativeTitle: 'Test Uniform Title',
                alternativeTitleTypeId: retrievedData.uniformTitleType?.id,
              },
              {
                alternativeTitle: 'Test Variant Title',
                alternativeTitleTypeId: retrievedData.variantTitleType?.id,
              },
              {
                alternativeTitle: 'Test Former Title',
                alternativeTitleTypeId: retrievedData.formerTitleType?.id,
              },
            ],
            natureOfContentTermIds: [retrievedData.natureOfContentId],
            electronicAccess: [
              {
                relationshipId: retrievedData.resourceRelationship.id,
                uri: 'https://example.com',
                linkText: 'Test Link',
                materialsSpecification: 'Test Materials',
                publicNote: 'Test Public Note',
              },
            ],
            modeOfIssuanceId: modeOfIssuance?.id,
          };

          return InventoryInstances.createFolioInstanceViaApi({
            instance: instanceData,
          });
        })
        .then((createdInstanceData) => {
          instance.uuid = createdInstanceData.instanceId;
          return cy.getInstanceById(instance.uuid);
        })
        .then((instanceDetails) => {
          instance.hrid = instanceDetails.hrid;
        });
    } else {
      cy.createSimpleMarcBibViaAPI(instance.title).then((instanceId) => {
        instance.uuid = instanceId;

        cy.getInstanceById(instanceId).then((instanceData) => {
          instance.hrid = instanceData.hrid;
        });
      });
    }
  });
}

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(userPermissions).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ query: 'name=="text"' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: [...userPermissions, permissions.consortiaInventoryShareLocalInstance.gui],
          }).then(() => {
            // Create precondition instances
            instances.forEach((instance) => {
              createInstance(instance);
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        const localInstances = instances.filter(
          (instance) => instance.affiliation === Affiliations.College,
        );

        localInstances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });
      });
      cy.withinTenant(Affiliations.Consortia, () => {
        const sharedInstances = instances.filter(
          (instance) => instance.affiliation === Affiliations.Consortia,
        );

        sharedInstances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        InventoryInstance.deleteInstanceViaApi(testData.newInstance.uuid);
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C407648 Consortia | Share FOLIO instance from member and export with Default instances job profile (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C407648'] },
      () => {
        // Step 1: Go to "Inventory" app => Select "Actions" => Select "New local record" button
        InventoryInstances.addNewInventory();

        // Step 2: Fill in the "Resource title*" field with any Instance's title
        InventoryNewInstance.fillResourceTitle(newInstanceTitle);

        // Step 3: Select from the "Resource type*" dropdown any existing resource type
        InventoryNewInstance.fillResourceType();

        // Step 4: Click the "Save and close" button
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(newInstanceTitle);
        InventoryInstance.getAssignedHRID().then((hrid) => {
          testData.newInstance.hrid = hrid;
        });

        cy.location('pathname').then((pathname) => {
          const uuidMatch = pathname.match(/\/inventory\/view\/([a-f0-9-]+)/);
          if (uuidMatch) {
            testData.newInstance.uuid = uuidMatch[1];
          }
        });

        // Step 5: Click on the "Actions" menu button => Select "Share local instance" option => Click "Share"
        InventoryInstance.shareInstance();
        InventoryInstance.verifyCalloutMessage(
          `Local instance ${newInstanceTitle} has been successfully shared`,
        );
        InventoryInstance.checkSharedTextInDetailView();

        // Verify Instance HRID is changed and contains central tenant prefix from the very beginning
        InventoryInstance.getAssignedHRID().then((updatedHrid) => {
          expect(updatedHrid.toLowerCase().startsWith(tenantCodes.central.toLowerCase())).to.be
            .true;
          testData.newInstance.hrid = updatedHrid;

          // Step 6: Go to the "Data export" app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();

          // Create CSV file with all instance UUIDs
          const allInstances = [...instances];
          allInstances.push({
            uuid: testData.newInstance.uuid,
            hrid: testData.newInstance.hrid,
            title: newInstanceTitle,
          });

          const uuids = allInstances.map((instance) => instance.uuid).join('\n');

          FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, uuids);

          // Step 7: Trigger the data export by clicking on the "or choose file" button and submitting .csv file
          ExportFileHelper.uploadFile(instanceUUIDsFileName);

          // Step 8: Run the "Default instance export job profile"
          ExportFileHelper.exportWithDefaultJobProfile(instanceUUIDsFileName);

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const jobId = jobData.hrId;
            exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

            // Step 9: Download the recently created file
            DataExportResults.verifySuccessExportResultCells(
              exportedFileName,
              recordsCount,
              jobId,
              user.username,
            );
            DataExportLogs.clickButtonWithText(exportedFileName);

            // Steps 10-13: Verify the downloaded .mrc file includes all instances
            const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();
            const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();

            const commonAssertions = (instance) => [
              (record) => verify001FieldValue(record, instance.hrid),
              (record) => {
                expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
              },
              (record) => {
                expect(record.get('008')[0].value.startsWith(todayDateYYMMDD)).to.be.true;
              },
              (record) => {
                const field245 = record.get('245')[0];

                expect(field245.subf[0][0]).to.eq('a');
                expect(field245.subf[0][1]).to.eq(instance.title);
              },
              (record) => {
                verifyMarcFieldByTag(record, '999', {
                  ind1: 'f',
                  ind2: 'f',
                  subf: ['i', instance.uuid],
                });
              },
            ];

            // Additional assertions for FOLIO instances to verify Step 13 MARC mapping
            const folioInstanceAssertions = [
              // LDR positions 6 and 7
              (record) => {
                expect(record.leader).to.exist;
                expect(record.leader[6]).to.eq('a');
                expect(record.leader[7]).to.eq('m');
              },
              // 008 field publication date verification (positions 07-10)
              (record) => {
                const field008 = record.get('008');
                const publicationDate = field008[0].value.substring(7, 11);

                expect(publicationDate).to.eq('2023');
              },
              // 010 LCCN
              (record) => {
                verifyMarcFieldByTag(record, '010', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', '2025123456'],
                });
              },
              // 019 Cancelled System Control Numbers
              (record) => {
                verifyMarcFieldByTag(record, '019', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'CSC-54321'],
                });
              },
              // 020 ISBN
              (record) => {
                verifyMarcFieldByTag(record, '020', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', '978-0-12345-678-9'],
                });
              },
              // 022 ISSN
              (record) => {
                verifyMarcFieldByTag(record, '022', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', '1234-5678'],
                });
              },
              // 024 ASIN
              (record) => {
                verifyMarcFieldByTag(record, '024', {
                  ind1: '8',
                  ind2: ' ',
                  subf: ['a', 'B000123456'],
                });
              },
              // 028 Publisher or Distributor Number
              (record) => {
                verifyMarcFieldByTag(record, '028', {
                  ind1: '5',
                  ind2: '2',
                  subf: ['a', 'PDN-112233'],
                });
              },
              // 030 CODEN
              (record) => {
                verifyMarcFieldByTag(record, '030', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'ABCD1234'],
                });
              },
              // 035 System Control Number
              (record) => {
                verifyMarcFieldByTag(record, '035', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'SCN-987654'],
                });
              },
              // 088 Report number
              (record) => {
                verifyMarcFieldByTag(record, '088', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'RN-2025-001'],
                });
              },
              // 100 Contributor (Personal name, primary)
              (record) => {
                verifyMarcFieldByTag(record, '100', {
                  ind1: '1',
                  ind2: ' ',
                  subf: ['a', 'Test Author'],
                });
              },
              // 130 Uniform title alternative title
              (record) => {
                verifyMarcFieldByTag(record, '130', {
                  ind1: '0',
                  ind2: ' ',
                  subf: ['a', 'Test Uniform Title'],
                });
              },
              // 246 Variant title alternative title
              (record) => {
                verifyMarcFieldByTag(record, '246', {
                  ind1: '0',
                  ind2: ' ',
                  subf: ['a', 'Test Variant Title'],
                });
              },
              // 247 Former title alternative title
              (record) => {
                verifyMarcFieldByTag(record, '247', {
                  ind1: '0',
                  ind2: '0',
                  subf: ['a', 'Test Former Title'],
                });
              },
              // 250 Edition
              (record) => {
                verifyMarcFieldByTag(record, '250', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'First edition'],
                });
              },
              // 300 Physical description
              (record) => {
                verifyMarcFieldByTag(record, '300', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', '300 pages'],
                });
              },
              // 310 Publication frequency
              (record) => {
                verifyMarcFieldByTag(record, '310', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'Annual'],
                });
              },
              // 264 Publication field
              (record) => {
                verifyMarcFieldByTag(record, '264', {
                  ind1: ' ',
                  ind2: '1',
                  subfields: [
                    ['a', 'Test Place'],
                    ['b', 'Test Publisher'],
                    ['c', '2023'],
                  ],
                });
              },
              // 362 Publication range
              (record) => {
                verifyMarcFieldByTag(record, '362', {
                  ind1: '1',
                  ind2: ' ',
                  subf: ['a', '2020-2023'],
                });
              },
              // 490 Series
              (record) => {
                verifyMarcFieldByTag(record, '490', {
                  ind1: '0',
                  ind2: ' ',
                  subf: ['a', 'Test Series'],
                });
              },
              // 500 General note
              (record) => {
                verifyMarcFieldByTag(record, '500', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'Test general note'],
                });
              },
              // 653 Subject
              (record) => {
                verifyMarcFieldByTag(record, '653', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'Test Subject'],
                });
              },
              // 655 Nature of content
              (record) => {
                verifyMarcFieldByTag(record, '655', {
                  ind1: ' ',
                  ind2: '4',
                  subf: ['a', natureOfContentName],
                });
              },
              // 710 Corporate name contributor
              (record) => {
                verifyMarcFieldByTag(record, '710', {
                  ind1: '2',
                  ind2: ' ',
                  subf: ['a', 'Test Corporate Name'],
                });
              },
              // 711 Meeting name contributor
              (record) => {
                verifyMarcFieldByTag(record, '711', {
                  ind1: '2',
                  ind2: ' ',
                  subf: ['a', 'Test Meeting Name'],
                });
              },
              // 856 Electronic access
              (record) => {
                verifyMarcFieldByTag(record, '856', {
                  ind1: '4',
                  ind2: '0',
                  subfields: [
                    ['u', 'https://example.com'],
                    ['y', 'Test Link'],
                    ['3', 'Test Materials'],
                    ['z', 'Test Public Note'],
                  ],
                });
              },
            ];

            const recordsToVerify = allInstances.map((instance) => {
              const isPreconditionFolioInstance = instance.type === 'folio';
              const assertions = isPreconditionFolioInstance
                ? [...commonAssertions(instance), ...folioInstanceAssertions]
                : commonAssertions(instance);

              return {
                uuid: instance.uuid,
                assertions,
              };
            });

            parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);
          });
        });
      },
    );
  });
});
