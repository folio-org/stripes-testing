import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const instanceHrids = [];
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC11120.mrc';
    const fileName = `C11120 autotestFile.${getRandomPostfix()}.mrc`;
    const instances = [
      {
        title:
          'Gender and colonialism : a psychological analysis of oppression and liberation / Geraldine Moane',
        edition: 'Rev. ed.',
      },
      {
        title:
          'Phytoplankton pigments in oceanography : guidelines to modern methods / edited by S.W. Jeffrey, R.F.C. Mantoura, and S.W. Wright.',
        edition: '2nd ed.',
      },
      {
        title: 'Principles of ecology in plant production / Thomas R. Sinclair and Albert Weiss.',
        edition: '2nd ed.',
      },
    ];

    before('create user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceHrids.forEach((hrid) => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C11120 Check the default mapping of edition from the MARC record to the Inventory Instance record (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        cy.visit(TopMenu.inventoryPath);
        instances.forEach((instance) => {
          InventorySearchAndFilter.searchInstanceByTitle(instance.title);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
            const instanceHrid = initialInstanceHrId;

            instanceHrids.push(instanceHrid);
          });
          InstanceRecordView.verifyEdition(instance.edition);
        });
      },
    );
  });
});
