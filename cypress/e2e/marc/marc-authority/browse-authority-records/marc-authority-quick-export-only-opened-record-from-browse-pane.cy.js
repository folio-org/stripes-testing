import { recurse } from 'cypress-recurse';
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const casePrefix = 'C466303';
      const testData = {
        mainRecord: {
          fields: [
            {
              tag: '100',
              content: `$a ${casePrefix} Darwin, Charles, $d 1809-1882.`,
              indicators: ['1', '\\'],
            },
          ],
          authData: { prefix: casePrefix, startWithNumber: '1' },
          heading: `${casePrefix} Darwin, Charles, 1809-1882.`,
        },
        otherRecords: [
          {
            fields: [
              {
                tag: '100',
                content: `$a ${casePrefix} Curie, Marie, $d 1867-1934.`,
                indicators: ['1', '\\'],
              },
            ],
            authData: { prefix: casePrefix, startWithNumber: '2' },
            heading: `${casePrefix} Curie, Marie, 1867-1934.`,
          },
          {
            fields: [
              {
                tag: '100',
                content: `$a ${casePrefix} Tesla, Nikola, $d 1856-1943.`,
                indicators: ['1', '\\'],
              },
            ],
            authData: { prefix: casePrefix, startWithNumber: '3' },
            heading: `${casePrefix} Tesla, Nikola, 1856-1943.`,
          },
        ],
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
      };

      let mainRecordId;
      const otherRecordIds = [];
      let exportedMarcFile;
      let firstExportedCsvPath;
      const detailViewCsvName = `${casePrefix}_detailExportCSV_${randomPostfix}.csv`;
      const selectedRecordsCsvName = `${casePrefix}_selectedExportCSV_${randomPostfix}.csv`;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`${casePrefix}*`);

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          testData.userProperties = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.mainRecord.authData.prefix,
            testData.mainRecord.authData.startWithNumber,
            testData.mainRecord.fields,
          ).then((recordId) => {
            mainRecordId = recordId;
          });

          testData.otherRecords.forEach((rec, idx) => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              rec.authData.prefix,
              rec.authData.startWithNumber,
              rec.fields,
            ).then((recordId) => {
              otherRecordIds[idx] = recordId;
            });
          });

          cy.then(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(mainRecordId, true);
        otherRecordIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        Users.deleteViaApi(testData.userProperties.userId);
        FileManager.deleteFile(`cypress/fixtures/${detailViewCsvName}`);
        FileManager.deleteFile(`cypress/fixtures/${selectedRecordsCsvName}`);
        FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*.csv');
        if (exportedMarcFile) {
          FileManager.deleteFileFromDownloadsByMask(exportedMarcFile);
        }
      });

      it(
        'C466303 Only opened "MARC authority" record exported from browse result pane when other records checkboxes are checked (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466303'] },
        () => {
          // Step 1: Browse for authority records
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(testData.browseOption, casePrefix);

          // Step 2: Open detail view for the main record
          MarcAuthorities.selectIncludingTitle(testData.mainRecord.heading);
          MarcAuthority.waitLoading();

          // Step 3: Check checkboxes next to other records (not the opened one)
          testData.otherRecords.forEach((rec) => {
            MarcAuthorities.checkSelectAuthorityRecordCheckbox(rec.heading);
            MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(rec.heading, true);
          });

          // Step 4: Export from detail view (third pane) via Actions → Export (MARC)
          cy.intercept('/data-export/quick-export').as('detailViewExport');
          MarcAuthority.exportMarc();
          MarcAuthorities.verifyToastNotificationAfterExportAuthority();

          // Verify checkboxes of other records remain checked
          testData.otherRecords.forEach((rec) => {
            MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(rec.heading, true);
          });

          // Step 5: Verify the CSV contains only the opened record's UUID
          cy.wait('@detailViewExport', getLongDelay()).then(({ response }) => {
            const jobHrId = response.body.jobExecutionHrId;
            exportedMarcFile = `quick-export-${jobHrId}.mrc`;

            FileManager.findDownloadedFilesByMask('QuickAuthorityExport*.csv').then((files) => {
              firstExportedCsvPath = files.sort()[files.length - 1];
              FileManager.readFile(firstExportedCsvPath).then((actualContent) => {
                FileManager.createFile(`cypress/fixtures/${detailViewCsvName}`, actualContent);
              });
            });

            FileManager.readFile(`cypress/fixtures/${detailViewCsvName}`).then((fileContent) => {
              const cleanContent = fileContent.trim().replace(/^"|"$/g, '');
              expect(cleanContent).to.equal(mainRecordId);
            });
          });

          // Step 6: Export selected records from the result list (second pane)
          cy.intercept('/data-export/quick-export').as('selectedRecordsExport');
          MarcAuthorities.exportSelected();
          MarcAuthorities.verifyToastNotificationAfterExportAuthority();

          // Verify all checkboxes are now unchecked
          testData.otherRecords.forEach((rec) => {
            MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(rec.heading, false);
          });

          // Step 7: Verify the second CSV does NOT contain the opened record's UUID
          cy.wait('@selectedRecordsExport', getLongDelay()).then(() => {
            // Wait for a NEW csv file to appear (different from the first one)
            recurse(
              () => FileManager.findDownloadedFilesByMask('QuickAuthorityExport*.csv'),
              (files) => {
                const sorted = files.sort();
                const newest = sorted[sorted.length - 1];
                return newest !== firstExportedCsvPath;
              },
            ).then((files) => {
              const sorted = files.sort();
              const secondExportedCsvPath = sorted[sorted.length - 1];
              FileManager.readFile(secondExportedCsvPath).then((actualContent) => {
                FileManager.createFile(`cypress/fixtures/${selectedRecordsCsvName}`, actualContent);
              });
            });

            FileManager.readFile(`cypress/fixtures/${selectedRecordsCsvName}`).then(
              (fileContent) => {
                const cleanContent2 = fileContent.trim().replace(/^"|"$/g, '');
                expect(cleanContent2).to.not.include(mainRecordId);
              },
            );
          });
        },
      );
    });
  });
});
