import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const instanceHrids = [];
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC6690.mrc';
    const fileName = `C6690 autotestFile.${getRandomPostfix()}.mrc`;
    const instances = [
      {
        title: '2000 Philippine provincial poverty statistics.',
        resourceTitle: '2000 Philippine provincial poverty statistics.',
        indexTitle: '2000 Philippine provincial poverty statistics.',
      },
      {
        title: "Halsbury's laws of England.",
        resourceTitle: "Halsbury's laws of England.",
        indexTitle: "Halsbury's laws of England.",
      },
      {
        title:
          'The war of the rebellion [electronic resource]: a compilation of the official records of the Union and Confederate armies',
        resourceTitle:
          'The war of the rebellion [electronic resource]: a compilation of the official records of the Union and Confederate armies. Pub. under the direction of the secretary of war ...',
        indexTitle:
          'War of the rebellion a compilation of the official records of the Union and Confederate armies.',
      },
    ];

    before('create test data', () => {
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
      'C6690 Check the default mapping of the Index title from the MARC record to the Inventory Instance Index title field (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
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

          InstanceRecordView.verifyResourceTitle(instance.resourceTitle);
          InstanceRecordView.verifyIndexTitle(instance.indexTitle);
        });
      },
    );
  });
});
