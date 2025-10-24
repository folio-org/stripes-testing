/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';

let user;
let exportedInCollegeMRCFile;
let exportedInUniversityMRCFile;
let exportedCSVFileName;
const marcFiles = [
  {
    fileName: 'marcAuthFileC410770_shared.mrc',
    fileNameImported: `testMarcFileC410770_shared.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    recordTitle: 'AT_C410770 Lentz Share',
    tenant: Affiliations.Consortia,
  },
  {
    fileName: 'marcAuthFileC410770_local.mrc',
    fileNameImported: `testMarcFileC410770_local.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    recordTitle: 'AT_C410770 Lentz Local',
    tenant: Affiliations.College,
  },
];
const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();

describe('Data Export', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      [Affiliations.College, Affiliations.Consortia].forEach((tenant) => {
        cy.withinTenant(tenant, () => {
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410770 Lentz*');
        });
      });

      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            permissions.inventoryAll.gui,
            permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            permissions.moduleDataImportEnabled.gui,
          ],
        });

        cy.affiliateUserToTenant({
          tenantId: Affiliations.University,
          userId: user.userId,
          permissions: [
            permissions.inventoryAll.gui,
            permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ],
        });

        // Import MARC authority records to respective tenants
        marcFiles.forEach((marcFile) => {
          cy.setTenant(marcFile.tenant);
          DataImport.uploadFileViaApi(
            marcFile.fileName,
            marcFile.fileNameImported,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              marcFile.authRecordId = record.authority.id;
            });
          });
        });
        cy.resetTenant();
        cy.login(user.username, user.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBeats('AT_C410770 Lentz');
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      marcFiles.forEach((marcFile) => {
        cy.setTenant(marcFile.tenant);
        MarcAuthority.deleteViaAPI(marcFile.authRecordId, true);
      });

      FileManager.deleteFileFromDownloadsByMask(
        exportedInCollegeMRCFile,
        exportedInUniversityMRCFile,
        'QuickAuthorityExport*',
      );
      FileManager.deleteFile(`cypress/fixtures/${exportedCSVFileName}`);
    });

    it(
      'C410770 Consortia | Verify that only Shared and Local (for current tenant) "MARC authority" records will be exported by Data export (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C410770'] },
      () => {
        // Step 1: Check checkboxes next to MARC Authority records
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('2 records found2 records selected');

        // Step 2: Click Actions > Export selected records
        cy.intercept('/data-export/quick-export').as('getHrid');
        MarcAuthorities.exportSelected();
        cy.wait('@getHrid', getLongDelay()).then((resp) => {
          MarcAuthorities.verifyToastNotificationAfterExportAuthority();
          MarcAuthorities.getExportedCSVFileNameFromCallout().then((exportedCSVFile) => {
            exportedCSVFileName = `${exportedCSVFile}.csv`;
            const expectedRecordHrid = resp.response.body.jobExecutionHrId;
            exportedInCollegeMRCFile = `quick-export-${expectedRecordHrid}.mrc`;

            ExportFileHelper.moveDownloadedFileToFixtures(exportedCSVFileName);

            // Step 3: Verify exported .csv file
            ExportFileHelper.verifyFileIncludes(exportedCSVFileName, [
              marcFiles.map((file) => file.authRecordId),
            ]);
            ExportFileHelper.verifyCSVFileRecordsNumber(exportedCSVFileName, 2);

            // Step 4: Go to Data export app and verify logs
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();

            // Step 5: Download exported .mrc file
            DataExportLogs.clickButtonWithText(exportedInCollegeMRCFile);

            // Step 6: Verify exported .mrc file content
            const commonAssertions = () => [
              (record) => expect(record.leader).to.eq('00632cz  a2200157n  4500'),
              (record) => expect(record.fields[0]).to.deep.eq(['001', '8709980']),
              (record) => {
                expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
              },
              (record) => {
                expect(record.fields[2]).to.deep.eq([
                  '008',
                  '110721n| azannaabn          |n aaa      ',
                ]);
              },
              (record) => {
                expect(record.fields[3]).to.deep.eq(['010', '  ', 'a', 'n2011049161407688']);
              },
              (record) => {
                expect(record.fields[4]).to.deep.eq(['035', '  ', 'a', '(OCoLC)oca08921677']);
              },
              (record) => {
                expect(record.fields[5]).to.deep.eq([
                  '040',
                  '  ',
                  'a',
                  'DLC',
                  'b',
                  'eng',
                  'c',
                  'DLC',
                  'e',
                  'rda',
                  'd',
                  'DLC',
                  'd',
                  'MvI',
                ]);
              },
              (record) => {
                expect(record.fields[6]).to.deep.eq(['046', '  ', 'f', '1977-10-11', '2', 'edtf']);
              },
              (record) => {
                expect(record.fields[8]).to.deep.eq([
                  '670',
                  '  ',
                  'a',
                  "City indians in Spain's American empire, c2012:",
                  'b',
                  'ECIP t.p. (Mark Lentz)',
                ]);
              },
              (record) => {
                expect(record.fields[9]).to.deep.eq([
                  '670',
                  '  ',
                  'a',
                  'Murder in Mérida, 1792, 2018 :',
                  'b',
                  'pre-publication galley title page (Mark W. Lentz) data from publisher (b. Oct. 11, 1977)',
                ]);
              },
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('s'),
              (record) => expect(record.get('999')[0].subf[1][0]).to.eq('i'),
            ];

            const recordsToVerify = marcFiles.map((marcFile) => ({
              uuid: marcFile.authRecordId,
              assertions: [
                ...commonAssertions(),
                (record) => {
                  expect(record.fields[7]).to.deep.eq(['100', '1 ', 'a', marcFile.recordTitle]);
                },
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(marcFile.authRecordId),
              ],
            }));

            parseMrcFileContentAndVerify(exportedInCollegeMRCFile, recordsToVerify, 2, false, true);

            // Step 7: Switch affiliation to Member 2 tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

            // Step 8: Navigate to Data export app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();

            // Step 9-10: Upload CSV and run export job
            cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
            ExportFileHelper.uploadFile(exportedCSVFileName);
            ExportFileHelper.exportWithDefaultJobProfile(
              exportedCSVFileName,
              'Default authority',
              'Authorities',
              '.csv',
            );
            cy.wait(3000);

            cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
              const { jobExecutions } = response.body;
              const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
              const jobId = jobData.hrId;
              exportedInUniversityMRCFile = `${exportedCSVFileName.replace('.csv', '')}-${jobId}.mrc`;

              DataExportLogs.verifyAreYouSureModalAbsent();

              DataExportResults.verifyCompletedWithErrorsExportResultCells(
                exportedInUniversityMRCFile,
                2,
                1,
                jobId,
                user,
                'Default authority',
              );

              // Step 11: Download exported .mrc file
              DataExportLogs.clickButtonWithText(exportedInUniversityMRCFile);

              // Step 12: Verify exported .mrc file content - only shared record should be exported
              const sharedMarcFile = marcFiles.find(
                (file) => file.tenant === Affiliations.Consortia,
              );
              const recordsToVerifyInUniversity = [
                {
                  uuid: sharedMarcFile.authRecordId,
                  assertions: [
                    ...commonAssertions(),
                    (record) => {
                      expect(record.fields[7]).to.deep.eq([
                        '100',
                        '1 ',
                        'a',
                        sharedMarcFile.recordTitle,
                      ]);
                    },
                    (record) => {
                      expect(record.get('999')[0].subf[1][1]).to.eq(sharedMarcFile.authRecordId);
                    },
                  ],
                },
              ];

              parseMrcFileContentAndVerify(
                exportedInUniversityMRCFile,
                recordsToVerifyInUniversity,
                1,
                false,
                true,
              );

              const date = new Date();
              const formattedDateUpToHours = date.toISOString().slice(0, 13);

              DataExportLogs.clickFileNameFromTheList(exportedInUniversityMRCFile);
              DataExportLogs.verifyErrorTextInErrorLogsPane(
                new RegExp(
                  `${formattedDateUpToHours}.*ERROR Record not found: ${marcFiles[1].authRecordId}.`,
                ),
              );
            });
          });
        });
      },
    );
  });
});
