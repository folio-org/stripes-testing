/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import { getLongDelay } from '../../../support/utils/cypressTools';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import FileManager from '../../../support/utils/fileManager';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import DateTools from '../../../support/utils/dateTools';

let user;
let exportedFileName;
let instanceTypeId;
let locationId;
let sourceId;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
];
const recordsCount = 6;
const instances = {
  localFolioInstance: {
    title: `AT_C405556_Local_FolioInstance_${getRandomPostfix()}`,
  },
  sharedFolioInstance: {
    title: `AT_C405556_Shared_FolioInstance_${getRandomPostfix()}`,
  },
  sharedFolioInstanceWithHolding: {
    title: `AT_C405556_Shared_FolioInstance_WithHolding_${getRandomPostfix()}`,
  },
  localMarcInstance: {
    title: `AT_C405556_Local_MarcInstance_${getRandomPostfix()}`,
  },
  sharedMarcInstance: {
    title: `AT_C405556_Shared_MarcInstance_${getRandomPostfix()}`,
  },
  sharedMarcInstanceWithHolding: {
    title: `AT_C405556_Shared_MarcInstance_WithHolding_${getRandomPostfix()}`,
  },
};
const arrayOfInstances = Object.values(instances);
const instanceUUIDsFileName = `AT_C405556_instanceUUIdsFile_${getRandomPostfix()}.csv`;

function createFolioInstance(instance, tenant) {
  return cy.withinTenant(tenant, () => {
    InventoryInstances.createFolioInstanceViaApi({
      instance: { instanceTypeId, title: instance.title },
    }).then((folioInstance) => {
      cy.getInstanceById(folioInstance.instanceId).then((instanceData) => {
        instance.uuid = folioInstance.instanceId;
        instance.hrid = instanceData.hrid;
      });
    });
  });
}

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();

      cy.createTempUser(userPermissions).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);

        cy.withinTenant(Affiliations.College, () => {
          cy.assignPermissionsToExistingUser(user.userId, userPermissions);

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // create local instance with source FOLIO
              createFolioInstance(instances.localFolioInstance, Affiliations.College);
            })
            .then(() => {
              // create local instances with source MARC
              cy.createSimpleMarcBibViaAPI(instances.localMarcInstance.title).then(
                (marcInstanceId) => {
                  instances.localMarcInstance.uuid = marcInstanceId;

                  cy.getInstanceById(instances.localMarcInstance.uuid).then((instanceData) => {
                    instances.localMarcInstance.hrid = instanceData.hrid;
                  });
                },
              );
            });
        })
          .then(() => {
            // create shared instances with source FOLIO
            createFolioInstance(instances.sharedFolioInstance, Affiliations.Consortia);
          })
          .then(() => {
            // create shared instances with source MARC  records
            cy.createSimpleMarcBibViaAPI(instances.sharedMarcInstance.title).then(
              (marcInstanceId) => {
                instances.sharedMarcInstance.uuid = marcInstanceId;

                cy.getInstanceById(instances.sharedMarcInstance.uuid).then((instanceData) => {
                  instances.sharedMarcInstance.hrid = instanceData.hrid;
                });
              },
            );
          })
          .then(() => {
            // create shared instances with source FOLIO with associated Holding
            cy.withinTenant(Affiliations.Consortia, () => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instances.sharedFolioInstanceWithHolding.title,
                },
              }).then((folioInstance) => {
                instances.sharedFolioInstanceWithHolding.uuid = folioInstance.instanceId;

                cy.getInstanceById(instances.sharedFolioInstanceWithHolding.uuid).then(
                  (instanceData) => {
                    instances.sharedFolioInstanceWithHolding.hrid = instanceData.hrid;
                  },
                );

                cy.withinTenant(Affiliations.College, () => {
                  cy.getLocations({ limit: 1 }).then((res) => {
                    locationId = res.id;
                  });
                  InventoryHoldings.getHoldingsFolioSource()
                    .then((folioSource) => {
                      sourceId = folioSource.id;
                    })
                    .then(() => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: instances.sharedFolioInstanceWithHolding.uuid,
                        permanentLocationId: locationId,
                        sourceId,
                      }).then((holding) => {
                        instances.sharedFolioInstanceWithHolding.holdingId = holding.id;
                      });
                    });
                });
              });
            });
          })
          .then(() => {
            // shared instances with source MARC with associated Holdings records
            cy.withinTenant(Affiliations.Consortia, () => {
              cy.createSimpleMarcBibViaAPI(instances.sharedMarcInstanceWithHolding.title).then(
                (marcInstanceId) => {
                  instances.sharedMarcInstanceWithHolding.uuid = marcInstanceId;

                  cy.getInstanceById(instances.sharedMarcInstanceWithHolding.uuid).then(
                    (instanceData) => {
                      instances.sharedMarcInstanceWithHolding.hrid = instanceData.hrid;
                    },
                  );

                  cy.withinTenant(Affiliations.College, () => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instances.sharedMarcInstanceWithHolding.uuid,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holding) => {
                      instances.sharedMarcInstanceWithHolding.holdingId = holding.id;
                    });
                  });
                },
              );
            });
          })
          .then(() => {
            const uuids = Object.values(instances)
              .map((instance) => instance.uuid)
              .join('\n');

            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, uuids);
          });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });
    });

    after('delete test data', () => {
      cy.withinTenant(Affiliations.College, () => {
        arrayOfInstances.forEach((instance) => {
          if (instance.holdingId) {
            cy.deleteHoldingRecordViaApi(instance.holdingId);
          }
        });
        InventoryInstance.deleteInstanceViaApi(instances.localFolioInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(instances.localMarcInstance.uuid);
      });

      const sharedInstances = arrayOfInstances.filter((instance) => {
        return instance.title.includes('Shared');
      });

      sharedInstances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.uuid);
      });

      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C405556 Consortia | Verify exporting instance records with Default instances job profile (consortia) (firebird)',
      { tags: ['smokeECS', 'firebird', 'C405556'] },
      () => {
        ExportFileHelper.uploadFile(instanceUUIDsFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);
        ExportFileHelper.exportWithDefaultJobProfile(instanceUUIDsFileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            jobId,
            user.username,
          );
          DataExportLogs.clickButtonWithText(exportedFileName);

          const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();
          const todayDateYYYYMMDD = DateTools.getCurrentDateYYYYMMDD();

          const commonAssertions = (instance) => [
            (record) => expect(record.leader).to.exist,
            (record) => expect(record.get('001')[0].value).to.eq(instance.hrid),
            (record) => {
              expect(record.get('005')[0].value.startsWith(todayDateYYYYMMDD)).to.be.true;
            },
            (record) => {
              expect(record.get('008')[0].value.startsWith(todayDateYYMMDD)).to.be.true;
            },
            (record) => expect(record.get('245')[0].subf[0][0]).to.eq('a'),
            (record) => expect(record.get('245')[0].subf[0][1]).to.eq(instance.title),
            (record) => expect(record.get('999')[0].ind1).to.eq('f'),
            (record) => expect(record.get('999')[0].ind2).to.eq('f'),
            (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
            (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instance.uuid),
          ];
          const recordsToVerify = arrayOfInstances.map((instance) => ({
            uuid: instance.uuid,
            assertions: commonAssertions(instance),
          }));

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);
        });
      },
    );
  });
});
