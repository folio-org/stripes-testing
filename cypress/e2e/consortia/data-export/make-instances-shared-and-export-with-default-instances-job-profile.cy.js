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
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
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
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verify001FieldValue,
  verify008FieldValue,
} from '../../../support/utils/parseMrcFileContent';
import DateTools from '../../../support/utils/dateTools';

let user;
let exportedFileName;
let instanceTypeId;
let natureOfContentName;
const recordsCount = 2;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
];
const instances = [
  {
    title: `AT_C407645_Local_FolioInstance_${getRandomPostfix()}`,
    type: 'folio',
  },
  {
    title: `AT_C407645_Local_MarcInstance_${getRandomPostfix()}`,
    type: 'marc',
  },
];
const instanceUUIDsFileName = `AT_C407645_instanceUUIDs_${getRandomPostfix()}.csv`;

function createInstance(instance) {
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
          retrievedData.resourceRelationship = relationships.find((rel) => rel.name === 'Resource');
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
          retrievedData.uniformTitleType = titleTypes.find((type) => type.name === 'Uniform title');
          retrievedData.variantTitleType = titleTypes.find((type) => type.name === 'Variant title');
          retrievedData.formerTitleType = titleTypes.find((type) => type.name === 'Former title');
        });
      })
      .then(() => {
        return cy.getModesOfIssuance({ query: 'name=="multipart monograph"' });
      })
      .then((modeOfIssuance) => {
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
      // Get SRS ID for MARC instance
      cy.getSrsRecordsByInstanceId(instances[1].uuid).then((srsRecords) => {
        instances[1].srsId = srsRecords?.matchedId;
      });
    });
  }
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
            cy.withinTenant(Affiliations.College, () => {
              instances.forEach((instance) => {
                createInstance(instance);
              });
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
      cy.withinTenant(Affiliations.Consortia, () => {
        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C407645 Consortia | Make instances shared and export with Default instances job profile (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C407645'] },
      () => {
        // Step 1-2: Search for local instances from preconditions and share them to central tenant
        InventorySearchAndFilter.clearDefaultFilter('Held by');
        InventoryInstances.searchByTitle(instances[0].title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(instances[0].title);
        InventoryInstance.shareInstance();
        InventoryInstance.verifyCalloutMessage(
          `Local instance ${instances[0].title} has been successfully shared`,
        );
        InventoryInstance.checkSharedTextInDetailView();
        InventoryInstance.getAssignedHRID().then((updatedHrid) => {
          expect(updatedHrid.toLowerCase().startsWith(tenantCodes.central.toLowerCase())).to.be
            .true;
          instances[0].hrid = updatedHrid;
        });

        InventoryInstances.searchByTitle(instances[1].title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(instances[1].title);
        InventoryInstance.shareInstance();
        InventoryInstance.verifyCalloutMessage(
          `Local instance ${instances[1].title} has been successfully shared`,
        );
        InventoryInstance.checkSharedTextInDetailView();
        InventoryInstance.getAssignedHRID().then((updatedHrid) => {
          expect(updatedHrid.toLowerCase().startsWith(tenantCodes.central.toLowerCase())).to.be
            .true;
          instances[1].hrid = updatedHrid;

          // Step 3: Go to the "Data export" app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();

          // Create CSV file with both shared instance UUIDs
          const uuids = instances.map((instance) => instance.uuid).join('\n');

          FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, uuids);

          // Step 4: Trigger the data export by clicking on the "or choose file" button and submitting .csv file
          ExportFileHelper.uploadFile(instanceUUIDsFileName);

          // Step 5: Run the "Default instance export job profile"
          ExportFileHelper.exportWithDefaultJobProfile(instanceUUIDsFileName);

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const jobId = jobData.hrId;
            exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

            // Step 6: Download the recently created file
            DataExportResults.verifySuccessExportResultCells(
              exportedFileName,
              recordsCount,
              jobId,
              user.username,
            );
            DataExportLogs.clickButtonWithText(exportedFileName);

            // Steps 7-10: Verify the downloaded .mrc file includes both shared instances
            const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();
            const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();

            const commonAssertions = (instance) => [
              (record) => verify001FieldValue(record, instance.hrid),
              (record) => {
                expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
              },
            ];

            const marcInstanceAssertions = (instance) => [
              (record) => {
                expect(record.leader).to.exist;
                expect(record.leader[5]).to.eq('n');
                expect(record.leader[6]).to.eq('a');
                expect(record.leader[7]).to.eq('a');
              },
              (record) => {
                verify008FieldValue(record, `${todayDateYYMMDD}                                  `);
              },
              (record) => {
                verifyMarcFieldByTag(record, '245', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', instance.title],
                });
              },
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '999', {
                  ind1: 'f',
                  ind2: 'f',
                  subfields: [
                    ['i', instance.uuid],
                    ['s', instance.srsId],
                  ],
                });
              },
            ];

            const folioInstanceAssertions = (instance) => [
              (record) => {
                expect(record.leader).to.exist;
                expect(record.leader[5]).to.eq('n');
                expect(record.leader[6]).to.eq('a');
                expect(record.leader[7]).to.eq('m');
              },
              (record) => {
                verify008FieldValue(record, `${todayDateYYMMDD}|2023||||||||||||       |||||und||`);
              },
              (record) => {
                verifyMarcFieldByTag(record, '010', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', '2025123456'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '019', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', 'CSC-54321'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '020', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', '978-0-12345-678-9'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '022', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', '1234-5678'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '024', {
                  ind1: '8',
                  ind2: ' ',
                  subfields: ['a', 'B000123456'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '028', {
                  ind1: '5',
                  ind2: '2',
                  subfields: ['a', 'PDN-112233'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '030', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', 'ABCD1234'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '035', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', 'SCN-987654'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '088', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', 'RN-2025-001'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '100', {
                  ind1: '1',
                  ind2: ' ',
                  subfields: ['a', 'Test Author'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '130', {
                  ind1: '0',
                  ind2: ' ',
                  subfields: ['a', 'Test Uniform Title'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '246', {
                  ind1: '0',
                  ind2: ' ',
                  subfields: ['a', 'Test Variant Title'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '247', {
                  ind1: '0',
                  ind2: '0',
                  subfields: ['a', 'Test Former Title'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '250', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', 'First edition'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '300', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', '300 pages'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '310', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', 'Annual'],
                });
              },
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '264', {
                  ind1: ' ',
                  ind2: '1',
                  subfields: [
                    ['a', 'Test Place'],
                    ['b', 'Test Publisher'],
                    ['c', '2023'],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '362', {
                  ind1: '1',
                  ind2: ' ',
                  subfields: ['a', '2020-2023'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '490', {
                  ind1: '0',
                  ind2: ' ',
                  subfields: ['a', 'Test Series'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '500', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', 'Test general note'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '653', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: ['a', 'Test Subject'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '655', {
                  ind1: ' ',
                  ind2: '4',
                  subfields: ['a', natureOfContentName],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '710', {
                  ind1: '2',
                  ind2: ' ',
                  subfields: ['a', 'Test Corporate Name'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '711', {
                  ind1: '2',
                  ind2: ' ',
                  subfields: ['a', 'Test Meeting Name'],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '245', {
                  ind1: '0',
                  ind2: '0',
                  subfields: ['a', instance.title],
                });
              },
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '856', {
                  ind1: '4',
                  ind2: '0',
                  subfields: [
                    ['u', 'https://example.com'],
                    ['y', 'Test Link'],
                    ['z', 'Test Public Note'],
                    ['3', 'Test Materials'],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '999', {
                  ind1: 'f',
                  ind2: 'f',
                  subfields: ['i', instance.uuid],
                });
              },
            ];

            const recordsToVerify = instances.map((instance) => {
              const isFolioInstance = instance.type === 'folio';
              const assertions = isFolioInstance
                ? [...commonAssertions(instance), ...folioInstanceAssertions(instance)]
                : [...commonAssertions(instance), ...marcInstanceAssertions(instance)];

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
