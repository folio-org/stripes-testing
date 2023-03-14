import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-data-import', () => {
  let user;
  const instanceTitle = 'Mistapim in Cambodia [microform]. Photos. by the author.';
  const error = '{"error":"A new Instance was not created because the incoming record already contained a 999ff$s or 999ff$i field"}';
  const nameMarcFileForCreate = `C359012 autotestFile.${getRandomPostfix()}.mrc`;

  before('create test data', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C359012 Checking the import of the MARC Bib file, that has records with 999 ff and without the 999 ff field (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('marcFileForC359012.mrc', nameMarcFileForCreate);
      JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForCreate);
      Logs.checkStatusOfJobProfile('Completed with errors');
      Logs.openFileDetails(nameMarcFileForCreate);
      // check that "SRS MARC" and "Instance" were created for record, that not contains 999 ff field
      FileDetails.checkSrsRecordQuantityInSummaryTable('1');
      FileDetails.checkInstanceQuantityInSummaryTable('1');
      FileDetails.checkItemsStatusesInResultList(1, [FileDetails.status.created, FileDetails.status.created]);
      // check that "SRS MARC" and "Instance" were not created for record, that contain 999 ff field
      FileDetails.checkSrsRecordQuantityInSummaryTable('1', 2);
      FileDetails.checkErrorQuantityInSummaryTable('1', 3);
      FileDetails.checkStatusInColumn(FileDetails.status.discarded, FileDetails.columnName.srsMarc);
      FileDetails.checkStatusInColumn(FileDetails.status.error, FileDetails.columnName.error);
      FileDetails.verifyErrorMessage(error);
    });
});
