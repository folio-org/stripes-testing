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
const recordsCount = 6;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
];
const instances = [
  {
    title: `AT_C405556_Local_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'folio',
  },
  {
    title: `AT_C405556_Shared_FolioInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
  },
  {
    title: `AT_C405556_Shared_FolioInstance_WithHolding_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
    withHolding: true,
  },
  {
    title: `AT_C405556_Local_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'marc',
  },
  {
    title: `AT_C405556_Shared_MarcInstance_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
  },
  {
    title: `AT_C405556_Shared_MarcInstance_WithHolding_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    withHolding: true,
  },
];
const instanceUUIDsFileName = `AT_C405556_instanceUUIdsFile_${getRandomPostfix()}.csv`;

function createInstance(instance) {
  cy.withinTenant(instance.affiliation, () => {
    const create =
      instance.type === 'folio'
        ? cy.createInstance({
          instance: { instanceTypeId, title: instance.title },
        })
        : cy.createSimpleMarcBibViaAPI(instance.title);

    create.then((instanceId) => {
      cy.getInstanceById(instanceId).then((instanceData) => {
        instance.uuid = instanceId;
        instance.hrid = instanceData.hrid;
      });
    });
  });
}

function createHolding(instance) {
  cy.withinTenant(Affiliations.College, () => {
    InventoryHoldings.createHoldingRecordViaApi({
      instanceId: instance.uuid,
      permanentLocationId: locationId,
      sourceId,
    }).then((holding) => {
      instance.holdingId = holding.id;
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
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
        })
          .then(() => {
            // create all instances
            instances.forEach((instance) => {
              createInstance(instance);
            });
          })
          .then(() => {
            cy.withinTenant(Affiliations.College, () => {
              cy.getLocations({ limit: 1 }).then((res) => {
                locationId = res.id;
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  sourceId = folioSource.id;
                });
              });
            });
          })
          .then(() => {
            // create holdings in College
            instances.forEach((instance) => {
              if (instance.withHolding) {
                createHolding(instance);
              }
            });
          })
          .then(() => {
            const uuids = instances.map((instance) => instance.uuid).join('\n');

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
        instances.forEach((instance) => {
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

      const sharedInstances = instances.filter(
        (instance) => instance.affiliation === Affiliations.Consortia,
      );

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
          const recordsToVerify = instances.map((instance) => ({
            uuid: instance.uuid,
            assertions: commonAssertions(instance),
          }));

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);
        });
      },
    );
  });
});
