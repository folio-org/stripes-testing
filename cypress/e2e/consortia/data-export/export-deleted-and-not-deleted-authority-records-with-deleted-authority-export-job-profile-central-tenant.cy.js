/* eslint-disable no-unused-expressions */
import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { getLongDelay } from '../../../support/utils/cypressTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

let user;
let exportedFileName;
let createdAuthoritySourceFileId;
const authorityUUIDsFileName = `AT_C554642_authority_uuids_${getRandomPostfix()}.csv`;
const title = `AT_C554642_MarcAuthority_${getRandomPostfix()}`;
const fields = [
  {
    tag: '100',
    content: `$a ${title}`,
    indicators: ['\\', '\\'],
  },
];
const authFile = {
  sourceName: `AT_C554642_AuthoritySourceFile_${getRandomPostfix()}`,
  prefix: getRandomLetters(8),
  startWithNumber: '1',
  hridStartsWith: '',
};
const nonExistentMarcAuthIds = new Array(2).fill(null).map(() => {
  return uuid();
});
const sharedMarcAuthIds = [];
const localMarcAuthIds = [];

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create authority source file in Central tenant
        cy.createAuthoritySourceFileUsingAPI(
          authFile.prefix,
          authFile.startWithNumber,
          authFile.sourceName,
        )
          .then((authoritySourceFileId) => {
            createdAuthoritySourceFileId = authoritySourceFileId;

            // Create authority records in Central and College tenants
            [Affiliations.Consortia, Affiliations.College].forEach((affiliation) => {
              cy.setTenant(affiliation);

              for (let i = 0; i < 2; i++) {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authFile.prefix,
                  authFile.hridStartsWith,
                  fields,
                ).then((createdRecordId) => {
                  if (affiliation === Affiliations.Consortia) {
                    sharedMarcAuthIds.push(createdRecordId);
                    // Delete the first shared authority record after creation
                    if (i) MarcAuthority.deleteViaAPI(sharedMarcAuthIds[0]);
                  } else {
                    localMarcAuthIds.push(createdRecordId);
                    // Delete the first local authority record after creation
                    if (i) MarcAuthority.deleteViaAPI(localMarcAuthIds[0]);
                  }
                });
              }
            });
          })
          .then(() => {
            // Create .csv file with the UUIDs
            FileManager.createFile(
              `cypress/fixtures/${authorityUUIDsFileName}`,
              [...sharedMarcAuthIds, ...localMarcAuthIds, ...nonExistentMarcAuthIds].join('\n'),
            );
          });
        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
          authRefresh: true,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      MarcAuthority.deleteViaAPI(sharedMarcAuthIds[1], true);
      cy.setTenant(Affiliations.College);
      MarcAuthority.deleteViaAPI(localMarcAuthIds[1], true);
      cy.resetTenant();
      cy.deleteAuthoritySourceFileViaAPI(createdAuthoritySourceFileId, true);
      FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C554642 ECS | Export deleted and not deleted Authority records from Central tenant with Deleted authority export job profile (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C554642'] },
      () => {
        // Step 1: Upload .csv file with UUIDs
        ExportFile.uploadFile(authorityUUIDsFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2-4: Run the "Deleted authority export job profile" by clicking on it
        ExportFile.exportWithDefaultJobProfile(
          authorityUUIDsFileName,
          'Deleted authority',
          'Authorities',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${authorityUUIDsFileName.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            exportedFileName,
            6,
            1,
            jobId,
            user,
            'Deleted authority',
          );

          // Step 5: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 6: Check exported records included in the file
          const deletedSharedMarcAuthId = sharedMarcAuthIds[0];
          const assertionsOnMarcFileContent = [
            {
              uuid: deletedSharedMarcAuthId,
              assertions: [
                (record) => expect(record.get('100')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('100')[0].subf[0][1]).to.eq(title),
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('s'),
                (record) => expect(record.get('999')[0].subf[1][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(sharedMarcAuthIds[0]),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnMarcFileContent,
            1,
            true,
            true,
          );

          // Step 7: Click on the row with completed with errors data export job at the "Data Export" logs table
          DataExportLogs.clickFileNameFromTheList(exportedFileName);

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(
              `${formattedDateUpToHours}.*ERROR This profile can only be used to export authority records set for deletion`,
            ),
          );
          const notDeletedSharedMarcAuthId = sharedMarcAuthIds[1];
          const regexParts = [
            ...localMarcAuthIds,
            ...nonExistentMarcAuthIds,
            notDeletedSharedMarcAuthId,
          ].map((notFoundAuthorityUUID) => `(?=.*${notFoundAuthorityUUID})`);
          const regexPattern = `${formattedDateUpToHours}.*ERROR Record not found: ${regexParts.join('')}`;
          const regex = new RegExp(regexPattern);

          DataExportLogs.verifyErrorTextInErrorLogsPane(regex);
        });
      },
    );
  });
});
