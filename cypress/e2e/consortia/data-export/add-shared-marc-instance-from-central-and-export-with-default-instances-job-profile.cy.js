import permissions from '../../../support/dictionary/permissions';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verify001FieldValue,
  verify005FieldValue,
  verify008FieldValue,
  verifyLeaderPositions,
} from '../../../support/utils/parseMrcFileContent';
import DateTools from '../../../support/utils/dateTools';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';

let user;
let exportedFileName;
const recordsCount = 5;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
  permissions.dataImportUploadAll.gui,
];
const marcFileName = 'marcBibFileForC407647.mrc';
const uploadFileName = `AT_C407647_${getRandomPostfix()}.mrc`;
const instanceUUIDsFileName = `AT_C407647_instanceUUIDs_${getRandomPostfix()}.csv`;
const instances = [
  {
    title: `AT_C407647_Local_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'folio',
  },
  {
    title: `AT_C407647_Local_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'marc',
  },
  {
    title: `AT_C407647_Shared_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
  },
  {
    title: `AT_C407647_Shared_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
  },
];
const marcInstance = {
  title: 'AT_C407647_ImportedMarcInstance.',
};

function createInstance(instance, instanceTypeId) {
  cy.withinTenant(instance.affiliation, () => {
    if (instance.type === 'folio') {
      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId,
          title: instance.title,
        },
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

        cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
          instance.srsId = srsRecords?.matchedId;
        });
      });
    }
  });
}

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407647');

      cy.createTempUser(userPermissions).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: userPermissions,
        }).then(() => {
          cy.getInstanceTypes({ query: 'name=="text"' })
            .then((instanceTypes) => {
              const instanceTypeId = instanceTypes[0].id;

              instances.forEach((instance) => {
                createInstance(instance, instanceTypeId);
              });
            })
            .then(() => {
              // Add holdings to shared instances in College tenant
              cy.withinTenant(Affiliations.College, () => {
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  const sourceId = folioSource.id;

                  cy.getLocations({ limit: 1 }).then((res) => {
                    const locationId = res.id;

                    const sharedInstances = instances.filter(
                      (instance) => instance.affiliation === Affiliations.Consortia,
                    );

                    sharedInstances.forEach((instance) => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: instance.uuid,
                        permanentLocationId: locationId,
                        sourceId,
                      }).then((holding) => {
                        instance.holdingId = holding.id;
                      });
                    });
                  });
                });
              });

              DataImport.uploadFileViaApi(
                marcFileName,
                uploadFileName,
                DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
              ).then((response) => {
                marcInstance.uuid = response[0].instance.id;
                marcInstance.hrid = response[0].instance.hrid;

                cy.getSrsRecordsByInstanceId(marcInstance.uuid).then((srsRecords) => {
                  marcInstance.srsId = srsRecords?.matchedId;
                });
              });

              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            });
        });
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        cy.deleteHoldingRecordViaApi(marcInstance.holdingId);

        const sharedInstances = instances.filter(
          (instance) => instance.affiliation === Affiliations.Consortia,
        );

        sharedInstances.forEach((instance) => {
          if (instance.holdingId) {
            cy.deleteHoldingRecordViaApi(instance.holdingId);
          }
        });

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

        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C407647 Consortia | Add shared MARC instance from central tenant and export with Default instances job profile (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C407647'] },
      () => {
        // Step 1-6: Implemented via API calls in the "before" hook
        // Step 7: Find the shared MARC instance from central tenant
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(marcInstance.title);
        InventoryInstance.checkSharedTextInDetailView();

        // Step 8: Add holdings to the shared MARC instance
        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.fillHoldingFields({
          permanentLocation: LOCATION_NAMES.ANNEX,
        });
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();

        cy.location('href').then((fullUrl) => {
          const holdingMatch = fullUrl.match(/\/inventory\/view\/[a-f0-9-]+\/([a-f0-9-]+)/);
          marcInstance.holdingId = holdingMatch[1];
        });

        InventoryInstance.closeHoldingsView();
        InventoryInstance.waitLoading();

        // Step 9: Go to the "Data export" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();

        // Create CSV file with all instance UUIDs (precondition instances + newly created)
        const allInstances = [...instances];
        allInstances.push({
          uuid: marcInstance.uuid,
          hrid: marcInstance.hrid,
          title: marcInstance.title,
        });

        const uuids = allInstances.map((instance) => instance.uuid).join('\n');

        FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, uuids);

        // Step 10: Trigger the data export by uploading .csv file
        ExportFileHelper.uploadFile(instanceUUIDsFileName);

        // Step 11: Run the "Default instance export job profile"
        ExportFileHelper.exportWithDefaultJobProfile(instanceUUIDsFileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          // Step 12: Download the recently created file
          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            jobId,
            user.username,
          );
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Steps 13-15: Verify the downloaded .mrc file includes all instances
          const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();

          // Assertions for FOLIO instances (local and shared)
          const folioInstanceAssertions = (instance) => [
            (record) => verify001FieldValue(record, instance.hrid),
            (record) => verify005FieldValue(record),
            (record) => {
              verifyLeaderPositions(record, {
                5: 'n',
                6: 'a',
                7: 'm',
              });
            },
            (record) => {
              verify008FieldValue(record, `${todayDateYYMMDD}|||||||||||||||||       |||||und||`);
            },
            (record) => {
              verifyMarcFieldByTag(record, '245', {
                ind1: '0',
                ind2: '0',
                subfields: ['a', instance.title],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '336', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'text'],
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

          // Assertions for MARC instances created via API (local and shared, excluding imported)
          const marcBibInstanceAssertions = (instance) => [
            (record) => verify001FieldValue(record, instance.hrid),
            (record) => verify005FieldValue(record),
            (record) => {
              verifyLeaderPositions(record, {
                5: 'n',
                6: 'a',
                7: 'a',
              });
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

          // Assertions for imported MARC instance
          const importedMarcInstanceAssertions = [
            (record) => verify001FieldValue(record, marcInstance.hrid),
            (record) => verify005FieldValue(record),
            (record) => {
              verifyLeaderPositions(record, {
                5: 'c',
                6: 'g',
                7: 'm',
              });
            },
            (record) => {
              verify008FieldValue(record, '130502s2013    xxu050            vleng d');
            },
            (record) => {
              const field007 = record.get('007');

              expect(field007[0].value).to.eq('vd cvaizq');
            },
            (record) => {
              verifyMarcFieldByTag(record, '024', {
                ind1: '1',
                ind2: ' ',
                subfields: ['a', '883929341139'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '028', {
                ind1: '4',
                ind2: '2',
                subfields: [
                  ['a', '1000403458'],
                  ['b', 'Warner Bros Ent. Canada Inc.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '037', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['b', 'Midwest Tape'],
                  ['n', 'http://www.midwesttapes.com'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '040', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'TEFMT'],
                  ['b', 'eng'],
                  ['e', 'rda'],
                  ['c', 'TEFMT'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '041', {
                ind1: '0',
                ind2: ' ',
                subfields: [
                  ['a', 'eng'],
                  ['j', 'eng'],
                  ['h', 'eng'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '043', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'e-uk---'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '046', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['k', '2011'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '050', {
                ind1: ' ',
                ind2: '4',
                subfields: [
                  ['a', 'DA112'],
                  ['b', '.C67 2013'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '082', {
                ind1: '0',
                ind2: '4',
                subfields: [
                  ['a', '941.085'],
                  ['2', '23'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '245', {
                ind1: '0',
                ind2: '4',
                subfields: ['a', marcInstance.title],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '257', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'United Kingdom.'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '264', {
                ind1: ' ',
                ind2: '2',
                subfields: [
                  ['a', 'Burbank, CA :'],
                  ['b', 'Distributed in the USA by Warner Home Video,'],
                  ['c', '[2013]'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '300', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', '1 videodisc (50 min.) :'],
                  ['b', 'sound, color with black and white sequences ;'],
                  ['c', '4 3/4 in. +'],
                  ['e', '1 booklet (23 cm).'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '336', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'two-dimensional moving image'],
                  ['b', 'tdi'],
                  ['2', 'rdacontent'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '337', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'video'],
                  ['b', 'v'],
                  ['2', 'rdamedia'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '338', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'videodisc'],
                  ['b', 'vd'],
                  ['2', 'rdacarrier'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '344', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'digital'],
                  ['b', 'optical'],
                  ['g', 'stereo'],
                  ['h', 'Dolby digital stereo'],
                  ['2', 'rda'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '346', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'laser optical'],
                  ['b', 'NTSC'],
                  ['2', 'rda'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '347', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  ['a', 'video file'],
                  ['b', 'DVD video'],
                  ['e', 'region 1'],
                  ['2', 'rda'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '490', {
                ind1: '1',
                ind2: ' ',
                subfields: [
                  ['a', 'Royal collection ;'],
                  ['v', '[3]'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '500', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'Title from web page.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '508', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'Prducer/director, Jamie Muir ; narrator, Tamsin Greig.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '511', {
                ind1: '0',
                ind2: ' ',
                subfields: ['a', 'Queen Elizabeth II.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '520', {
                ind1: ' ',
                ind2: ' ',
                subfields: [
                  'a',
                  'The coronation of Elizabeth II was an enormous logistical operation, and an event of huge cultural significance. Now, using hitherto unseen archives and with co-operation of the Palace, the diaries and papers of those at the heart of the planning are opened up to reveal the behind the scenes story of the Coronation.',
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '538', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'DVD, widescreen (16x9) presentation; stereo.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '546', {
                ind1: ' ',
                ind2: ' ',
                subfields: ['a', 'English SDH subtitles.'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '600', {
                ind1: '0',
                ind2: '0',
                subfields: [
                  ['a', 'Elizabeth'],
                  ['b', 'II,'],
                  ['c', 'Queen of Great Britain,'],
                  ['d', '1926-2022'],
                  ['x', 'Coronation.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '648', {
                ind1: ' ',
                ind2: '7',
                subfields: [
                  ['a', 'Since 1900'],
                  ['2', 'fast'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '650', {
                ind1: ' ',
                ind2: '0',
                subfields: [
                  ['a', 'Coronations'],
                  ['z', 'Great Britain'],
                  ['x', 'History'],
                  ['y', '20th century.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '651', {
                ind1: ' ',
                ind2: '0',
                subfields: [
                  ['a', 'Great Britain'],
                  ['x', 'Kings and rulers'],
                  ['v', 'Biography.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '655', {
                ind1: ' ',
                ind2: '2',
                subfields: ['a', 'Documentaries and Factual Films'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '700', {
                ind1: '1',
                ind2: ' ',
                subfields: ['a', 'Muir, Jamie.'],
              });
            },
            (record) => {
              verifyMarcFieldByTag(record, '710', {
                ind1: '2',
                ind2: ' ',
                subfields: ['a', 'British Broadcasting Corporation.'],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '830', {
                ind1: ' ',
                ind2: '0',
                subfields: [
                  ['a', 'Royal collection ;'],
                  ['v', '3.'],
                ],
              });
            },
            (record) => {
              verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '999', {
                ind1: 'f',
                ind2: 'f',
                subfields: [
                  ['i', marcInstance.uuid],
                  ['s', marcInstance.srsId],
                ],
              });
            },
          ];

          const recordsToVerify = allInstances.map((instance) => {
            const isImportedMarcInstance = instance.uuid === marcInstance.uuid;
            let assertions;

            if (isImportedMarcInstance) {
              // Use detailed assertions for the imported MARC instance
              assertions = importedMarcInstanceAssertions;
            } else if (instance.type === 'folio') {
              // Use FOLIO instance assertions for FOLIO instances
              assertions = folioInstanceAssertions(instance);
            } else if (instance.type === 'marc') {
              // Use MARC bib instance assertions for API-created MARC instances
              assertions = marcBibInstanceAssertions(instance);
            }

            return {
              uuid: instance.uuid,
              assertions,
            };
          });

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);
        });
      },
    );
  });
});
