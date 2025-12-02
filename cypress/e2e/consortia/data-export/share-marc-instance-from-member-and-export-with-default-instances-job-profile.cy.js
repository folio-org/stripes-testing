/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verify001FieldValue,
  verify008FieldValue,
  verifyLeaderPositions,
} from '../../../support/utils/parseMrcFileContent';
import DateTools from '../../../support/utils/dateTools';

let user;
let exportedFileName;
const recordsCount = 1;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
];
const marcFileName = 'marcBibFileForC407646.mrc';
const uploadFileName = `AT_C407646_${getRandomPostfix()}.mrc`;
const instanceUUIDsFileName = `AT_C407646_instanceUUIDs_${getRandomPostfix()}.csv`;
const marcInstance = {
  title: 'AT_C407646_ImportedMarcInstance.',
};

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(userPermissions).then((userProperties) => {
        user = userProperties;

        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407646');

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [...userPermissions, permissions.consortiaInventoryShareLocalInstance.gui],
        }).then(() => {
          cy.withinTenant(Affiliations.College, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407646');

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
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C407646 Consortia | Share MARC instance from member and export with Default instances job profile (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C407646'] },
      () => {
        // Step 1-5: Implemented via API calls in the "before" hook
        // Step 6: Find the imported MARC instance from preconditions
        InventorySearchAndFilter.clearDefaultFilter('Held by');
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(marcInstance.title);

        // Step 7: Share the local MARC instance to central tenant
        InventoryInstance.shareInstance();
        InventoryInstance.verifyCalloutMessage(
          `Local instance ${marcInstance.title} has been successfully shared`,
        );
        InventoryInstance.checkSharedTextInDetailView();
        InventoryInstance.getAssignedHRID().then((updatedHrid) => {
          expect(updatedHrid.toLowerCase().startsWith(tenantCodes.central.toLowerCase())).to.be
            .true;
          marcInstance.hrid = updatedHrid;

          // Step 8: Go to the "Data export" app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();

          // Create CSV file with instance UUID
          FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, marcInstance.uuid);

          // Step 9: Trigger the data export by uploading .csv file
          ExportFileHelper.uploadFile(instanceUUIDsFileName);

          // Step 10: Run the "Default instance export job profile"
          ExportFileHelper.exportWithDefaultJobProfile(instanceUUIDsFileName);

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const jobId = jobData.hrId;
            exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

            // Step 11: Download the recently created file
            DataExportResults.verifySuccessExportResultCells(
              exportedFileName,
              recordsCount,
              jobId,
              user.username,
            );
            DataExportLogs.clickButtonWithText(exportedFileName);

            // Steps 12-13: Verify the downloaded .mrc file
            const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();

            const marcInstanceAssertions = [
              (record) => verify001FieldValue(record, marcInstance.hrid),
              (record) => {
                expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
              },
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

            const recordsToVerify = [
              {
                uuid: marcInstance.uuid,
                assertions: marcInstanceAssertions,
              },
            ];

            parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);
          });
        });
      },
    );
  });
});
