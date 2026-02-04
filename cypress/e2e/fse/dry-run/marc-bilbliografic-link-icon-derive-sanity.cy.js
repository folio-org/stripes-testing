import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const { user, memberTenant } = parseSanityParameters();
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
      const propertyName = 'instance';
      const tagArray = [
        '100',
        '110',
        '111',
        '130',
        '240',
        '600',
        '610',
        '611',
        '630',
        '650',
        '651',
        '655',
        '700',
        '710',
        '711',
        '730',
        '800',
        '810',
        '811',
        '830',
      ];
      let createdInstanceID = null;
      let fileName;

      before('Setup', () => {
        fileName = `C360542testMarcFile.${getRandomPostfix()}.mrc`;

        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password)
          .then(() => {
            cy.getUserDetailsByUsername(user.username).then((details) => {
              user.id = details.id;
              user.personal = details.personal;
              user.barcode = details.barcode;
            });
          })
          .then(() => {
            DataImport.uploadFileViaApi('marcFileForC360542.mrc', fileName, jobProfileToRun).then(
              (response) => {
                response.forEach((record) => {
                  createdInstanceID = record[propertyName].id;
                });
              },
            );
          });

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        cy.allure().logCommandSteps();

        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, 'Completed');
        Logs.openFileDetails(fileName);
        Logs.goToTitleLink(RECORD_STATUSES.CREATED);
      });

      after('Cleanup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password);
        if (createdInstanceID) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceID);
        }
      });

      it(
        'C360542 Verify that "Link to MARC Authority record" icon displays next to MARC fields when deriving Bib record (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C360542'] },
        () => {
          InventoryInstance.deriveNewMarcBib();
          tagArray.forEach((tag) => {
            QuickMarcEditor.checkLinkButtonExist(tag);
          });
        },
      );
    });
  });
});
