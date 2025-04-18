import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathToUpload = 'marcBibFileForC6693.mrc';
    const fileName = `C6693 autotestFile${getRandomPostfix()}.mrc`;

    before('Create test user and login', () => {
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

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C6693 Check the default mapping of Classification from the MARC record to the Inventory Instance Classification fields (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C6693'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          [
            { classificationIdentifierType: 'Dewey', classification: '541.3452' },
            { classificationIdentifierType: 'Dewey', classification: '541.375*' },
            { classificationIdentifierType: 'Dewey', classification: 'This is a second 082 field' },
            { classificationIdentifierType: 'GDC', classification: 'HolC' },
            { classificationIdentifierType: 'GDC', classification: 'This is a second 086 field' },
            { classificationIdentifierType: 'LC', classification: 'LST .N5 fr G ' },
            { classificationIdentifierType: 'LC', classification: 'QD1 .A355 no. 11' },
            { classificationIdentifierType: 'LC', classification: 'This is a second 050 field' },
            { classificationIdentifierType: 'LC', classification: 'This is a second 090 field' },
            { classificationIdentifierType: 'NLM', classification: 'QU 188 N285 1954' },
            { classificationIdentifierType: 'NLM', classification: 'This is a second 060 field' },
            { classificationIdentifierType: 'UDC', classification: 'NR.Coucht S322 target. w' },
            { classificationIdentifierType: 'UDC', classification: 'This is a second 080 field' },
          ].forEach((data) => {
            InstanceRecordView.verifyClassification(
              data.classificationIdentifierType,
              data.classification,
            );
          });
        });
      },
    );
  });
});
