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
let exportedCSVFileName;
let exportedMRCFileName;
let instanceTypeId;
let locationId;
let holdingTypeId;
let sourceId;
let natureOfContentName;
const titlePrefix = `AT_C411285_${randomFourDigitNumber()}`;
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
            isbn: identifierTypes.find((type) => type.name === 'ISBN')?.id,
            issn: identifierTypes.find((type) => type.name === 'ISSN')?.id,
            asin: identifierTypes.find((type) => type.name === 'ASIN')?.id,
            coden: identifierTypes.find((type) => type.name === 'CODEN')?.id,
            lccn: identifierTypes.find((type) => type.name === 'LCCN')?.id,
            reportNumber: identifierTypes.find((type) => type.name === 'Report number')?.id,
            systemControlNumber: identifierTypes.find(
              (type) => type.name === 'System control number',
            )?.id,
            cancelledSystemControlNumber: identifierTypes.find(
              (type) => type.name === 'Cancelled system control number',
            )?.id,
            publisherNumber: identifierTypes.find(
              (type) => type.name === 'Publisher or distributor number',
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
              { identifierTypeId: identifierTypeIds.isbn, value: '978-0-12345-678-9' },
              { identifierTypeId: identifierTypeIds.issn, value: '1234-5678' },
              { identifierTypeId: identifierTypeIds.asin, value: 'B000123456' },
              { identifierTypeId: identifierTypeIds.coden, value: 'ABCD1234' },
              { identifierTypeId: identifierTypeIds.lccn, value: '2025123456' },
              { identifierTypeId: identifierTypeIds.reportNumber, value: 'RN-2025-001' },
              { identifierTypeId: identifierTypeIds.systemControlNumber, value: 'SCN-987654' },
              {
                identifierTypeId: identifierTypeIds.cancelledSystemControlNumber,
                value: 'CSC-54321',
              },
              { identifierTypeId: identifierTypeIds.publisherNumber, value: 'PDN-112233' },
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
      FileManager.deleteFileFromDownloadsByMask(exportedCSVFileName);
      FileManager.deleteFileFromDownloadsByMask(exportedMRCFileName);
      FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
    });

    it(
      'C411285 Consortia | Verify "Quick export" shared and local instances from Member tenant (consortia) (firebird)',
      { tags: ['smokeECS', 'firebird', 'C411285'] },
      () => {
        // Step 1-2: Search instances by title prefix and select all
        InventorySearchAndFilter.clearDefaultFilter('Held by');
        InventorySearchAndFilter.executeSearch(titlePrefix);
        InventorySearchAndFilter.verifyNumberOfSearchResults(recordsCount);
        InventoryInstances.clickSelectAllInstancesCheckbox();
        InventoryInstances.verifySelectAllInstancesCheckbox(true);

        // Step 3-4: Click "Actions" → "Export instances (MARC)"
        cy.intercept('/data-export/quick-export').as('getIds');
        InventorySearchAndFilter.exportInstanceAsMarc();

        // Step 5: Verify CSV file download with correct naming and UUIDs
        cy.wait('@getIds', getLongDelay()).then((req) => {
          const expectedIDs = req.request.body.uuids;

          FileManager.verifyFile(
            InventoryActions.verifyInstancesMARCFileName,
            'QuickInstanceExport*',
            InventoryActions.verifyInstancesMARC,
            [expectedIDs],
          );

          FileManager.findDownloadedFilesByMask('QuickInstanceExport*').then((foundFiles) => {
            exportedCSVFileName = foundFiles[0];
          });
        });

        // Step 6: Go to "Data export" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();

        // Step 7-8: Verify export log and download .mrc file
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedMRCFileName = `quick-export-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedMRCFileName,
            recordsCount,
            jobId,
            user.username,
          );

          DataExportLogs.clickButtonWithText(exportedMRCFileName);

          // Steps 9-12: Verify MARC file content
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
  });
});
