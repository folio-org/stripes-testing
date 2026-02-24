/* eslint-disable no-unused-expressions */
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import DataExportLogs from '../../../../support/fragments/data-export/dataExportLogs';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import ExportFileHelper from '../../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import DateTools from '../../../../support/utils/dateTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let exportedFileName;
let secondExportedFileName;
let firstJobHrid;
const marcAuthorityUUIDFileName = `AT_C423567_marcAuthorityUUIDFile_${getRandomPostfix()}.csv`;
const recordsCount = 1;
const marcFile = {
  marc: 'marcAuthFileC423567.mrc',
  fileNameImported: `testMarcFileC423567.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
};
const marcAuthority = {
  title: `AT_C423567_MarcAuthority_${randomFourDigitNumber()}`,
};
const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();
const expectedMarcFields = [
  ['008', '830616n| azannaabn          |a aaa      '],
  ['010', '  ', 'a', '63943573'],
  ['035', '  ', 'a', '(OCoLC)oca00955395'],
  ['040', '  ', 'a', 'DLC', 'b', 'eng', 'c', 'DLC', 'd', 'OCoLC', 'd', 'DLc', 'e', 'rda'],
  ['046', '  ', 'f', '1498', 'g', '1578', '2', 'edtf'],
  ['100', '1 ', 'a', 'AT_C423567 Clovio, Giulio,', 'd', '1498-1578'],
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
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false })
        .then(() => {
          // Fetch user details
          cy.getUserDetailsByUsername(user.username).then((details) => {
            user.id = details.id;
            user.personal = details.personal;
          });

          // Defensive cleanup
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423567*');
        })
        .then(() => {
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
        });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      cy.setTenant(memberTenant.id);
      MarcAuthorities.deleteViaAPI(marcAuthority.id, true);
      FileManager.deleteFile(`cypress/fixtures/${marcAuthorityUUIDFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      FileManager.deleteFileFromDownloadsByMask(secondExportedFileName);
    });

    it(
      'C423567 Export of imported MARC Authority record (firebird)',
      { tags: ['dryRun', 'firebird', 'C423567'] },
      () => {
        ExportFileHelper.uploadFile(marcAuthorityUUIDFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          marcAuthorityUUIDFileName,
          'Default authority',
          'Authorities',
        );
        DataExportLogs.verifyAreYouSureModalAbsent();

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const exportedFile = marcAuthorityUUIDFileName.replace('.csv', '');
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find((jobExecution) => {
            return jobExecution.exportedFiles[0].fileName.includes(exportedFile);
          });
          firstJobHrid = jobData.hrId;
          exportedFileName = `${marcAuthorityUUIDFileName.replace('.csv', '')}-${firstJobHrid}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            firstJobHrid,
            user.username,
            'Default authority',
          );
          cy.getUserToken(user.username, user.password, { log: false });

          DataExportLogs.clickButtonWithText(exportedFileName);

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
      },
    );
  });
});
