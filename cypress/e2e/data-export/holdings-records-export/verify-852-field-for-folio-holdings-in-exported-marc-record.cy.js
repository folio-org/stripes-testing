import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';

let user;
let instanceTypeId;
let permanentLocation;
let temporaryLocation;
let sourceId;
let exportedFileName;
const recordsCount = 2;
const instance = {
  instanceName: `AT_C423587_FolioInstance_${getRandomPostfix()}`,
  holdingsIDs: [],
};
const fileName = `AT_C423587_TestFile_${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Holdings records export', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getLocations({ limit: 2 }).then((res) => {
          permanentLocation = res[0];
          temporaryLocation = res[1];
        });
        InventoryHoldings.getHoldingsFolioSource()
          .then((folioSource) => {
            sourceId = folioSource.id;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instance.title,
              },
            });
          })
          .then((createdInstanceData) => {
            instance.id = createdInstanceData.instanceId;

            // create holding without temporary location
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: createdInstanceData.instanceId,
              permanentLocationId: permanentLocation.id,
              sourceId,
            })
              .then((holding) => {
                instance.holdingsIDs.push(holding.id);
              })
              .then(() => {
                // create holding with temporary location
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: createdInstanceData.instanceId,
                  permanentLocationId: permanentLocation.id,
                  sourceId,
                  temporaryLocationId: temporaryLocation.id,
                }).then((holding) => {
                  instance.holdingsIDs.push(holding.id);
                });
              })
              .then(() => {
                FileManager.createFile(
                  `cypress/fixtures/${fileName}`,
                  instance.holdingsIDs.join('\n'),
                );
              });
          });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C423587 Verify 852 field for FOLIO Holdings in exported MARC record generated on the fly (firebird)',
      { tags: ['smoke', 'firebird', 'C423587'] },
      () => {
        ExportFile.uploadFile(fileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            jobId,
            user.username,
            'Default holdings',
          );
          DataExportLogs.clickButtonWithText(exportedFileName);

          const recordsToVerify = [
            {
              uuid: instance.holdingsIDs[0],
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => expect(record.get('001')).to.not.be.empty,
                (record) => expect(record.get('004')).to.not.be.empty,
                (record) => expect(record.get('852')[0].ind1).to.eq(' '),
                (record) => expect(record.get('852')[0].ind2).to.eq(' '),
                (record) => expect(record.get('852')[0].subf[0][0]).to.eq('b'),
                (record) => expect(record.get('852')[0].subf[0][1]).to.eq(permanentLocation.name),
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instance.holdingsIDs[0]),
              ],
            },
            {
              uuid: instance.holdingsIDs[1],
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => expect(record.get('001')).to.not.be.empty,
                (record) => expect(record.get('004')).to.not.be.empty,
                (record) => expect(record.get('852')[0].ind1).to.eq(' '),
                (record) => expect(record.get('852')[0].ind2).to.eq(' '),
                (record) => expect(record.get('852')[0].subf[0][0]).to.eq('c'),
                (record) => expect(record.get('852')[0].subf[0][1]).to.eq(temporaryLocation.name),
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instance.holdingsIDs[1]),
              ],
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount, false);
        });
      },
    );
  });
});
