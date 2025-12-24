/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES, NOTE_TYPES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verifyMarcFieldByFindingSubfield,
  verify001FieldValue,
  verify005FieldValue,
  verifyLeaderPositions,
} from '../../../support/utils/parseMrcFileContent';
import DateTools from '../../../support/utils/dateTools';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import InstanceNoteTypes from '../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import SubjectSources from '../../../support/fragments/settings/inventory/instances/subjectSources';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';

let user;
let exportedCQLFileName;
let exportedMRCFileName;
let instanceTypeId;
let locationId;
let holdingTypeId;
let sourceId;
let natureOfContentName;
const titlePrefix = `AT_C410961_${randomFourDigitNumber()}`;
const recordsCount = 6;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
];
const instances = [
  {
    title: `${titlePrefix}_Local_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'folio',
    hasHoldings: false,
  },
  {
    title: `${titlePrefix}_Local_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'marc',
    hasHoldings: false,
  },
  {
    title: `${titlePrefix}_Shared_FolioInstanceWithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
    hasHoldings: true,
  },
  {
    title: `${titlePrefix}_Shared_MarcInstanceWithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    hasHoldings: true,
  },
  {
    title: `${titlePrefix}_Shared_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
    hasHoldings: false,
  },
  {
    title: `${titlePrefix}_Shared_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    hasHoldings: false,
  },
];

function createInstance(instance) {
  cy.withinTenant(instance.affiliation, () => {
    if (instance.type === 'folio') {
      let identifierTypeIds;
      let contributorNameTypeIds;
      let generalNoteTypeId;
      let resourceUrlRelationshipId;
      let folioSubjectSourceId;
      let subjectTypeId;
      let biographyNatureOfContentId;
      let alternativeTitleTypeIds;
      let contributorTypeId;
      let multipartMonographModeOfIssuanceId;

      cy.getInstanceIdentifierTypes()
        .then(() => {
          const identifierTypes = Cypress.env('identifierTypes');
          identifierTypeIds = {
            bnb: identifierTypes.find((type) => type.name === 'BNB')?.id,
            doi: identifierTypes.find((type) => type.name === 'DOI')?.id,
            handle: identifierTypes.find((type) => type.name === 'Handle')?.id,
            localIdentifier: identifierTypes.find((type) => type.name === 'Local identifier')?.id,
            urn: identifierTypes.find((type) => type.name === 'URN')?.id,
            stEdNL: identifierTypes.find((type) => type.name === 'StEdNL')?.id,
            ukMac: identifierTypes.find((type) => type.name === 'UkMac')?.id,
            ismn: identifierTypes.find((type) => type.name === 'ISMN')?.id,
            invalidIsmn: identifierTypes.find((type) => type.name === 'Invalid ISMN')?.id,
            upc: identifierTypes.find((type) => type.name === 'UPC')?.id,
            invalidUpc: identifierTypes.find((type) => type.name === 'Invalid UPC')?.id,
            invalidIsbn: identifierTypes.find((type) => type.name === 'Invalid ISBN')?.id,
            invalidIssn: identifierTypes.find((type) => type.name === 'Invalid ISSN')?.id,
            linkingIssn: identifierTypes.find((type) => type.name === 'Linking ISSN')?.id,
            otherStandardIdentifier: identifierTypes.find(
              (type) => type.name === 'Other standard identifier',
            )?.id,
            gpoItemNumber: identifierTypes.find((type) => type.name === 'GPO item number')?.id,
            cancelledGpoItemNumber: identifierTypes.find(
              (type) => type.name === 'Cancelled GPO item number',
            )?.id,
          };
        })
        .then(() => {
          return BrowseContributors.getContributorNameTypes({
            searchParams: { limit: 50 },
          }).then((contributorNameTypes) => {
            contributorNameTypeIds = {
              personalName: contributorNameTypes.find((type) => type.name === 'Personal name')?.id,
              corporateName: contributorNameTypes.find((type) => type.name === 'Corporate name')
                ?.id,
              meetingName: contributorNameTypes.find((type) => type.name === 'Meeting name')?.id,
            };
          });
        })
        .then(() => {
          return InstanceNoteTypes.getInstanceNoteTypesViaApi({
            searchParams: { query: `name=="${NOTE_TYPES.GENERAL_NOTE}"` },
          });
        })
        .then((response) => {
          generalNoteTypeId = response.instanceNoteTypes[0]?.id;

          return UrlRelationship.getViaApi();
        })
        .then((urlRelationships) => {
          resourceUrlRelationshipId = urlRelationships.find(
            (relationship) => relationship.name === 'Resource',
          )?.id;

          return SubjectSources.getSubjectSourcesViaApi({ limit: 50 });
        })
        .then((subjectSources) => {
          folioSubjectSourceId = subjectSources.find((source) => source.name === 'FOLIO')?.id;

          return cy.getSubjectTypesViaApi({ limit: 50 });
        })
        .then((subjectTypes) => {
          subjectTypeId = subjectTypes.find((type) => type.name === 'LCSH')?.id;

          return NatureOfContent.getViaApi({ limit: 1, query: 'name=="biography"' });
        })
        .then(({ natureOfContentTerms }) => {
          const natureContent = natureOfContentTerms[0];
          biographyNatureOfContentId = natureContent?.id;
          natureOfContentName = natureContent?.name;

          return cy.getAlternativeTitlesTypes({ limit: 50 });
        })
        .then((alternativeTitleTypes) => {
          alternativeTitleTypeIds = {
            uniformTitle: alternativeTitleTypes.find((type) => type.name === 'Uniform title')?.id,
            variantTitle: alternativeTitleTypes.find((type) => type.name === 'Variant title')?.id,
            formerTitle: alternativeTitleTypes.find((type) => type.name === 'Former title')?.id,
          };

          return BrowseContributors.getContributorTypes({ limit: 50 });
        })
        .then((contributorTypes) => {
          contributorTypeId = contributorTypes.find((type) => type.name === 'Author')?.id;

          return cy.getModesOfIssuance({ query: 'name=="multipart monograph"' });
        })
        .then((modeOfIssuance) => {
          multipartMonographModeOfIssuanceId = modeOfIssuance?.id;

          const instanceData = {
            instanceTypeId,
            title: instance.title,
            identifiers: [
              { identifierTypeId: identifierTypeIds.bnb, value: 'BNB123456' },
              { identifierTypeId: identifierTypeIds.doi, value: '10.1234/test.2025' },
              { identifierTypeId: identifierTypeIds.handle, value: '20.1000/12345' },
              { identifierTypeId: identifierTypeIds.localIdentifier, value: 'LOCAL-2025-001' },
              { identifierTypeId: identifierTypeIds.urn, value: 'urn:isbn:978-3-16-148410-0' },
              { identifierTypeId: identifierTypeIds.stEdNL, value: 'STEDNL-123' },
              { identifierTypeId: identifierTypeIds.ukMac, value: 'UKMAC-456' },
              { identifierTypeId: identifierTypeIds.ismn, value: 'M-123456-78-9' },
              { identifierTypeId: identifierTypeIds.invalidIsmn, value: 'M-INVALID-123' },
              { identifierTypeId: identifierTypeIds.upc, value: '012345678905' },
              { identifierTypeId: identifierTypeIds.invalidUpc, value: 'INVALID-UPC-123' },
              { identifierTypeId: identifierTypeIds.invalidIsbn, value: 'INVALID-ISBN-123' },
              { identifierTypeId: identifierTypeIds.invalidIssn, value: 'INVALID-ISSN-123' },
              { identifierTypeId: identifierTypeIds.linkingIssn, value: '1234-567L' },
              {
                identifierTypeId: identifierTypeIds.otherStandardIdentifier,
                value: 'OTHER-STD-123',
              },
              { identifierTypeId: identifierTypeIds.gpoItemNumber, value: 'GPO-2025-001' },
              {
                identifierTypeId: identifierTypeIds.cancelledGpoItemNumber,
                value: 'CANCELLED-GPO-123',
              },
            ],
            contributors: [
              {
                contributorNameTypeId: contributorNameTypeIds.personalName,
                contributorTypeId,
                name: 'Test Author',
                primary: true,
              },
              {
                contributorNameTypeId: contributorNameTypeIds.corporateName,
                name: 'Test Corporate Name',
              },
              {
                contributorNameTypeId: contributorNameTypeIds.meetingName,
                name: 'Test Meeting Name',
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
                instanceNoteTypeId: generalNoteTypeId,
                note: 'Test general note',
                staffOnly: false,
              },
            ],
            series: [{ value: 'Test Series' }],
            subjects: [
              {
                value: 'Test Subject',
                authorityId: null,
                typeId: subjectTypeId,
                sourceId: folioSubjectSourceId,
              },
            ],
            alternativeTitles: [
              {
                alternativeTitleTypeId: alternativeTitleTypeIds.uniformTitle,
                alternativeTitle: 'Test Uniform Title',
              },
              {
                alternativeTitleTypeId: alternativeTitleTypeIds.variantTitle,
                alternativeTitle: 'Test Variant Title',
              },
              {
                alternativeTitleTypeId: alternativeTitleTypeIds.formerTitle,
                alternativeTitle: 'Test Former Title',
              },
            ],
            natureOfContentTermIds: [biographyNatureOfContentId],
            electronicAccess: [
              {
                relationshipId: resourceUrlRelationshipId,
                uri: 'https://example.com',
                linkText: 'Example Resource',
                publicNote: 'Public note',
              },
            ],
            modeOfIssuanceId: multipartMonographModeOfIssuanceId,
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
      cy.createSimpleMarcBibViaAPI(instance.title)
        .then((instanceId) => {
          instance.uuid = instanceId;
          return cy.getInstanceById(instanceId);
        })
        .then((instanceData) => {
          instance.hrid = instanceData.hrid;
          return cy.getSrsRecordsByInstanceId(instance.uuid);
        })
        .then((srsRecords) => {
          instance.srsId = srsRecords?.matchedId;
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
        });

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: userPermissions,
        }).then(() => {
          cy.withinTenant(Affiliations.College, () => {
            cy.getLocations({ limit: 1 }).then((res) => {
              locationId = res.id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              holdingTypeId = holdingTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              sourceId = folioSource.id;
            });
          });

          instances.forEach((instance) => {
            createInstance(instance);
          });

          // Add holdings to shared instances with hasHoldings = true
          instances
            .filter((instance) => instance.hasHoldings)
            .forEach((instance) => {
              cy.withinTenant(Affiliations.College, () => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  sourceId,
                  holdingsTypeId: holdingTypeId,
                  permanentLocationId: locationId,
                }).then((holding) => {
                  instance.holdings = {
                    id: holding.id,
                    hrid: holding.hrid,
                  };
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

      cy.withinTenant(Affiliations.College, () => {
        instances
          .filter((instance) => instance.hasHoldings)
          .forEach((instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings.id);
          });

        instances
          .filter((instance) => instance.affiliation === Affiliations.College)
          .forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });
      });

      cy.withinTenant(Affiliations.Consortia, () => {
        instances
          .filter((instance) => instance.affiliation === Affiliations.Consortia)
          .forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });
      });

      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(exportedCQLFileName);
      FileManager.deleteFileFromDownloadsByMask(exportedMRCFileName);
      FileManager.deleteFile(`cypress/fixtures/${exportedCQLFileName}`);
    });

    it(
      'C410961 Consortia | Verify exporting instance records with CQL query (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C410961'] },
      () => {
        // Step 1: Search instances by title prefix
        InventorySearchAndFilter.executeSearch(titlePrefix);
        InventorySearchAndFilter.verifyNumberOfSearchResults(recordsCount);

        // Step 2: Click "Actions" menu → "Save instance- CQL query" option
        InventorySearchAndFilter.saveCQLQuery();
        FileManager.findDownloadedFilesByMask('SearchInstanceCQLQuery*').then(
          (downloadedFilePathes) => {
            const lastDownloadedFilePath =
              downloadedFilePathes.sort()[downloadedFilePathes.length - 1];
            exportedCQLFileName = FileManager.getFileNameFromFilePath(lastDownloadedFilePath);
            InventoryActions.verifySaveCQLQueryFileName(exportedCQLFileName);

            // Step 3: Go to "Data export" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();

            // Step 4: Upload CQL file and select job profile
            ExportFile.moveDownloadedFileToFixtures(exportedCQLFileName);
            ExportFile.uploadFile(exportedCQLFileName);
            SelectJobProfile.verifySelectJobPane();
            SelectJobProfile.verifySubtitle();
            SelectJobProfile.verifySearchBox();
            SelectJobProfile.verifySearchButton(true);

            // Step 5: Run "Default instance export job profile"
            ExportFile.exportWithDefaultJobProfile(
              exportedCQLFileName,
              'Default instances',
              'Instances',
              '.cql',
            );

            // Step 6-8: Verify export log and download .mrc file
            cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
            cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
              const { jobExecutions } = response.body;
              const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
              const jobId = jobData.hrId;
              exportedMRCFileName = `${exportedCQLFileName.replace('.cql', '')}-${jobId}.mrc`;

              DataExportResults.verifySuccessExportResultCells(
                exportedMRCFileName,
                recordsCount,
                jobId,
                user.username,
              );

              DataExportLogs.clickButtonWithText(exportedMRCFileName);

              // Steps 9-11: Verify MARC file content
              const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();

              const commonAssertions = (instance) => [
                (record) => verify001FieldValue(record, instance.hrid),
                (record) => verify005FieldValue(record),
                (record) => {
                  expect(record.get('008')[0].value.startsWith(todayDateYYMMDD)).to.be.true;
                },
                (record) => {
                  const field245 = record.get('245')[0];

                  expect(field245.subf[0][0]).to.eq('a');
                  expect(field245.subf[0][1]).to.eq(instance.title);
                },
              ];

              const marcInstanceAssertions = (instance) => [
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
                  verifyMarcFieldByTag(record, '999', {
                    ind1: 'f',
                    ind2: 'f',
                    subfields: ['i', instance.uuid],
                  });
                },
                (record) => {
                  verifyLeaderPositions(record, {
                    5: 'n',
                    6: 'a',
                    7: 'm',
                  });
                },
                (record) => {
                  const field008 = record.get('008')[0];
                  expect(field008.value.substring(7, 11)).to.eq('2023');
                },
                (record) => {
                  verifyMarcFieldByTag(record, '020', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: ['z', 'INVALID-ISBN-123'],
                  });
                },
                (record) => {
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '022', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: [
                      ['l', '1234-567L'],
                      ['z', 'INVALID-ISSN-123'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '1',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: '012345678905',
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '1',
                    ind2: ' ',
                    findBySubfield: 'z',
                    findByValue: 'INVALID-UPC-123',
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '2',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: 'M-123456-78-9',
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '2',
                    ind2: ' ',
                    findBySubfield: 'z',
                    findByValue: 'M-INVALID-123',
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '7',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: '10.1234/test.2025',
                    subfields: [
                      ['a', '10.1234/test.2025'],
                      ['2', 'doi'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '7',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: '20.1000/12345',
                    subfields: [
                      ['a', '20.1000/12345'],
                      ['2', 'hdl'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '7',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: 'urn:isbn:978-3-16-148410-0',
                    subfields: [
                      ['a', 'urn:isbn:978-3-16-148410-0'],
                      ['2', 'urn'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '8',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: 'BNB123456',
                    subfields: [
                      ['a', 'BNB123456'],
                      ['q', 'BNB'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '8',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: 'LOCAL-2025-001',
                    subfields: [
                      ['a', 'LOCAL-2025-001'],
                      ['q', 'Local identifier'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '8',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: 'STEDNL-123',
                    subfields: [
                      ['a', 'STEDNL-123'],
                      ['q', 'StEdNL'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '8',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: 'UKMAC-456',
                    subfields: [
                      ['a', 'UKMAC-456'],
                      ['q', 'UkMac'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '024', {
                    ind1: '8',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: 'OTHER-STD-123',
                    subfields: [
                      ['a', 'OTHER-STD-123'],
                      ['q', 'Other standard identifier'],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '074', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: [
                      ['a', 'GPO-2025-001'],
                      ['z', 'CANCELLED-GPO-123'],
                    ],
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
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '856', {
                    ind1: '4',
                    ind2: '0',
                    subfields: [
                      ['u', 'https://example.com'],
                      ['y', 'Example Resource'],
                      ['z', 'Public note'],
                    ],
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

              parseMrcFileContentAndVerify(exportedMRCFileName, recordsToVerify, recordsCount);
            });
          },
        );
      },
    );
  });
});
