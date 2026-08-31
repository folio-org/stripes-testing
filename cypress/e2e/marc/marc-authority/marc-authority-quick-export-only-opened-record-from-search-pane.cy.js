import { recurse } from 'cypress-recurse';
import { getLongDelay } from '../../../support/utils/cypressTools';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Result list / sorting', () => {
      describe('Export records', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(20);
        const authorityHeadingPrefix = `AT_C466302_MarcAuthority_${randomPostfix}`;
        const testData = {
          authorityRecords: [
            {
              heading: `${authorityHeadingPrefix}_Main`,
              authData: { prefix: randomLetters, startWithNumber: '1' },
            },
            {
              heading: `${authorityHeadingPrefix}_2`,
              authData: { prefix: randomLetters, startWithNumber: '2' },
            },
            {
              heading: `${authorityHeadingPrefix}_3`,
              authData: { prefix: randomLetters, startWithNumber: '3' },
            },
          ],
        };

        const authorityIds = [];
        let exportedMarcFile;
        let firstExportedCsvPath;
        const detailViewCsvName = `AT_C466302_detailExportCSV_${randomPostfix}.csv`;
        const selectedRecordsCsvName = `AT_C466302_selectedExportCSV_${randomPostfix}.csv`;

        before('Create user and test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C466302_');

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ])
            .then((userProperties) => {
              testData.userProperties = userProperties;

              testData.authorityRecords.forEach((rec, idx) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  rec.authData.prefix,
                  rec.authData.startWithNumber,
                  [
                    {
                      tag: '100',
                      content: `$a ${rec.heading}`,
                      indicators: ['\\', '\\'],
                    },
                  ],
                ).then((recordId) => {
                  authorityIds[idx] = recordId;
                });
              });
            })
            .then(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
          Users.deleteViaApi(testData.userProperties.userId);
          FileManager.deleteFile(`cypress/fixtures/${detailViewCsvName}`);
          FileManager.deleteFile(`cypress/fixtures/${selectedRecordsCsvName}`);
          FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*.csv');
          if (exportedMarcFile) {
            FileManager.deleteFileFromDownloadsByMask(exportedMarcFile);
          }
          FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*.csv');
        });

        it(
          'C466302 Only opened "MARC authority" record exported from search result pane when other records checkboxes are checked (promin)',
          { tags: ['extendedPath', 'promin', 'C466302'] },
          () => {
            // Step 1: Search with prefix → all created records found
            MarcAuthorities.searchBeats(authorityHeadingPrefix);

            // Step 2: Click main record heading → detail view opens in third pane
            MarcAuthorities.selectTitle(testData.authorityRecords[0].heading);
            MarcAuthority.waitLoading();

            // Step 3: Check checkboxes of other records (not the opened one)
            testData.authorityRecords.slice(1).forEach((rec) => {
              MarcAuthorities.checkSelectAuthorityRecordCheckbox(rec.heading);
              MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(rec.heading, true);
            });

            // Step 4: Export from detail view (third pane) via Actions → Export (MARC)
            cy.intercept('/data-export/quick-export').as('detailViewExport');
            MarcAuthority.exportMarc();
            MarcAuthorities.verifyToastNotificationAfterExportAuthority();

            // Verify checkboxes of other records remain checked after detail view export
            testData.authorityRecords.slice(1).forEach((rec) => {
              MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(rec.heading, true);
            });

            // Step 5: Verify CSV contains only the opened record's UUID (not the checked records)
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
                expect(cleanContent).to.equal(authorityIds[0]);
              });
            });

            // Step 6: Export selected records from the result list (second pane)
            cy.intercept('/data-export/quick-export').as('selectedRecordsExport');
            MarcAuthorities.exportSelected();
            MarcAuthorities.verifyToastNotificationAfterExportAuthority();

            // Verify all checkboxes are now unchecked after selected export
            testData.authorityRecords.slice(1).forEach((rec) => {
              MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(rec.heading, false);
            });

            // Step 7: Verify the second CSV does NOT contain the opened record's UUID
            cy.wait('@selectedRecordsExport', getLongDelay()).then(() => {
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
                  FileManager.createFile(
                    `cypress/fixtures/${selectedRecordsCsvName}`,
                    actualContent,
                  );
                });
              });

              FileManager.readFile(`cypress/fixtures/${selectedRecordsCsvName}`).then(
                (fileContent) => {
                  const cleanContent2 = fileContent.trim().replace(/^"|"$/g, '');
                  expect(cleanContent2).to.not.include(authorityIds[0]);
                },
              );
            });
          },
        );
      });
    });
  });
});
