/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import DateTools from '../../../support/utils/dateTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

let user;
let instanceTypeId;
let downloadedCQLFile;
let exportedInCentralTenantMRCFile;
let exportedInMemberTenantMRCFile;
const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();
const folioInstanceTitle = `AT_C543847_FolioInstance_${randomFourDigitNumber()}`;
const sharedInstanceIds = [];
const localInstanceIds = [];

describe('Data Export', () => {
  describe('Consortia', () => {
    beforeEach('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.enableStaffSuppressFacet.gui,
        permissions.dataExportSettingsViewOnly.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            permissions.inventoryAll.gui,
            permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            permissions.enableStaffSuppressFacet.gui,
          ],
        });
        cy.resetTenant();
        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          })
          .then(() => {
            for (let i = 1; i <= 2; i++) {
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: `${folioInstanceTitle}_${i}`,
                  deleted: true,
                  discoverySuppress: true,
                  staffSuppress: true,
                },
              }).then((instanceId) => {
                sharedInstanceIds.push(instanceId);
              });
            }
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.createInstance({
              instance: {
                instanceTypeId,
                title: `${folioInstanceTitle}_3`,
                discoverySuppress: true,
                staffSuppress: true,
              },
            }).then((instanceId) => {
              localInstanceIds.push(instanceId);
            });
            cy.resetTenant();
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, getLongDelay());
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventorySearchAndFilter.byKeywords(folioInstanceTitle);
          });
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      sharedInstanceIds.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      cy.setTenant(Affiliations.College);

      localInstanceIds.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
      [
        exportedInMemberTenantMRCFile,
        exportedInCentralTenantMRCFile,
        'QuickInstanceExport*',
        downloadedCQLFile,
      ].forEach((file) => {
        FileManager.deleteFileFromDownloadsByMask(file);
      });

      FileManager.deleteFile(`cypress/fixtures/${downloadedCQLFile}`);
    });

    it(
      'C543847 ECS | Verify export FOLIO Instance set for deletion (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C543847'] },
      () => {
        // Step 1-2: Click on the "Action" menu
        InventorySearchAndFilter.saveCQLQuery();
        FileManager.findDownloadedFilesByMask('SearchInstanceCQLQuery*').then(
          (downloadedFilePathes) => {
            const lastDownloadedFilePath =
              downloadedFilePathes.sort()[downloadedFilePathes.length - 1];
            downloadedCQLFile = FileManager.getFileNameFromFilePath(lastDownloadedFilePath);
            InventoryActions.verifySaveCQLQueryFileName(downloadedCQLFile);

            // Step 3: Go to the "Data export" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);

            // Step 4-5: Trigger the data export by clicking on  the "or choose file" button at jobs panel and submitting .cql
            ExportFileHelper.moveDownloadedFileToFixtures(downloadedCQLFile);
            ExportFileHelper.uploadFile(downloadedCQLFile);
            ExportFileHelper.exportWithDefaultJobProfile(
              downloadedCQLFile,
              'Default instances',
              'Instances',
              '.cql',
            );
            DataExportLogs.verifyAreYouSureModalAbsent();

            cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
            cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
              const { jobExecutions } = response.body;
              const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
              const jobId = jobData.hrId;
              exportedInCentralTenantMRCFile = `${downloadedCQLFile.replace('.cql', '')}-${jobData.hrId}.mrc`;

              DataExportResults.verifySuccessExportResultCells(
                exportedInCentralTenantMRCFile,
                sharedInstanceIds.length,
                jobId,
                user.username,
                'Default instances',
              );
              cy.getUserToken(user.username, user.password);

              // Step 6: Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
              DataExportLogs.clickButtonWithText(exportedInCentralTenantMRCFile);

              // Step 7: Check exported record for shared Instances from Preconditions #4 included in the file
              const commonAssertions = (instanceId) => [
                (record) => expect(record.leader[5]).to.equal('d'),
                (record) => {
                  expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instanceId),
              ];
              const recordsToVerify = sharedInstanceIds.map((id) => ({
                uuid: id,
                assertions: commonAssertions(id),
              }));

              parseMrcFileContentAndVerify(
                exportedInCentralTenantMRCFile,
                recordsToVerify,
                sharedInstanceIds.length,
              );
            });
          },
        );

        // Step 8: Switch affiliation to member tenant, Go to "Inventory" app
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.clearDefaultFilter('Held by');
        InventorySearchAndFilter.waitLoading();

        // Step 9: Search for the local Instance from Preconditions #4
        InventorySearchAndFilter.searchInstanceByTitle(localInstanceIds[0]);

        // Step 10-11: Click "Action" menu, Click "Export instance (MARC)" option
        InstanceRecordView.exportInstanceMarc();

        cy.intercept('/data-export/quick-export').as('getHrid');
        cy.wait('@getHrid', getLongDelay()).then((resp) => {
          const expectedRecordHrid = resp.response.body.jobExecutionHrId;
          exportedInMemberTenantMRCFile = `quick-export-${expectedRecordHrid}.mrc`;

          InventoryInstances.verifyToastNotificationAfterExportInstanceMarc(expectedRecordHrid);

          FileManager.verifyFile(
            InventoryActions.verifyInstancesMARCFileName,
            'QuickInstanceExport*',
            InventoryActions.verifyInstancesMARC,
            [localInstanceIds],
          );

          // Step 12: Go to "Data export" app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.clickButtonWithText(exportedInMemberTenantMRCFile);

          // Step 13: Check exported record for local Instance from Preconditions #4 included in the file
          const assertionsOnLocalInstance = [
            {
              uuid: localInstanceIds[0],
              assertions: [
                (record) => {
                  expect(record.leader[5]).to.eq('n');
                },
                (record) => {
                  expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(localInstanceIds[0]),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            exportedInMemberTenantMRCFile,
            assertionsOnLocalInstance,
            localInstanceIds.length,
          );

          // Step 14: Trigger the data export by clicking on the "or choose file" button at jobs panel and submitting .cql file with saved query (Step # 2)
          ExportFileHelper.uploadFile(downloadedCQLFile);
          ExportFileHelper.exportWithDefaultJobProfile(
            downloadedCQLFile,
            'Default instances',
            'Instances',
            '.cql',
          );
          DataExportLogs.verifyAreYouSureModalAbsent();

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
            'getInfoMember',
          );
          cy.wait('@getInfoMember', getLongDelay()).then((interceptResponse) => {
            const { jobExecutions } = interceptResponse.response.body;
            const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const jobId = jobData.hrId;
            const exportedInMemberTenantSecondMRCFile = `${downloadedCQLFile.replace('.cql', '')}-${jobData.hrId}.mrc`;

            DataExportResults.verifySuccessExportResultCells(
              exportedInMemberTenantSecondMRCFile,
              sharedInstanceIds.length + localInstanceIds.length,
              jobId,
              user.username,
              'Default instances',
            );

            // Step 15: Download the recently created file with extension .mrc by clicking on a file name hyperlink at the "Data Export" logs table
            DataExportLogs.clickButtonWithText(exportedInMemberTenantSecondMRCFile);

            // Step 16: Check exported record for shared Instances from Preconditions #4 included in the file
            const assertionsOnSharedInstances = sharedInstanceIds.map((id) => ({
              uuid: id,
              assertions: [
                (record) => expect(record.leader[5]).to.equal('d'),
                (record) => {
                  expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(id),
              ],
            }));

            const assertionsOnInstances = [
              ...assertionsOnSharedInstances,
              ...assertionsOnLocalInstance,
            ];

            parseMrcFileContentAndVerify(
              exportedInMemberTenantSecondMRCFile,
              assertionsOnInstances,
              sharedInstanceIds.length + localInstanceIds.length,
            );

            FileManager.deleteFileFromDownloadsByMask(exportedInMemberTenantSecondMRCFile);
          });
        });
      },
    );
  });
});
