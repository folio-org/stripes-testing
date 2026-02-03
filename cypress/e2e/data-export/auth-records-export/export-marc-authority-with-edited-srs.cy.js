/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

let user;
let exportedFileName;
let secondExportedFileName;
let firstJobHrid;
const marcAuthorityUUIDFileName = `AT_C446040_marcAuthorityUUIDFile_${getRandomPostfix()}.csv`;
const recordsCount = 1;
const marcFile = {
  marc: 'marcAuthFileC446040.mrc',
  fileNameImported: `testMarcFileC446040.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
};
const marcAuthority = {
  title: `AT_C446040_MarcAuthority_${randomFourDigitNumber()}`,
};
const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();
const expectedMarcFields = [
  ['008', '830616n| azannaabn          |a aaa      '],
  ['010', '  ', 'a', '63943573'],
  ['035', '  ', 'a', '(OCoLC)oca00955395'],
  ['040', '  ', 'a', 'DLC', 'b', 'eng', 'c', 'DLC', 'd', 'OCoLC', 'd', 'DLc', 'e', 'rda'],
  ['046', '  ', 'f', '1498', 'g', '1578', '2', 'edtf'],
  ['100', '1 ', 'a', 'AT_C446040 Clovio, Giulio,', 'd', '1498-1578'],
  ['400', '1 ', 'w', 'nna', 'a', 'Clovio, Giorgio Giulio,', 'd', '1498-1578'],
  ['400', '1 ', 'a', 'Klović, Julije'],
  ['400', '1 ', 'a', 'Klovio, Juraj Julio'],
  ['400', '1 ', 'a', 'Clovio, Julio'],
  ['400', '1 ', 'a', 'Klović, Juraj'],
  ['670', '  ', 'a', 'His The Farnese hours, 1976:', 'b', 'p. 2 (Giulio Clovio)'],
  ['670', '  ', 'a', 'Thieme-Becker', 'b', '(Clovio, D. Julio)'],
  ['670', '  ', 'a', 'Encic. ital.', 'b', '(Clovio, Giulio)'],
  ['670', '  ', 'a', 'Grande encic. Vallardi', 'b', '(Clovio, Giulio)'],
  ['952', '  ', 'a', 'RETRO'],
  ['953', '  ', 'a', 'xx00', 'b', 'fg10'],
];

describe('Data Export', () => {
  describe('Authority records export', () => {
    before('create test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C446040*');

      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        permissions.inventoryAll.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileNameImported,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            marcAuthority.id = record.authority.id;

            FileManager.createFile(
              `cypress/fixtures/${marcAuthorityUUIDFileName}`,
              marcAuthority.id,
            );
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteViaAPI(marcAuthority.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${marcAuthorityUUIDFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      FileManager.deleteFileFromDownloadsByMask(secondExportedFileName);
    });

    it(
      'C446040 Verify export MARC Authority with edited SRS (firebird)',
      { tags: ['criticalPath', 'firebird', 'C446040'] },
      () => {
        // Step 1-2: Upload the .csv file
        ExportFileHelper.uploadFile(marcAuthorityUUIDFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          marcAuthorityUUIDFileName,
          'Default authority',
          'Authorities',
        );
        DataExportLogs.verifyAreYouSureModalAbsent();

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          firstJobHrid = jobData.hrId;
          exportedFileName = `${marcAuthorityUUIDFileName.replace('.csv', '')}-${firstJobHrid}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            firstJobHrid,
            user.username,
            'Default authority',
          );
          cy.getUserToken(user.username, user.password);

          // Step 3: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 4: Check exported records included in the file
          const assertionsOnMarcFileContent = [
            {
              uuid: marcAuthority.id,
              assertions: [
                (record) => {
                  expect(record.leader).to.eq('00875cz  a2200265n  4500');
                },
                (record) => {
                  expect(record.fields[0]).to.deep.eq(['001', 'n  83073672 ']);
                },
                (record) => {
                  expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
                },
                ...expectedMarcFields.map((fieldData, index) => (record) => {
                  expect(record.fields[index + 2]).to.deep.eq(fieldData);
                }),
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('s'),
                (record) => expect(record.get('999')[0].subf[1][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(marcAuthority.id),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnMarcFileContent,
            recordsCount,
            false,
          );
        });

        // Step 5: Go to "MARC Authority" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();

        // Step 6: Find MARC Authority from Preconditions
        MarcAuthorities.searchBeats('AT_C446040');
        MarcAuthorities.waitLoading();
        MarcAuthorities.select(marcAuthority.id);

        // Step 7: Click "Actions" => "Edit"
        MarcAuthority.edit();

        // Step 8: Edit any field of MARC Authority record, e.g. change LDR 05 position to "d"
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.A,
        );

        // Step 9: Click "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndCloseAuthority();

        const updatedExpectedMarcFields = [...expectedMarcFields];
        const index010 = updatedExpectedMarcFields.findIndex((field) => field[0] === '010');
        updatedExpectedMarcFields[index010] = ['010', '  ', 'a', '   63943573 '];

        // Step 10: Go to "Data export" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);

        // Step 11: Trigger the data export by submitting .csv file with UUID of authority record from Preconditions
        ExportFileHelper.uploadFile(marcAuthorityUUIDFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          marcAuthorityUUIDFileName,
          'Default authority',
          'Authorities',
        );
        DataExportLogs.verifyAreYouSureModalAbsent();
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo2');
        cy.wait('@getInfo2', getLongDelay()).then(({ response }) => {
          const jobs = response.body.jobExecutions;
          const jobData = jobs.find(
            (job) => job.runBy.userId === user.userId && job.hrId !== firstJobHrid,
          );
          const jobId = jobData.hrId;
          secondExportedFileName = `${marcAuthorityUUIDFileName.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            secondExportedFileName,
            recordsCount,
            jobId,
            user.username,
            'Default authority',
          );

          // Step 12: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          DataExportLogs.clickButtonWithText(secondExportedFileName);

          const assertionsOnUpdatedMarcFileContent = [
            {
              uuid: marcAuthority.id,
              assertions: [
                (record) => {
                  expect(record.leader).to.eq('00879az  a2200265n  4500');
                },
                (record) => {
                  expect(record.fields[0]).to.deep.eq(['001', 'n  83073672 ']);
                },
                (record) => {
                  expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
                },
                ...updatedExpectedMarcFields.map((fieldData, index) => (record) => {
                  expect(record.fields[index + 2]).to.deep.eq(fieldData);
                }),
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('s'),
                (record) => expect(record.get('999')[0].subf[1][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(marcAuthority.id),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            secondExportedFileName,
            assertionsOnUpdatedMarcFileContent,
            recordsCount,
            false,
          );
        });
      },
    );
  });
});
