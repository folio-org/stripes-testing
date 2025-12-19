import permissions from '../../support/dictionary/permissions';
import { APPLICATION_NAMES, NOTE_TYPES } from '../../support/constants';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../support/fragments/data-export/exportFile';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import BrowseContributors from '../../support/fragments/inventory/search/browseContributors';
import InstanceNoteTypes from '../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import UrlRelationship from '../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import SubjectSources from '../../support/fragments/settings/inventory/instances/subjectSources';
import NatureOfContent from '../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';
import DateTools from '../../support/utils/dateTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByFindingSubfield,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verify001FieldValue,
  verify005FieldValue,
  verify008FieldValue,
  verifyLeaderPositions,
} from '../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let exportedMrcFileName;
const randomPostfix = getRandomPostfix();
const testData = {
  folioInstance: {
    title: `AT_C389575_FolioInstance_${randomPostfix}`,
    uuid: null,
    hrid: null,
  },
  identifierTypes: {},
  contributorNameTypes: {},
  noteTypes: {},
  electronicAccessRelationships: {},
  subjectSourceId: null,
  subjectTypeId: null,
  natureOfContentId: null,
  natureOfContentName: null,
  alternativeTitleTypes: {},
};

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.getInstanceTypes({ query: 'name=="text"' }).then((instanceTypes) => {
        instanceTypeId = instanceTypes[0].id;
      });

      cy.getInstanceIdentifierTypes()
        .then(() => {
          const identifierTypes = Cypress.env('identifierTypes');
          testData.identifierTypes.isbn = identifierTypes.find((type) => type.name === 'ISBN').id;
          testData.identifierTypes.issn = identifierTypes.find((type) => type.name === 'ISSN').id;
          testData.identifierTypes.asin = identifierTypes.find((type) => type.name === 'ASIN').id;
          testData.identifierTypes.bnb = identifierTypes.find((type) => type.name === 'BNB')?.id;
          testData.identifierTypes.coden = identifierTypes.find((type) => type.name === 'CODEN').id;
          testData.identifierTypes.doi = identifierTypes.find((type) => type.name === 'DOI').id;
          testData.identifierTypes.handle = identifierTypes.find(
            (type) => type.name === 'Handle',
          ).id;
          testData.identifierTypes.localIdentifier = identifierTypes.find(
            (type) => type.name === 'Local identifier',
          ).id;
          testData.identifierTypes.urn = identifierTypes.find((type) => type.name === 'URN').id;
          testData.identifierTypes.lccn = identifierTypes.find((type) => type.name === 'LCCN').id;
          testData.identifierTypes.stednl = identifierTypes.find(
            (type) => type.name === 'StEdNL',
          ).id;
          testData.identifierTypes.ukmac = identifierTypes.find((type) => type.name === 'UkMac').id;
          testData.identifierTypes.reportNumber = identifierTypes.find(
            (type) => type.name === 'Report number',
          ).id;
          testData.identifierTypes.ismn = identifierTypes.find((type) => type.name === 'ISMN').id;
          testData.identifierTypes.invalidIsmn = identifierTypes.find(
            (type) => type.name === 'Invalid ISMN',
          ).id;
          testData.identifierTypes.upc = identifierTypes.find((type) => type.name === 'UPC').id;
          testData.identifierTypes.invalidUpc = identifierTypes.find(
            (type) => type.name === 'Invalid UPC',
          ).id;
          testData.identifierTypes.invalidIsbn = identifierTypes.find(
            (type) => type.name === 'Invalid ISBN',
          ).id;
          testData.identifierTypes.invalidIssn = identifierTypes.find(
            (type) => type.name === 'Invalid ISSN',
          ).id;
          testData.identifierTypes.linkingIssn = identifierTypes.find(
            (type) => type.name === 'Linking ISSN',
          ).id;
          testData.identifierTypes.otherStandardIdentifier = identifierTypes.find(
            (type) => type.name === 'Other standard identifier',
          ).id;
          testData.identifierTypes.publisherNumber = identifierTypes.find(
            (type) => type.name === 'Publisher or distributor number',
          ).id;
          testData.identifierTypes.systemControlNumber = identifierTypes.find(
            (type) => type.name === 'System control number',
          ).id;
          testData.identifierTypes.cancelledSystemControlNumber = identifierTypes.find(
            (type) => type.name === 'Cancelled system control number',
          ).id;
          testData.identifierTypes.gpoItemNumber = identifierTypes.find(
            (type) => type.name === 'GPO item number',
          ).id;
          testData.identifierTypes.cancelledGpoItemNumber = identifierTypes.find(
            (type) => type.name === 'Cancelled GPO item number',
          ).id;
        })
        .then(() => {
          return BrowseContributors.getContributorNameTypes({
            searchParams: { limit: 100 },
          }).then((contributorNameTypes) => {
            testData.contributorNameTypes.personalName = contributorNameTypes.find(
              (type) => type.name === 'Personal name',
            )?.id;
            testData.contributorNameTypes.corporateName = contributorNameTypes.find(
              (type) => type.name === 'Corporate name',
            )?.id;
            testData.contributorNameTypes.meetingName = contributorNameTypes.find(
              (type) => type.name === 'Meeting name',
            )?.id;
          });
        })
        .then(() => {
          return InstanceNoteTypes.getInstanceNoteTypesViaApi({
            searchParams: { query: `name=="${NOTE_TYPES.GENERAL}"` },
          }).then((response) => {
            testData.noteTypes.generalNote = response.instanceNoteTypes[0]?.id;
          });
        })
        .then(() => {
          return UrlRelationship.getViaApi().then((relationships) => {
            testData.electronicAccessRelationships.resource = relationships.find(
              (rel) => rel.name === 'Resource',
            );
            testData.electronicAccessRelationships.versionOfResource = relationships.find(
              (rel) => rel.name === 'Version of resource',
            );
            testData.electronicAccessRelationships.relatedResource = relationships.find(
              (rel) => rel.name === 'Related resource',
            );
            testData.electronicAccessRelationships.noInformationProvided = relationships.find(
              (rel) => rel.name === 'No information provided',
            );
          });
        })
        .then(() => {
          return cy
            .getSubjectTypesViaApi({ limit: 1, query: 'source="folio"' })
            .then((subjectTypes) => {
              testData.subjectTypeId = subjectTypes[0]?.id;
            });
        })
        .then(() => {
          return SubjectSources.getSubjectSourcesViaApi({ limit: 1 }).then((subjectSources) => {
            testData.subjectSourceId = subjectSources[0]?.id;
          });
        })
        .then(() => {
          return NatureOfContent.getViaApi({ limit: 1, query: 'name=="bibliography"' }).then(
            ({ natureOfContentTerms }) => {
              const natureContent = natureOfContentTerms[0];
              testData.natureOfContentId = natureContent?.id;
              testData.natureOfContentName = natureContent?.name;
            },
          );
        })
        .then(() => {
          return cy.getAlternativeTitlesTypes({ limit: 100 }).then((titleTypes) => {
            testData.alternativeTitleTypes.uniformTitle = titleTypes.find(
              (type) => type.name === 'Uniform title',
            );
            testData.alternativeTitleTypes.variantTitle = titleTypes.find(
              (type) => type.name === 'Variant title',
            );
            testData.alternativeTitleTypes.formerTitle = titleTypes.find(
              (type) => type.name === 'Former title',
            );
          });
        })
        .then(() => {
          return cy.getModesOfIssuance({ query: 'name=="multipart monograph"' });
        })
        .then((modeOfIssuance) => {
          const instanceData = {
            instanceTypeId,
            title: testData.folioInstance.title,
            identifiers: [
              { identifierTypeId: testData.identifierTypes.isbn, value: '978-0-12345-678-9' },
              { identifierTypeId: testData.identifierTypes.issn, value: '1234-5678' },
              { identifierTypeId: testData.identifierTypes.asin, value: 'B000TESTID' },
              { identifierTypeId: testData.identifierTypes.bnb, value: 'GBA123456' },
              { identifierTypeId: testData.identifierTypes.coden, value: 'TEST12' },
              { identifierTypeId: testData.identifierTypes.doi, value: '10.1234/test.5678' },
              { identifierTypeId: testData.identifierTypes.handle, value: '123456789/test' },
              {
                identifierTypeId: testData.identifierTypes.localIdentifier,
                value: 'LOCAL123',
              },
              { identifierTypeId: testData.identifierTypes.urn, value: 'urn:test:12345' },
              { identifierTypeId: testData.identifierTypes.lccn, value: '2025123456' },
              { identifierTypeId: testData.identifierTypes.stednl, value: 'STEDNL123' },
              { identifierTypeId: testData.identifierTypes.ukmac, value: 'UKMAC123' },
              { identifierTypeId: testData.identifierTypes.reportNumber, value: 'RN-2025-001' },
              { identifierTypeId: testData.identifierTypes.ismn, value: 'M-123456-78-9' },
              { identifierTypeId: testData.identifierTypes.invalidIsmn, value: 'M-INVALID' },
              { identifierTypeId: testData.identifierTypes.upc, value: '123456789012' },
              { identifierTypeId: testData.identifierTypes.invalidUpc, value: 'INVALID-UPC' },
              { identifierTypeId: testData.identifierTypes.invalidIsbn, value: '978-INVALID' },
              { identifierTypeId: testData.identifierTypes.invalidIssn, value: 'INVALID-ISSN' },
              { identifierTypeId: testData.identifierTypes.linkingIssn, value: '1234-567L' },
              {
                identifierTypeId: testData.identifierTypes.otherStandardIdentifier,
                value: 'OTHER-123',
              },
              { identifierTypeId: testData.identifierTypes.publisherNumber, value: 'PUB-12345' },
              {
                identifierTypeId: testData.identifierTypes.systemControlNumber,
                value: 'SCN-987654',
              },
              {
                identifierTypeId: testData.identifierTypes.cancelledSystemControlNumber,
                value: 'CSC-54321',
              },
              { identifierTypeId: testData.identifierTypes.gpoItemNumber, value: 'GPO-123' },
              {
                identifierTypeId: testData.identifierTypes.cancelledGpoItemNumber,
                value: 'CGPO-456',
              },
            ],
            contributors: [
              {
                contributorNameTypeId: testData.contributorNameTypes.personalName,
                name: 'Test, Author Primary',
                primary: true,
              },
              {
                contributorNameTypeId: testData.contributorNameTypes.personalName,
                name: 'Test, Author Secondary',
                primary: false,
              },
              {
                contributorNameTypeId: testData.contributorNameTypes.corporateName,
                name: 'Test Corporate Name',
                primary: false,
              },
              {
                contributorNameTypeId: testData.contributorNameTypes.meetingName,
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
            physicalDescriptions: ['300 pages : illustrations ; 24 cm'],
            publicationFrequency: ['Annual'],
            publicationRange: ['2020-2023'],
            notes: [
              {
                instanceNoteTypeId: testData.noteTypes.generalNote,
                note: 'Test general note for export',
                staffOnly: false,
              },
            ],
            series: [{ value: 'Test Series Title' }],
            subjects: [
              {
                value: 'Test Subject',
                sourceId: testData.subjectSourceId,
                typeId: testData.subjectTypeId,
              },
            ],
            alternativeTitles: [
              {
                alternativeTitle: 'Test Uniform Title',
                alternativeTitleTypeId: testData.alternativeTitleTypes.uniformTitle?.id,
              },
              {
                alternativeTitle: 'Test Variant Title',
                alternativeTitleTypeId: testData.alternativeTitleTypes.variantTitle?.id,
              },
              {
                alternativeTitle: 'Test Former Title',
                alternativeTitleTypeId: testData.alternativeTitleTypes.formerTitle?.id,
              },
            ],
            natureOfContentTermIds: [testData.natureOfContentId],
            electronicAccess: [
              {
                relationshipId: testData.electronicAccessRelationships.resource?.id,
                uri: 'https://example.com/resource',
                linkText: 'Resource Link text',
                materialsSpecification: 'Resource Materials specified',
                publicNote: 'Resource URL public note',
              },
              {
                relationshipId: testData.electronicAccessRelationships.versionOfResource?.id,
                uri: 'https://example.com/version',
                linkText: 'Version of resource Link text',
                materialsSpecification: 'Version of resource Materials specified',
                publicNote: 'Version of resource URL public note',
              },
              {
                relationshipId: testData.electronicAccessRelationships.relatedResource?.id,
                uri: 'https://example.com/related',
                linkText: 'Related resource Link text',
                materialsSpecification: 'Related resource Materials specified',
                publicNote: 'Related resource URL public note',
              },
              {
                relationshipId: testData.electronicAccessRelationships.noInformationProvided?.id,
                uri: 'https://example.com/other',
                linkText: 'All other URL Link text',
                materialsSpecification: 'All other URL Materials specified',
                publicNote: 'All other URL URL public note',
              },
            ],
            modeOfIssuanceId: modeOfIssuance?.id,
          };

          return InventoryInstances.createFolioInstanceViaApi({
            instance: instanceData,
          });
        })
        .then((createdInstanceData) => {
          testData.folioInstance.uuid = createdInstanceData.instanceId;
          return cy.getInstanceById(testData.folioInstance.uuid);
        })
        .then((instanceDetails) => {
          testData.folioInstance.hrid = instanceDetails.hrid;
        })
        .then(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(testData.folioInstance.uuid);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
    if (exportedMrcFileName) {
      FileManager.deleteFileFromDownloadsByMask(exportedMrcFileName);
    }
  });

  it(
    'C389575 Verify "Quick export" from instance detail view (firebird)',
    { tags: ['extendedPath', 'firebird', 'C389575'] },
    () => {
      // Step 1: Navigate to Inventory app
      InventorySearchAndFilter.waitLoading();

      // Step 2: Fill in the input field with search query
      InventorySearchAndFilter.searchInstanceByTitle(testData.folioInstance.title);

      // Step 3: Search completed and results displayed
      InventorySearchAndFilter.verifySearchResult(testData.folioInstance.title);

      // Step 4: Click on the row with the instance
      InventoryInstances.selectInstance();
      InventoryInstance.waitLoading();
      InstanceRecordView.verifyInstanceRecordViewOpened();

      // Step 5-6: Click Actions menu and export instance as MARC
      cy.intercept('/data-export/quick-export').as('quickExport');
      InstanceRecordView.exportInstanceMarc();

      // Step 6-7: Verify CSV file download and toast notification
      cy.wait('@quickExport', getLongDelay()).then((resp) => {
        const jobHrid = resp.response.body.jobExecutionHrId;
        const expectedUUIDs = resp.request.body.uuids;

        InventoryInstances.verifyToastNotificationAfterExportInstanceMarc(jobHrid);
        FileManager.verifyFile(
          InventoryActions.verifyInstancesMARCFileName,
          'QuickInstanceExport*',
          InventoryActions.verifyInstancesMARC,
          [expectedUUIDs],
        );

        // Step 8: Verify CSV file content
        ExportFile.verifyCSVFileRecordsNumber('QuickInstanceExport*.csv', 1);
      });

      // Step 9: Navigate to Data export app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
      DataExportLogs.waitLoading();

      // Step 10: Verify new export job in logs
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
      cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
        const jobId = jobData.hrId;
        exportedMrcFileName = `quick-export-${jobId}.mrc`;

        // Step 11: Download the MRC file
        DataExportResults.verifySuccessExportResultCells(
          exportedMrcFileName,
          1,
          jobId,
          user.username,
        );
        DataExportLogs.clickButtonWithText(exportedMrcFileName);

        // Step 12-13: Verify MARC record mapping
        const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();

        const marcFieldAssertions = [
          (record) => verify001FieldValue(record, testData.folioInstance.hrid),
          (record) => verify005FieldValue(record),
          (record) => {
            verify008FieldValue(record, `${todayDateYYMMDD}|2023||||||||||||       |||||und||`);
          },
          (record) => {
            verifyLeaderPositions(record, {
              6: 'a',
              7: 'm',
            });
          },
          (record) => {
            const field008 = record.get('008');
            const publicationDate = field008[0].value.substring(7, 11);

            expect(publicationDate).to.eq('2023');
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
              subfields: [
                ['a', '978-0-12345-678-9'],
                ['z', '978-INVALID'],
              ],
            });
          },
          (record) => {
            verifyMarcFieldByTag(record, '022', {
              ind1: ' ',
              ind2: ' ',
              subfields: [
                ['a', '1234-5678'],
                ['z', 'INVALID-ISSN'],
                ['l', '1234-567L'],
              ],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '1',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: '123456789012',
              subfields: [['a', '123456789012']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '1',
              ind2: ' ',
              findBySubfield: 'z',
              findByValue: 'INVALID-UPC',
              subfields: [['z', 'INVALID-UPC']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '2',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: 'M-123456-78-9',
              subfields: [['a', 'M-123456-78-9']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '2',
              ind2: ' ',
              findBySubfield: 'z',
              findByValue: 'M-INVALID',
              subfields: [['z', 'M-INVALID']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '7',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: '10.1234/test.5678',
              subfields: [['a', '10.1234/test.5678']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '7',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: '123456789/test',
              subfields: [['a', '123456789/test']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '7',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: 'urn:test:12345',
              subfields: [['a', 'urn:test:12345']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '8',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: 'B000TESTID',
              subfields: [['a', 'B000TESTID']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '8',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: 'GBA123456',
              subfields: [['a', 'GBA123456']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '8',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: 'LOCAL123',
              subfields: [['a', 'LOCAL123']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '8',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: 'STEDNL123',
              subfields: [['a', 'STEDNL123']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '8',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: 'UKMAC123',
              subfields: [['a', 'UKMAC123']],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '024', {
              ind1: '8',
              ind2: ' ',
              findBySubfield: 'a',
              findByValue: 'OTHER-123',
              subfields: [['a', 'OTHER-123']],
            });
          },
          (record) => {
            verifyMarcFieldByTag(record, '028', {
              ind1: '5',
              ind2: '2',
              subfields: ['a', 'PUB-12345'],
            });
          },
          (record) => {
            verifyMarcFieldByTag(record, '030', {
              ind1: ' ',
              ind2: ' ',
              subfields: ['a', 'TEST12'],
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
            verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '074', {
              ind1: ' ',
              ind2: ' ',
              subfields: [
                ['a', 'GPO-123'],
                ['z', 'CGPO-456'],
              ],
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
              subfields: ['a', 'Test, Author Primary'],
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
            verifyMarcFieldByTag(record, '245', {
              ind1: '0',
              ind2: '0',
              subfields: ['a', testData.folioInstance.title],
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
            verifyMarcFieldByTag(record, '300', {
              ind1: ' ',
              ind2: ' ',
              subfields: ['a', '300 pages : illustrations ; 24 cm'],
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
              subfields: ['a', 'Test Series Title'],
            });
          },
          (record) => {
            verifyMarcFieldByTag(record, '500', {
              ind1: ' ',
              ind2: ' ',
              subfields: ['a', 'Test general note for export'],
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
              subfields: ['a', testData.natureOfContentName],
            });
          },
          (record) => {
            verifyMarcFieldByTag(record, '700', {
              ind1: '1',
              ind2: ' ',
              subfields: ['a', 'Test, Author Secondary'],
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
            verifyMarcFieldByFindingSubfield(record, '856', {
              ind1: '4',
              ind2: '0',
              findBySubfield: 'u',
              findByValue: 'https://example.com/resource',
              subfields: [
                ['u', 'https://example.com/resource'],
                ['y', 'Resource Link text'],
                ['z', 'Resource URL public note'],
                ['3', 'Resource Materials specified'],
              ],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '856', {
              ind1: '4',
              ind2: '1',
              findBySubfield: 'u',
              findByValue: 'https://example.com/version',
              subfields: [
                ['u', 'https://example.com/version'],
                ['y', 'Version of resource Link text'],
                ['z', 'Version of resource URL public note'],
                ['3', 'Version of resource Materials specified'],
              ],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '856', {
              ind1: '4',
              ind2: '2',
              findBySubfield: 'u',
              findByValue: 'https://example.com/related',
              subfields: [
                ['u', 'https://example.com/related'],
                ['y', 'Related resource Link text'],
                ['z', 'Related resource URL public note'],
                ['3', 'Related resource Materials specified'],
              ],
            });
          },
          (record) => {
            verifyMarcFieldByFindingSubfield(record, '856', {
              ind1: '4',
              ind2: ' ',
              findBySubfield: 'u',
              findByValue: 'https://example.com/other',
              subfields: [
                ['u', 'https://example.com/other'],
                ['y', 'All other URL Link text'],
                ['z', 'All other URL URL public note'],
                ['3', 'All other URL Materials specified'],
              ],
            });
          },
          (record) => {
            verifyMarcFieldByTag(record, '999', {
              ind1: 'f',
              ind2: 'f',
              subfields: ['i', testData.folioInstance.uuid],
            });
          },
        ];

        parseMrcFileContentAndVerify(
          exportedMrcFileName,
          [
            {
              uuid: testData.folioInstance.uuid,
              assertions: marcFieldAssertions,
            },
          ],
          1,
        );
      });
    },
  );
});
