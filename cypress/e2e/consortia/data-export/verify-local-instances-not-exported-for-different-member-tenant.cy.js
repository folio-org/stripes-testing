import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import DataExport from '../../../support/fragments/consortium-manager/dataExport';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
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

let user;
let exportedFileNameMember1;
let exportedFileNameMember2;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
];
const centralTenantPermissions = [permissions.consortiaSettingsConsortiumManagerView.gui];
const instanceUUIDsFileName = `AT_C411286_instanceUUIDs_${getRandomPostfix()}.csv`;
const instances = [
  {
    title: `AT_C411286_Local_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'folio',
  },
  {
    title: `AT_C411286_Local_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'marc',
  },
  {
    title: `AT_C411286_Shared_FolioInstance_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
    hasHoldings: true,
  },
  {
    title: `AT_C411286_Shared_MarcInstance_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    hasHoldings: true,
  },
  {
    title: `AT_C411286_Shared_FolioInstance_NoHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
    hasHoldings: false,
  },
  {
    title: `AT_C411286_Shared_MarcInstance_NoHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    hasHoldings: false,
  },
];

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
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411286');

      cy.createTempUser([...userPermissions, ...centralTenantPermissions]).then(
        (userProperties) => {
          user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: userPermissions,
          });

          cy.affiliateUserToTenant({
            tenantId: Affiliations.University,
            userId: user.userId,
            permissions: userPermissions,
          }).then(() => {
            cy.getInstanceTypes({ limit: 1 })
              .then((instanceTypes) => {
                const instanceTypeId = instanceTypes[0].id;

                instances.forEach((instance) => {
                  createInstance(instance, instanceTypeId);
                });
              })
              .then(() => {
                // Add holdings to shared instances that require them in College tenant
                cy.withinTenant(Affiliations.College, () => {
                  InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                    const sourceId = folioSource.id;

                    cy.getLocations({ limit: 1 }).then((res) => {
                      const locationId = res.id;

                      const sharedInstancesWithHoldings = instances.filter((instance) => {
                        return (
                          instance.affiliation === Affiliations.Consortia && instance.hasHoldings
                        );
                      });

                      sharedInstancesWithHoldings.forEach((instance) => {
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

                // Create CSV file with all instance UUIDs
                const uuids = instances.map((instance) => instance.uuid).join('\n');
                FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, uuids);

                cy.login(user.username, user.password, {
                  path: TopMenu.dataExportPath,
                  waiter: DataExportLogs.waitLoading,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              });
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        const sharedInstancesWithHoldings = instances.filter(
          (instance) => instance.affiliation === Affiliations.Consortia && instance.hasHoldings,
        );

        sharedInstancesWithHoldings.forEach((instance) => {
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

        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileNameMember1);
      FileManager.deleteFileFromDownloadsByMask(exportedFileNameMember2);
    });

    it(
      'C411286 Consortia | Verify that local instances from Member 1 do not exported for Member 2 (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C411286'] },
      () => {
        // Step 1: Go to the "Data export" app
        // Step 2: Trigger the data export by uploading .csv file
        ExportFileHelper.uploadFile(instanceUUIDsFileName);

        // Step 3: Run the "Default instance export job profile"
        ExportFileHelper.exportWithDefaultJobProfile(instanceUUIDsFileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileNameMember1 = `${instanceUUIDsFileName.replace('.csv', '')}-${jobId}.mrc`;

          const exportedInstancesNumberInCollege = instances.length;

          // Step 4: Verify export results
          DataExportResults.verifySuccessExportResultCells(
            exportedFileNameMember1,
            exportedInstancesNumberInCollege,
            jobId,
            user.username,
          );
          cy.getUserToken(user.username, user.password);

          // Step 5: Download exported .mrc file
          DataExportLogs.clickButtonWithText(exportedFileNameMember1);

          // Step 6-8: Verify exported .mrc file content includes all 6 instances
          const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();

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
              verifyMarcFieldByTag(record, '999', {
                ind1: 'f',
                ind2: 'f',
                subfields: ['i', instance.uuid],
              });
            },
          ];

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

          const recordsToVerifyMember1 = instances.map((instance) => ({
            uuid: instance.uuid,
            assertions:
              instance.type === 'folio'
                ? folioInstanceAssertions(instance)
                : marcBibInstanceAssertions(instance),
          }));

          parseMrcFileContentAndVerify(
            exportedFileNameMember1,
            recordsToVerifyMember1,
            exportedInstancesNumberInCollege,
          );

          // Step 9-10: Switch affiliation to Member 2 tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

          // Step 11: Go to the "Data export" app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();

          // Step 12: Run the "Default instance export job profile"
          ExportFileHelper.uploadFile(instanceUUIDsFileName);
          ExportFileHelper.exportWithDefaultJobProfile(instanceUUIDsFileName);

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
            'getInfoMember2',
          );
          cy.wait('@getInfoMember2', getLongDelay()).then(({ response: responseMember2 }) => {
            const jobs = responseMember2.body.jobExecutions;
            const jobDataMember2 = jobs.find(
              (job) => job.runBy.userId === user.userId && job.hrId !== jobId,
            );
            const jobIdMember2 = jobDataMember2.hrId;
            exportedFileNameMember2 = `${instanceUUIDsFileName.replace('.csv', '')}-${jobIdMember2}.mrc`;

            // Step 13-14: Verify export results - only shared instances (completed with errors for local instances)
            const sharedInstances = instances.filter(
              (instance) => instance.affiliation === Affiliations.Consortia,
            );
            const sharedInstancesCount = sharedInstances.length;
            const localInstances = instances.filter(
              (instance) => instance.affiliation === Affiliations.College,
            );

            DataExportResults.verifyCompletedWithErrorsExportResultCells(
              exportedFileNameMember2,
              instances.length,
              sharedInstancesCount,
              jobIdMember2,
              user,
            );
            DataExportLogs.clickButtonWithText(exportedFileNameMember2);

            const recordsToVerifyMember2 = sharedInstances.map((instance) => ({
              uuid: instance.uuid,
              assertions:
                instance.type === 'folio'
                  ? folioInstanceAssertions(instance)
                  : marcBibInstanceAssertions(instance),
            }));

            parseMrcFileContentAndVerify(
              exportedFileNameMember2,
              recordsToVerifyMember2,
              sharedInstancesCount,
            );

            ExportFileHelper.verifyFileIncludes(
              exportedFileNameMember2,
              [localInstances[0].uuid, localInstances[1].uuid],
              false,
            );

            // Step 15: Switch active affiliation to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Step 16: Navigate to the "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();

            // Step 17: Click "Data export" option and verify the pane
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.dataExport);
            ConsortiumManagerApp.verifySelectedSettingIsDisplayed(settingsItems.dataExport);

            // Step 18: Select "Member 1" tenant from the "Member" dropdown and verify logs
            ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.college);
            ConsortiumManagerApp.verifySelectedMember(tenantNames.college);
            DataExport.verifySuccessExportResultCells(
              exportedFileNameMember1,
              exportedInstancesNumberInCollege,
              jobId,
              user,
            );

            // Step 19: Select "Member 2" tenant from the "Member" dropdown and verify logs
            ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.university);
            ConsortiumManagerApp.verifySelectedMember(tenantNames.university);
            DataExport.verifyCompletedWithErrorsExportResultCells(
              exportedFileNameMember2,
              instances.length,
              sharedInstancesCount,
              jobIdMember2,
              user,
            );
          });
        });
      },
    );
  });
});
